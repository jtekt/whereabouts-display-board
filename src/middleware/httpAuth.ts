import { Request, RequestHandler } from "express";
import middleware, {
  type Options,
} from "@jtekt/express-authentication-middleware";

import createHttpError from "http-errors";
import { get_jwt } from "../utils/extractors";

const { IDENTIFICATION_URL } = process.env;

export const options: Options = {
  strategies: {
    identification: {
      url: IDENTIFICATION_URL,
    },
  },
};

const normalizeJwt = (req: Request): void => {
  if (req.headers.authorization) return;

  const token = get_jwt(req);

  if (token) {
    req.headers.authorization = `Bearer ${token}`;
  }
};

export const authMiddleware = (): RequestHandler => {
  if (!IDENTIFICATION_URL) {
    throw createHttpError(
      400,
      // "Identification URL or OIDC JWKS URI not provided",
      "Identification URL not provided",
    );
  }

  return (req, res, next) => {
    normalizeJwt(req);
    return middleware(options)(req, res, next);
  };
};
