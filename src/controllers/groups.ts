import axios from "axios"
import { Socket } from "socket.io"
import Whereabouts from "../models/whereabouts"
import { get_id_of_item } from "../utils/getId"
import {
  UserRecord,
  GroupMembersResponse,
  GetMembersPayload,
} from "../types/whereabouts"

const { GROUP_MANAGER_API_URL } = process.env

/**
 * Leaves all non-system rooms and joins the specified group room.
 * Uses for...of because socket.rooms is a Set in Socket.IO v4.
 */
function manage_rooms(socket: Socket, group_id: string): void {
  for (const room of socket.rooms) {
    if (room !== socket.id && room !== "authenticated") {
      console.log(`[WS] Socket ${socket.id} left room ${room}`)
      socket.leave(room)
    }
  }
  socket.join(group_id)
  console.log(`[WS] Socket ${socket.id} has joined room ${group_id}`)
}

/**
 * Returns a handler for the "get_members_of_group" WebSocket event.
 * Fetches group members, attaches their whereabouts, and emits the result.
 */
export function get_members_of_group(socket: Socket) {
  return (message: GetMembersPayload): void => {
    const group_id = message.group_id
    if (!group_id) {
      console.log("[WS] Missing group ID")
      return
    }

    const url = `${GROUP_MANAGER_API_URL}/v3/groups/${group_id}/members`
    const params = { batch_size: -1 }
    const headers = { Authorization: `Bearer ${socket.jwt}` }

    let users: UserRecord[] = []

    axios
      .get<GroupMembersResponse>(url, { headers, params })
      .then(({ data }) => {
        users = data.items

        if (!users.length) return []

        manage_rooms(socket, group_id)

        const query = { $or: users.map(({ _id }) => ({ user_id: _id })) }
        return Whereabouts.find(query)
      })
      .then((entries) => {
        if (!entries) return

        const entriesMap: Record<string, unknown> = {}
        entries.forEach((entry) => {
          entriesMap[entry.user_id] = entry
        })

        users.forEach((user) => {
          const user_id = get_id_of_item(user as Record<string, unknown>)
          const entry = entriesMap[String(user_id)] as typeof user.whereabouts | undefined
          user.whereabouts = entry ?? {
            user_id: String(user_id),
            availability: "absent",
            message: "unknown",
          }
        })

        socket.emit("members_of_group", users)
      })
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data: unknown } }).response?.data ?? error
        socket.emit("error_message", message)
        console.error(message)
      })
  }
}
