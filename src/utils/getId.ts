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
  item: Record<string, unknown>
): string | number | undefined {
  if (item._id !== undefined) return item._id as string | number

  const props = item.properties as Record<string, unknown> | undefined
  if (props?._id !== undefined) return props._id as string | number

  if (item.identity !== undefined) {
    const identity = item.identity as { low?: number } | number
    if (typeof identity === "object" && identity.low !== undefined) {
      return identity.low
    }
    if (typeof identity === "number") return identity
  }

  return undefined
}
