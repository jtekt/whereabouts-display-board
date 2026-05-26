import { Socket } from "socket.io"
import { WsAuthPayload } from "../types/whereabouts"

type AuthFn = (payload: WsAuthPayload, callback: (err: unknown, result: boolean) => void) => void
type Packet = [string, ...unknown[]]
type NextFn = (err?: unknown) => void

/**
 * Socket.IO per-event middleware that gates all events behind JWT authentication.
 *
 * Flow:
 * - If already authenticated: allow all events through (except "logout")
 * - If not authenticated: only allow the "authentication" event
 * - On "logout": revoke authentication and remove from the "authenticated" room
 */
export function wsAuthMiddleware(socket: Socket, authenticationFn: AuthFn) {
  return function (packet: Packet, next: NextFn): void {
    try {
      const ws_event = packet[0]
      const ws_payload = packet[1] as WsAuthPayload

      if (socket.authenticated) {
        if (ws_event === "logout") {
          socket.authenticated = false
          socket.leave("authenticated")
          socket.emit("unauthorized", "logged out")
          return next()
        }

        return next()
      }

      if (ws_event !== "authentication") {
        socket.emit("unauthorized", "Authentication required")
        return
      }

      authenticationFn(ws_payload, (err, result) => {
        if (err) {
          socket.emit("unauthorized", "Invalid JWT")
          return
        }

        if (result) {
          socket.authenticated = true
          socket.join("authenticated")
          socket.emit("authenticated", result)
          return next()
        }

        socket.emit("unauthorized", "Invalid JWT")
      })
    } catch (err) {
      console.error("[WS middleware] ERROR:", err)
      socket.emit("unauthorized", "Server error")
    }
  }
}
