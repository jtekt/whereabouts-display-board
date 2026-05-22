import axios from "axios";
import { Request, Response } from "express";
import createHttpError from "http-errors";
import { io } from "../main";
import Whereabouts from "../models/whereabouts";
import { get_id_of_item, get_jwt } from "../utils/extractors";
import {
  UserRecord,
  GroupRecord,
  UserGroupsResponse,
} from "../types/whereabouts";

const { EMPLOYEE_MANAGER_API_URL, GROUP_MANAGER_API_URL } = process.env;

/**
 * Emits a "members_of_group" event to all Socket.IO rooms the updated user belongs to.
 * This is fire-and-forget at the call site — errors are logged but not propagated.
 */
async function update_rooms_of_user(
  user: UserRecord,
  jwt: string,
): Promise<void> {
  const user_id = get_id_of_item(user as Record<string, unknown>);
  if (user_id === undefined && user_id !== 0) {
    throw new Error("User does not have an ID");
  }

  const url = `${GROUP_MANAGER_API_URL}/v3/members/${user_id}/groups`;
  const { data } = await axios.get<UserGroupsResponse>(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  data.items.forEach((group: GroupRecord) => {
    io.in(String(group._id)).emit("members_of_group", [user]);
  });
}

/**
 * PATCH/PUT /users/:user_id  — Update a user's whereabouts (message and/or availability).
 * GET /update               — Legacy alias using query params.
 *
 * Flow:
 * 1. Extract JWT from request
 * 2. Resolve the target user ID (defaults to JWT owner)
 * 3. Authorization check (must be self or admin)
 * 4. Fetch the user record from the employee manager if updating another user
 * 5. Upsert the whereabouts in MongoDB
 * 6. Attach whereabouts to user and respond
 * 7. Emit WebSocket update to affected group rooms
 */
export async function update_whereabouts(
  req: Request,
  res: Response,
): Promise<void> {
  const jwt = get_jwt(req);
  if (!jwt) throw createHttpError(403, "JWT not found");

  // Identify JWT owner
  const jwt_owner = (req as any).user;
  const jwt_owner_id = get_id_of_item(jwt_owner as Record<string, unknown>);

  // Resolve target user id
  let user_id: string | number | undefined =
    (req.params.user_id as string | undefined) ??
    (req.query.user_id as string | undefined) ??
    (req.body as Record<string, string>).user_id ??
    jwt_owner_id;

  if (user_id === "self") user_id = jwt_owner_id;
  if (!user_id) throw createHttpError(400, "User ID not specified");

  const user_is_admin = jwt_owner.isAdmin;
  if (String(jwt_owner_id) !== String(user_id) && !user_is_admin) {
    throw createHttpError(403, "Unauthorized to modify another user");
  }

  // Fetch full user ONLY when needed
  let user: UserRecord;

  if (String(user_id) === String(jwt_owner_id)) {
    // It's "self", so no need to fetch from API
    user = jwt_owner as UserRecord;
  } else {
    // Admin updating another user, fetch user record
    try {
      const { data } = await axios.get<UserRecord>(
        `${EMPLOYEE_MANAGER_API_URL}/v3/users/${user_id}`,
        { params: { jwt } },
      );
      user = data;
    } catch (error) {
      const err = error as {
        response?: { status: number; data: string };
        message: string;
      };
      throw createHttpError(
        err.response?.status ?? 500,
        err.response?.data ?? err.message,
      );
    }
  }

  // Extract update fields — support legacy query/body param names
  const message =
    (req.body as Record<string, string>).message ||
    (req.body as Record<string, string>).current_location ||
    (req.query.current_location as string | undefined) ||
    (req.query.message as string | undefined);

  const availability =
    (req.body as Record<string, string>).availability ||
    (req.body as Record<string, string>).presence ||
    (req.query.availability as string | undefined) ||
    (req.query.presence as string | undefined);

  if (!message && !availability) {
    throw createHttpError(400, "Message or availability not provided");
  }

  // Upsert whereabouts
  const update: Record<string, unknown> = { $set: { last_update: new Date() } };
  if (message) (update as Record<string, unknown>).message = message;
  if (availability)
    (update as Record<string, unknown>).availability = availability;

  const new_whereabouts = await Whereabouts.findOneAndUpdate(
    { user_id: String(user_id) },
    update,
    {
      returnDocument: "after",
      upsert: true,
    },
  );
  user.whereabouts = new_whereabouts ?? undefined;

  // Best-effort: update WebSocket rooms. Errors are logged, not propagated.
  update_rooms_of_user(user, jwt).catch((err) => {
    console.error("[WS] Failed to update rooms:", err);
  });

  res.send(user);
}
