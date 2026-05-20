import axios from "axios"
import { Socket } from "socket.io"
import { WsAuthPayload } from "../types/whereabouts"

const { IDENTIFICATION_URL, AUTHENTICATION_API_URL } = process.env

// Prefer the dedicated identification URL; fall back to the legacy auth API endpoint
const authUrl = IDENTIFICATION_URL ?? `${AUTHENTICATION_API_URL}/user_from_jwt`

console.log("[WS] Authentication URL:", authUrl)

type AuthCallback = (err: unknown, result: boolean) => void

/**
 * Returns an authentication handler for a given socket.
 * The handler validates the JWT by calling the identification service.
 */
export function createJwtAuthHandler(socket: Socket) {
  return (message: WsAuthPayload, callback: AuthCallback): void => {
    const { jwt } = message

    if (!jwt) {
      console.log("[WS] No JWT provided")
      callback(false, false)
      return
    }

    axios
      .get(authUrl, { params: { jwt } })
      .then(() => {
        socket.jwt = jwt
        console.log("[WS] JWT valid")
        callback(false, true)
      })
      .catch((err: unknown) => {
        console.log("[WS] JWT invalid", err)
        callback(err, false)
      })
  }
}
