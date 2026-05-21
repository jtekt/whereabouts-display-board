import { Socket } from "socket.io"
import { JoinGroupsPayload } from "../types/whereabouts"

/**
 * Leaves all non-system rooms and joins the specified group rooms.
 * Uses for...of because socket.rooms is a Set in Socket.IO v4.
 */
export function manage_rooms(socket: Socket, group_ids: string[]): void {
  for (const room of socket.rooms) {
    if (room !== socket.id && room !== "authenticated") {
      console.log(`[WS] Socket ${socket.id} left room ${room}`)
      socket.leave(room)
    }
  }
  for (const group_id of group_ids) {
    socket.join(group_id)
    console.log(`[WS] Socket ${socket.id} joined room ${group_id}`)
  }
}

/**
 * Returns a handler for the "join_groups" WebSocket event.
 * The client supplies the list of group IDs it already knows (from its own
 * Group Manager API calls) and the server joins the corresponding rooms so
 * that "whereabouts_updated" events are delivered correctly.
 */
export function join_groups(socket: Socket) {
  return (message: JoinGroupsPayload): void => {
    const group_ids = message?.group_ids

    if (!group_ids?.length) {
      console.log("[WS] join_groups: no group IDs provided")
      socket.emit("error_message", "group_ids must be a non-empty array")
      return
    }

    manage_rooms(socket, group_ids)
    socket.emit("joined_groups", group_ids)
    console.log(`[WS] Socket ${socket.id} joined groups: ${group_ids.join(", ")}`)
  }
}
