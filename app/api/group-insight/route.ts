import { type NextRequest, NextResponse } from "next/server"
import { OdooClient } from "@/lib/odoo-client"
import { normalizeMany2ManyIds, resolveUserGroupIds } from "@/lib/odoo/groups"

interface GroupAccessSummary {
  model: string
  model_name: string
  read: boolean
  write: boolean
  create: boolean
  unlink: boolean
}

interface GroupInsight {
  id: number
  name: string
  technical_name: string | null
  category: { id: number; name: string } | null
  implied_groups: Array<{ id: number; name: string }>
  implied_count: number
  users_count: number
  access_rights: GroupAccessSummary[]
  notes?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, db, username, password, targetUser } = body

    console.log("[v0][group-insight] Request received for user:", targetUser)

    if (!url || !db || !username || !password || !targetUser) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const client = new OdooClient({ url, db, username, password })

    console.log("[v0][group-insight] Authenticating...")
    await client.authenticate()
    console.log("[v0][group-insight] Authenticated successfully with uid:", client.uid)

    console.log("[v0][group-insight] Searching for user with login:", targetUser)
    const userIds = await client.executeKw("res.users", "search", [[["login", "=", targetUser]]], { limit: 1 })
    console.log("[v0][group-insight] User search result:", userIds)

    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ error: `User '${targetUser}' not found` }, { status: 404 })
    }

    const userId = Number(userIds[0])
    console.log("[v0][group-insight] Found user ID:", userId)

    console.log("[v0][group-insight] Reading user data...")
    const users = await client.executeKw("res.users", "read", [[userId]], {
      fields: ["id", "name", "login", "groups_id"],
    })
    console.log("[v0][group-insight] User data:", JSON.stringify(users))

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "Could not read user data" }, { status: 404 })
    }

    const user = users[0]
    console.log("[v0][group-insight] User:", user.name, "Raw groups field:", user.groups_id)

    const groupIds = await resolveUserGroupIds(client, user.id, user.groups_id)
    console.log("[v0][group-insight] Group IDs resolved:", groupIds)

    let groupRecords: any[] = []
    if (groupIds.length > 0) {
      console.log("[v0][group-insight] Reading group details...")
      groupRecords = await client.executeKw("res.groups", "read", [groupIds], {
        fields: ["id", "display_name", "name", "category_id", "implied_ids", "users", "comment"],
      })
      console.log("[v0][group-insight] Read", groupRecords.length, "group records")
    } else {
      console.log("[v0][group-insight] User has no explicit groups")
    }

    const impliedIds = new Set<number>()
    for (const group of groupRecords) {
      for (const impliedId of normalizeMany2ManyIds(group.implied_ids)) {
        impliedIds.add(impliedId)
      }
    }

    const additionalImpliedIds = Array.from(impliedIds).filter((id) => !groupIds.includes(id))
    let impliedGroupRecords: any[] = []
    if (additionalImpliedIds.length > 0) {
      console.log("[v0][group-insight] Reading implied group names for IDs:", additionalImpliedIds)
      impliedGroupRecords = await client.executeKw("res.groups", "read", [additionalImpliedIds], {
        fields: ["id", "display_name", "name"],
      })
    }

    const allGroupInfo = new Map<number, { id: number; name: string; technical: string | null }>()
    for (const group of [...groupRecords, ...impliedGroupRecords]) {
      const groupId = Number(group.id)
      const displayName = typeof group.display_name === "string" ? group.display_name : group.name
      const technicalName = typeof group.name === "string" ? group.name : null
      allGroupInfo.set(groupId, { id: groupId, name: displayName, technical: technicalName })
    }

    let accessRecords: any[] = []
    if (groupIds.length > 0) {
      console.log("[v0][group-insight] Fetching access records for groups:", groupIds)
      const accessIds = await client.executeKw("ir.model.access", "search", [[["group_id", "in", groupIds]]], {})
      console.log("[v0][group-insight] Found", accessIds.length, "access record IDs")

      if (accessIds.length > 0) {
        accessRecords = await client.executeKw("ir.model.access", "read", [accessIds], {
          fields: ["group_id", "model_id", "perm_read", "perm_write", "perm_create", "perm_unlink"],
        })
        console.log("[v0][group-insight] Read", accessRecords.length, "access records")
      }
    }

    const modelIdSet = new Set<number>()
    for (const record of accessRecords) {
      const modelIdRaw = Array.isArray(record.model_id) ? record.model_id[0] : record.model_id
      const modelId = Number(modelIdRaw)
      if (!Number.isNaN(modelId)) {
        modelIdSet.add(modelId)
      }
    }

    const modelInfo = new Map<number, { model: string; name: string }>()
    if (modelIdSet.size > 0) {
      const modelData = await client.executeKw("ir.model", "read", [Array.from(modelIdSet)], {
        fields: ["id", "model", "name"],
      })
      for (const model of modelData) {
        const id = Number(model.id)
        if (!Number.isNaN(id)) {
          modelInfo.set(id, { model: model.model, name: model.name })
        }
      }
    }

    const groupAccessMap = new Map<number, Map<number, GroupAccessSummary>>()
    for (const record of accessRecords) {
      const groupIdRaw = Array.isArray(record.group_id) ? record.group_id[0] : record.group_id
      const groupId = Number(groupIdRaw)
      if (Number.isNaN(groupId)) continue

      const modelIdRaw = Array.isArray(record.model_id) ? record.model_id[0] : record.model_id
      const modelId = Number(modelIdRaw)
      if (Number.isNaN(modelId)) continue

      if (!groupAccessMap.has(groupId)) {
        groupAccessMap.set(groupId, new Map())
      }

      const modelAccessMap = groupAccessMap.get(groupId)!
      if (!modelAccessMap.has(modelId)) {
        const model = modelInfo.get(modelId)
        modelAccessMap.set(modelId, {
          model: model?.model || "",
          model_name: model?.name || String(record.model_id?.[1] ?? record.model_id ?? modelId),
          read: false,
          write: false,
          create: false,
          unlink: false,
        })
      }

      const perms = modelAccessMap.get(modelId)!
      perms.read = perms.read || Boolean(record.perm_read)
      perms.write = perms.write || Boolean(record.perm_write)
      perms.create = perms.create || Boolean(record.perm_create)
      perms.unlink = perms.unlink || Boolean(record.perm_unlink)
    }

    const groups: GroupInsight[] = groupRecords.map((group) => {
      const groupId = Number(group.id)
      const categoryRaw = Array.isArray(group.category_id) ? group.category_id : null
      const category =
        categoryRaw && categoryRaw.length >= 2
          ? { id: Number(categoryRaw[0]), name: String(categoryRaw[1]) }
          : null

      const implied = normalizeMany2ManyIds(group.implied_ids).map((id) => {
        const info = allGroupInfo.get(id)
        return {
          id,
          name: info?.name || `Group ${id}`,
        }
      })

      const usersCount = Array.isArray(group.users) ? group.users.length : 0

      const access = Array.from(groupAccessMap.get(groupId)?.values() ?? [])
      access.sort((a, b) => a.model_name.localeCompare(b.model_name))

      return {
        id: groupId,
        name: typeof group.display_name === "string" ? group.display_name : group.name,
        technical_name: typeof group.name === "string" ? group.name : null,
        category,
        implied_groups: implied,
        implied_count: implied.length,
        users_count: usersCount,
        access_rights: access,
        notes: typeof group.comment === "string" ? group.comment : null,
      }
    })

    groups.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        login: user.login,
      },
      groups,
      totals: {
        groups: groups.length,
        implied_groups: impliedIds.size,
        models_with_access: new Set(
          groups.flatMap((group) => group.access_rights.map((accessRight) => accessRight.model)),
        ).size,
      },
    })
  } catch (error) {
    console.error("[v0][group-insight] Error:", error)
    if (error instanceof Error) {
      console.error("[v0][group-insight] Error message:", error.message)
      console.error("[v0][group-insight] Error stack:", error.stack)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 },
    )
  }
}
