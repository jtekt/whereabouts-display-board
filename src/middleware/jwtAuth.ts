import { Request } from "express";
import type { Response, NextFunction } from "express";

import { Socket } from "socket.io";

import middleware from "@jtekt/express-authentication-middleware";

import createHttpError from "http-errors";

import { WsAuthPayload } from "../types/whereabouts";
import { options } from "./httpAuth";

const { IDENTIFICATION_URL } = process.env;

if (!IDENTIFICATION_URL) {
  throw createHttpError(400, "Identification URL not provided");
}
console.log("[WS] Authentication URL:", IDENTIFICATION_URL);
const authMiddleware = middleware(options);

/**
 * Extracts a JWT from either the handshake headers or the authentication payload.
 * Header takes precedence over payload.
 */
function extractToken(
  socket: Socket,
  payload: WsAuthPayload,
): string | undefined {
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const authToken = socket.handshake.auth?.token ?? socket.handshake.auth?.jwt;

  if (typeof authToken === "string") {
    return authToken;
  }

  // authentication event payload
  return payload.jwt ?? payload.token;
}

const fakeResponseMethods = {
  status() {
    return this;
  },

  send(payload: unknown) {
    throw payload;
  },
};

const createFakeResponse = () => ({
  locals: {},
  ...fakeResponseMethods,
});

const runMiddleware = (
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  req: Partial<Request>,
): Promise<void> => {
  const fakeRes = createFakeResponse();

  return new Promise((resolve, reject) => {
    middleware(
      req as Request,
      fakeRes as unknown as Response,
      (error?: unknown) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      },
    );
  });
};

export async function authenticateRequestLike(token: string): Promise<void> {
  const req: Partial<Request> = {
    headers: { authorization: `Bearer ${token}` },
  };
  return runMiddleware(authMiddleware, req);
}

type AuthCallback = (err: unknown, result: boolean) => void;

export function createJwtAuthHandler(socket: Socket) {
  return async (
    message: WsAuthPayload,
    callback: AuthCallback,
  ): Promise<void> => {
    try {
      const token = extractToken(socket, message);

      if (!token) {
        callback(false, false);
        return;
      }

      await authenticateRequestLike(token);

      socket.jwt = token;

      callback(false, true);
    } catch (err) {
      callback(err, false);
    }
  };
}

/**
 * Attempts to authenticate a socket using only its connection headers.
 * Returns the token on success, undefined if no header token is present.
 * Throws if the token is present but invalid.
 */
export async function authenticateFromHeaders(
  socket: Socket,
): Promise<string | undefined> {
  const token = extractToken(socket, {});
  if (!token) return undefined;

  await authenticateRequestLike(token);
  return token;
}
