import { Request } from "express";

/**
 * Extracts an ID from an item that may come from different data sources.
 *
 * Supports:
 * - MongoDB documents: { _id: "..." }
 * - Property-wrapped documents: { properties: { _id: "..." } }
 * - Neo4j integer nodes: { identity: { low: 123 } } or { identity: 123 }
 *
 * NOTE: The Neo4j identity patterns are legacy. If Neo4j is no longer used,
 * simplify this to just return item._id.
 */
export function get_id_of_item(
  item: Record<string, unknown>,
): string | number | undefined {
  if (item._id !== undefined) return item._id as string | number;

  const props = item.properties as Record<string, unknown> | undefined;
  if (props?._id !== undefined) return props._id as string | number;

  if (item.identity !== undefined) {
    const identity = item.identity as { low?: number } | number;
    if (typeof identity === "object" && identity.low !== undefined) {
      return identity.low;
    }
    if (typeof identity === "number") return identity;
  }

  // OIDC identifier (preferred_username or configured field)
  const oidcField = process.env.OIDC_IDENTIFIER || "preferred_username";
  const oidcValue = item[oidcField];
  if (typeof oidcValue === "string" || typeof oidcValue === "number") {
    return oidcValue;
  }

  // Nothing matched
  return undefined;
}

/**
 * Extracts the JWT from the request.
 * Checks body, query params, and the Authorization header (Bearer scheme).
 */
export function get_jwt(req: Request): string | undefined {
  const auth = req.headers.authorization;

  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7);
  }

  const token =
    (req.body as Record<string, string> | undefined)?.jwt ??
    (req.body as Record<string, string> | undefined)?.token ??
    (req.query.jwt as string | undefined) ??
    (req.query.token as string | undefined);

  if (!token) {
    console.log("get_jwt: JWT not found in request");
  }

  return token;
}
