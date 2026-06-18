import { Request } from "express";
import type { Response, NextFunction } from "express";

import { Socket } from "socket.io";

import middleware from "@jtekt/express-authentication-middleware";

import createHttpError from "http-errors";

import { get_jwt } from "../utils/extractors";
import { WsAuthPayload } from "../types/whereabouts";
import { options } from "./httpAuth";

const { IDENTIFICATION_URL } = process.env;

if (!IDENTIFICATION_URL) {
  throw createHttpError(400, "Identification URL not provided");
}
console.log("[WS] Authentication URL:", IDENTIFICATION_URL);
const authMiddleware = middleware(options);

const normalizeJwt = (req: Partial<Request>): void => {
  req.headers ??= {};

  if (req.headers.authorization) return;

  const token = get_jwt(req as Request);

  if (token) {
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
): Promise<void> {
  normalizeJwt(req);
  return runMiddleware(authMiddleware, req);
}

type AuthCallback = (err: unknown, result: boolean) => void;

export function createJwtAuthHandler(socket: Socket) {
  return async (
    message: WsAuthPayload,
    callback: AuthCallback,
  ): Promise<void> => {
    try {
      const { jwt } = message;

      if (!jwt) {
        callback(false, false);
        return;
      }

      const fakeReq: Partial<Request> = {
        headers: {
          authorization: `Bearer ${jwt}`,
        },
      };

      await authenticateRequestLike(fakeReq);

      socket.jwt = jwt;

      callback(false, true);
    } catch (err) {
      callback(err, false);
    }
  };
}
