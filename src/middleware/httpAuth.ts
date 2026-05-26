import { Request, RequestHandler } from "express";
import legacyAuth from "@moreillon/express_identification_middleware";
import createHttpError from "http-errors";
import { get_jwt } from "../utils/extractors";

const { IDENTIFICATION_URL } = process.env;

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

  const legacyMiddleware = legacyAuth({ url: IDENTIFICATION_URL });

  return (req, res, next) => {
    normalizeJwt(req);
    return legacyMiddleware(req, res, next);
  };
};
