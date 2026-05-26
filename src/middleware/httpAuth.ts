import { NextFunction, Request, Response } from "express";
import legacyAuth from "@moreillon/express_identification_middleware";
import oidcAuth from "@moreillon/express-oidc";
import { get_jwt } from "../utils/extractors";

const { OIDC_JWKS_URI, IDENTIFICATION_URL } = process.env;

const normalizeJwt = (req: Request) => {
  // Respect already‑existing headers
  if (req.headers.authorization) return;

  const token = get_jwt(req);
  if (token) {
    req.headers.authorization = `Bearer ${token}`;
  }
};

export const authMiddleware = () => {
  // Nothing configured → no auth
  if (!IDENTIFICATION_URL && !OIDC_JWKS_URI) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  const legacyMiddleware = IDENTIFICATION_URL
    ? legacyAuth({ url: IDENTIFICATION_URL })
    : null;

  const oidcMiddleware = OIDC_JWKS_URI
    ? oidcAuth({ jwksUri: OIDC_JWKS_URI })
    : null;

  // Both enabled → dynamic selection
  if (legacyMiddleware && oidcMiddleware) {
    console.log("[Auth] Both Legacy and OIDC auth are enabled");

    return (req: Request, res: Response, next: NextFunction) => {
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
  }

  // Only legacy
  if (legacyMiddleware) {
    console.log(`[Auth] Legacy auth enabled: ${IDENTIFICATION_URL}`);
    return (req: Request, res: Response, next: NextFunction) => {
      normalizeJwt(req);
      return legacyMiddleware(req, res, next);
    };
  }

  // Only OIDC
  if (oidcMiddleware) {
    console.log(`[Auth] OIDC auth enabled: ${OIDC_JWKS_URI}`);
    return (req: Request, res: Response, next: NextFunction) => {
      normalizeJwt(req);
      return oidcMiddleware(req, res, next);
    };
  }

  // Should never reach here
  return (_req: Request, _res: Response, next: NextFunction) => next();
};
