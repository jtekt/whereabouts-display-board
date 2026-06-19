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

const normalizeJwt = (
  req: Partial<Request>,
  payload: WsAuthPayload,
): void => {
  req.headers ??= {};

  const token = payload.jwt ?? payload.token;
  if (token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${token}`;
  }
};

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

export async function authenticateRequestLike(
  req: Partial<Request>,
  payload: WsAuthPayload = {},
): Promise<void> {
  normalizeJwt(req, payload);
  return runMiddleware(authMiddleware, req);
}

type AuthCallback = (err: unknown, result: boolean) => void;

export function createJwtAuthHandler(socket: Socket) {
  return async (
    message: WsAuthPayload,
    callback: AuthCallback,
  ): Promise<void> => {
    try {
      const token = message.jwt ?? message.token;

      if (!token) {
        callback(false, false);
        return;
      }

      const fakeReq: Partial<Request> = { headers: {} };

      await authenticateRequestLike(fakeReq, message);

      socket.jwt = token;

      callback(false, true);
    } catch (err) {
      callback(err, false);
    }
  };
}
