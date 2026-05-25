import { Request, RequestHandler } from "express";
import legacyAuth from "@moreillon/express_identification_middleware";
// import oidcAuth from "@moreillon/express-oidc";
import createHttpError from "http-errors";
import { get_jwt } from "../utils/extractors";

const {
  // OIDC_JWKS_URI,
  IDENTIFICATION_URL,
} = process.env;

const normalizeJwt = (req: Request): void => {
  // Respect already existing authorization headers
  if (req.headers.authorization) return;

  const token = get_jwt(req);

  if (token) {
    req.headers.authorization = `Bearer ${token}`;
  }
};

export const authMiddleware = (): RequestHandler => {
  // if (!IDENTIFICATION_URL && !OIDC_JWKS_URI) {
  if (!IDENTIFICATION_URL) {
    throw createHttpError(
      400,
      // "Identification URL or OIDC JWKS URI not provided",
      "Identification URL not provided",
    );
  }

  // Future OIDC implementation
  /*
  if (IDENTIFICATION_URL && OIDC_JWKS_URI) {
    const legacyMiddleware = legacyAuth({ url: IDENTIFICATION_URL });
    const oidcMiddleware = oidcAuth({ jwksUri: OIDC_JWKS_URI });

    const selectorMiddleware: RequestHandler = (req, res, next) => {
      normalizeJwt(req);

      const token = req.headers.authorization?.split(" ")[1];

      let hasKid = false;

      if (token) {
        try {
          const header = JSON.parse(
            Buffer.from(token.split(".")[0], "base64url").toString("utf8"),
          );

          hasKid = !!header.kid;
        } catch {
          // malformed token -> let selected middleware handle error
        }
      }

      // Route to the correct middleware based on the JWT header's kid field.
      // Legacy JWTs never carry a kid; OIDC JWTs always do (required for JWKS
      // key lookup). This lets us avoid running both middlewares on every request.
      if (hasKid) {
        return oidcMiddleware(req, res, next);
      }

      return legacyMiddleware(req, res, next);
    };

    // return exactly one middleware
    return selectorMiddleware;
  }
  */

  const legacyMiddleware = legacyAuth({ url: IDENTIFICATION_URL });

  return (req, res, next) => {
    normalizeJwt(req);
    return legacyMiddleware(req, res, next);
  };

  // Future OIDC-only implementation
  /*
  const oidcMiddleware = oidcAuth({ jwksUri: OIDC_JWKS_URI! });

  return (req, res, next) => {
    normalizeJwt(req);
    return oidcMiddleware(req, res, next);
  };
  */
};
