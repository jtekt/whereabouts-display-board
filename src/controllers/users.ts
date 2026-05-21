import axios from "axios"
import { Request, Response } from "express"
import createHttpError from "http-errors"
import { io } from "../main"
import Whereabouts from "../models/whereabouts"
import { get_id_of_item } from "../utils/getId"
import {
  UserRecord,
  GroupRecord,
  UserGroupsResponse,
  WhereaboutsUpdate,
} from "../types/whereabouts"

const { IDENTIFICATION_URL, EMPLOYEE_MANAGER_API_URL, GROUP_MANAGER_API_URL } =
  process.env

/**
 * Emits a "whereabouts_updated" event to all Socket.IO rooms the updated user
 * belongs to.  This is fire-and-forget at the call site — errors are logged
 * but not propagated.
 */
async function update_rooms_of_user(
  user_id: string,
  whereabouts: WhereaboutsUpdate,
  jwt: string,
): Promise<void> {
  const url = `${GROUP_MANAGER_API_URL}/v3/members/${user_id}/groups`
  const { data } = await axios.get<UserGroupsResponse>(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  })

  data.items.forEach((group: GroupRecord) => {
    io.in(String(group._id)).emit("whereabouts_updated", whereabouts)
  })
}

/**
 * Extracts the JWT from the request.
 * Checks body, query params, and the Authorization header (Bearer scheme).
 */
function get_jwt(req: Request): string | undefined {
  const fromBody =
    (req.body as Record<string, string>).jwt ||
    (req.body as Record<string, string>).token

  const fromQuery =
    (req.query.jwt as string | undefined) ||
    (req.query.token as string | undefined)

  if (fromBody || fromQuery) return fromBody ?? fromQuery

  if (!req.headers.authorization) {
    console.log(
      "JWT not found in query or body and authorization header not set",
    )
    return undefined
  }

  return req.headers.authorization.split(" ")[1]
}

/**
 * GET /users/whereabouts?ids=id1,id2,id3
 *
 * Returns a map of user_id → whereabouts for the requested IDs.
 * Absent users are omitted from the response.
 */
export async function get_whereabouts(
  req: Request,
  res: Response,
): Promise<void> {
  const raw = (req.query.ids as string | undefined) ?? ""
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (!ids.length) {
    throw createHttpError(400, "Query parameter 'ids' is required")
  }

  const entries = await Whereabouts.find({ user_id: { $in: ids } })

  const result: Record<string, WhereaboutsUpdate> = {}
  for (const entry of entries) {
    result[entry.user_id] = {
      user_id: entry.user_id,
      availability: entry.availability,
      message: entry.message,
      last_update: (entry.last_update ?? new Date()).toISOString(),
    }
  }

  res.send(result)
}

/**
 * PATCH/PUT /users/:user_id  — Update a user's whereabouts (message and/or availability).
 * GET /update               — Legacy alias using query params.
 *
 * Flow:
 * 1. Extract JWT from request
 * 2. Identify the JWT owner via the identification service
 * 3. Resolve the target user ID (defaults to JWT owner)
 * 4. Authorization check (must be self or admin)
 * 5. Fetch the user record from the employee manager
 * 6. Upsert the whereabouts in MongoDB
 * 7. Attach whereabouts to user and respond
 * 8. Emit "whereabouts_updated" to affected group rooms (best-effort)
 */
export async function update_whereabouts(
  req: Request,
  res: Response,
): Promise<void> {
  const jwt = get_jwt(req)
  if (!jwt) throw createHttpError(403, "JWT not found")

  // Identify JWT owner
  let jwt_owner: UserRecord
  try {
    const { data } = await axios.get<UserRecord>(IDENTIFICATION_URL, {
      params: { jwt },
    })
    jwt_owner = data
  } catch (error) {
    const err = error as {
      response?: { status: number; data: string }
      message: string
    }
    throw createHttpError(
      err.response?.status ?? 500,
      err.response?.data ?? err.message,
    )
  }

  const jwt_owner_id = get_id_of_item(jwt_owner as Record<string, unknown>)

  // Resolve target user ID
  let user_id: string | number | undefined =
    (req.params.user_id as string | undefined) ??
    (req.query.user_id as string | undefined) ??
    (req.body as Record<string, string>).user_id ??
    jwt_owner_id

  if (user_id === "self") user_id = jwt_owner_id
  if (!user_id) throw createHttpError(400, "User ID not specified")

  // Authorization check
  const user_is_admin = jwt_owner.isAdmin
  if (String(jwt_owner_id) !== String(user_id) && !user_is_admin) {
    throw createHttpError(403, "Unauthorized to modify another user")
  }

  // Fetch full user record
  let user: UserRecord
  try {
    const { data } = await axios.get<UserRecord>(
      `${EMPLOYEE_MANAGER_API_URL}/v3/users/${user_id}`,
      { params: { jwt } },
    )
    user = data
  } catch (error) {
    const err = error as {
      response?: { status: number; data: string }
      message: string
    }
    throw createHttpError(
      err.response?.status ?? 500,
      err.response?.data ?? err.message,
    )
  }

  // Extract update fields — support legacy query/body param names
  const message =
    (req.body as Record<string, string>).message ||
    (req.body as Record<string, string>).current_location ||
    (req.query.current_location as string | undefined) ||
    (req.query.message as string | undefined)

  const availability =
    (req.body as Record<string, string>).availability ||
    (req.body as Record<string, string>).presence ||
    (req.query.availability as string | undefined) ||
    (req.query.presence as string | undefined)

  if (!message && !availability) {
    throw createHttpError(400, "Message or availability not provided")
  }

  // Upsert whereabouts
  const update: Record<string, unknown> = { $set: { last_update: new Date() } }
  if (message) (update as Record<string, unknown>).message = message
  if (availability)
    (update as Record<string, unknown>).availability = availability

  const new_whereabouts = await Whereabouts.findOneAndUpdate(
    { user_id: String(user_id) },
    update,
    {
      returnDocument: "after",
      upsert: true,
    },
  )
  user.whereabouts = new_whereabouts ?? undefined

  // Best-effort: broadcast incremental update to group rooms.
  const payload: WhereaboutsUpdate = {
    user_id: String(user_id),
    availability: new_whereabouts?.availability,
    message: new_whereabouts?.message,
    last_update: (new_whereabouts?.last_update ?? new Date()).toISOString(),
  }
  update_rooms_of_user(String(user_id), payload, jwt).catch((err) => {
    console.error("[WS] Failed to emit whereabouts_updated:", err)
  })

  res.send(user)
}
