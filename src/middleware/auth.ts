import { RequestHandler } from "express";
import legacyAuth from "@moreillon/express_identification_middleware";
import oidcAuth from "@moreillon/express-oidc";
import createHttpError from "http-errors";

const { OIDC_JWKS_URI, IDENTIFICATION_URL } = process.env;

export const getMiddlewareChain = (): RequestHandler => {
  if (!IDENTIFICATION_URL && !OIDC_JWKS_URI) {
    throw createHttpError(
      400,
      "Identification URL or OIDC JWKS URI not provided",
    );
  }

  if (IDENTIFICATION_URL && OIDC_JWKS_URI) {
    const legacyMiddleware = legacyAuth({ url: IDENTIFICATION_URL });
    const oidcMiddleware = oidcAuth({ jwksUri: OIDC_JWKS_URI });

    const selectorMiddleware: RequestHandler = (req, res, next) => {
      // Route to the correct middleware based on the JWT header's kid field.
      // Legacy JWTs never carry a kid; OIDC JWTs always do (required for JWKS
      // key lookup). This lets us avoid running both middlewares on every request.
      const token = req.headers.authorization?.split(" ")[1];
      let hasKid = false;

      if (token) {
        try {
          const header = JSON.parse(
            Buffer.from(token.split(".")[0], "base64url").toString("utf8"),
          );
          hasKid = !!header.kid;
        } catch {
          /* malformed token → let selected middleware handle error */
        }
      }

      if (hasKid) oidcMiddleware(req, res, next);
      else legacyMiddleware(req, res, next);
    };

    // return exactly one middleware
    return selectorMiddleware;
  }

  if (IDENTIFICATION_URL) {
    return legacyAuth({ url: IDENTIFICATION_URL });
  }

  return oidcAuth({ jwksUri: OIDC_JWKS_URI! });
};
