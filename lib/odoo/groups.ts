import { OdooClient } from "@/lib/odoo-client"

export function normalizeMany2ManyIds(value: any): number[] {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (Array.isArray(item)) {
          const id = Number(item[0])
          return Number.isNaN(id) ? null : id
        }
        const id = Number(item)
        return Number.isNaN(id) ? null : id
      })
      .filter((id): id is number => id !== null)
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? [] : [value]
  }

  const coerced = Number(value)
  return Number.isNaN(coerced) ? [] : [coerced]
}

export async function resolveUserGroupIds(
  client: OdooClient,
  userId: number,
  rawGroups: any,
): Promise<number[]> {
  const directGroupIds = normalizeMany2ManyIds(rawGroups)
  let groupIds = Array.from(new Set(directGroupIds))

  if (groupIds.length === 0) {
    console.log("[v0] No groups returned on user read, fetching via res.groups search...")
    const groupsFromRelation = await client.executeKw("res.groups", "search", [[["users", "in", [userId]]]], {})
    console.log("[v0] res.groups search result:", groupsFromRelation)

    if (Array.isArray(groupsFromRelation)) {
      groupIds = groupsFromRelation
        .map((groupId: any) => Number(groupId))
        .filter((groupId) => !Number.isNaN(groupId))
    }
  }

  console.log("[v0] Using group IDs:", groupIds)
  return groupIds
}
