import { type NextRequest, NextResponse } from "next/server"
import { OdooClient } from "@/lib/odoo-client"
import { resolveUserGroupIds } from "@/lib/odoo/groups"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, db, username, password, targetUser } = body

    console.log("[v0] Request received for user:", targetUser)

    if (!url || !db || !username || !password || !targetUser) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const client = new OdooClient({ url, db, username, password })

    console.log("[v0] Attempting authentication...")
    await client.authenticate()
    console.log("[v0] Authenticated successfully with uid:", client.uid)

    console.log("[v0] Searching for user with login:", targetUser)
    const userIds = await client.executeKw("res.users", "search", [[["login", "=", targetUser]]], { limit: 1 })
    console.log("[v0] User search result:", userIds)

    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ error: `User '${targetUser}' not found` }, { status: 404 })
    }

    const userId = userIds[0]
    console.log("[v0] Found user ID:", userId)

    console.log("[v0] Reading user data...")
    const users = await client.executeKw("res.users", "read", [[userId]], {
      fields: ["id", "name", "login", "groups_id"],
    })
    console.log("[v0] User data:", JSON.stringify(users))

    if (!users || users.length === 0) {
      return NextResponse.json({ error: `Could not read user data` }, { status: 404 })
    }

    const user = users[0]
    console.log("[v0] User:", user.name, "Raw groups field:", user.groups_id)

    const groupIds = await resolveUserGroupIds(client, user.id, user.groups_id)

    console.log("[v0] Fetching all models...")
    const modelIds = await client.executeKw("ir.model", "search", [[]], {})
    console.log("[v0] Found", modelIds.length, "model IDs")

    console.log("[v0] Reading model data...")
    const models = await client.executeKw("ir.model", "read", [modelIds], { fields: ["id", "model", "name"] })
    console.log("[v0] Read", models.length, "models")

    let accessIds: number[] = []
    if (groupIds.length > 0) {
      console.log("[v0] Fetching access records for groups:", groupIds)
      accessIds = await client.executeKw("ir.model.access", "search", [[["group_id", "in", groupIds]]], {})
      console.log("[v0] Found", accessIds.length, "access record IDs")
    } else {
      console.log("[v0] No group IDs found for user; skipping group-specific access search")
    }

    let accessRecords = []
    if (accessIds.length > 0) {
      console.log("[v0] Reading access records...")
      accessRecords = await client.executeKw("ir.model.access", "read", [accessIds], {
        fields: ["model_id", "perm_read", "perm_write", "perm_create", "perm_unlink"],
      })
      console.log("[v0] Read", accessRecords.length, "access records")
    }

    console.log("[v0] Fetching public access records...")
    const publicAccessIds = await client.executeKw("ir.model.access", "search", [[["group_id", "=", false]]], {})
    console.log("[v0] Found", publicAccessIds.length, "public access record IDs")

    let publicAccessRecords = []
    if (publicAccessIds.length > 0) {
      console.log("[v0] Reading public access records...")
      publicAccessRecords = await client.executeKw("ir.model.access", "read", [publicAccessIds], {
        fields: ["model_id", "perm_read", "perm_write", "perm_create", "perm_unlink"],
      })
      console.log("[v0] Read", publicAccessRecords.length, "public access records")
    }

    const allAccessRecords = [...accessRecords, ...publicAccessRecords]
    console.log("[v0] Total access records:", allAccessRecords.length)

    const accessMap = new Map<number, { read: boolean; write: boolean; create: boolean; unlink: boolean }>()

    for (const record of allAccessRecords) {
      // Extract model ID from many2one field [id, name] and convert to number
      const modelIdRaw = Array.isArray(record.model_id) ? record.model_id[0] : record.model_id
      const modelId = Number(modelIdRaw)

      if (!accessMap.has(modelId)) {
        accessMap.set(modelId, {
          read: false,
          write: false,
          create: false,
          unlink: false,
        })
      }

      const perms = accessMap.get(modelId)!
      perms.read = perms.read || record.perm_read
      perms.write = perms.write || record.perm_write
      perms.create = perms.create || record.perm_create
      perms.unlink = perms.unlink || record.perm_unlink
    }

    const accessRights = models.map((model) => {
      const modelId = Number(model.id)
      const perms = accessMap.get(modelId) || {
        read: false,
        write: false,
        create: false,
        unlink: false,
      }

      return {
        model: model.model,
        model_name: model.name,
        ...perms,
      }
    })

    const filteredAccessRights = accessRights.filter((ar) => ar.read || ar.write || ar.create || ar.unlink)

    console.log("[v0] Returning", filteredAccessRights.length, "models with access out of", models.length, "total")

    return NextResponse.json({
      user_id: user.id,
      user_name: user.name,
      user_login: user.login,
      access_rights: filteredAccessRights,
      total_models: models.length,
      models_with_access: filteredAccessRights.length,
    })
  } catch (error) {
    console.error("[v0] Check access rights error:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "An error occurred" }, { status: 500 })
  }
}
