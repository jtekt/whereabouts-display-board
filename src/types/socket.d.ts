import "socket.io"

declare module "socket.io" {
  interface Socket {
    /** The JWT token set after successful WebSocket authentication */
    jwt?: string
    /** Whether this socket has completed the authentication handshake */
    authenticated?: boolean
  }
}
