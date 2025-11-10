import { type NextRequest, NextResponse } from "next/server"
import { OdooClient } from "@/lib/odoo-client"

interface Module {
  name: string
  display_name: string
  installed_version?: string
  [key: string]: any
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { env1, env2 } = body

    if (!env1 || !env2) {
      return NextResponse.json({ error: "Missing environment configurations" }, { status: 400 })
    }

    const client1 = new OdooClient(env1)
    const client2 = new OdooClient(env2)

    await Promise.all([client1.authenticate(), client2.authenticate()])

    const [modules1, modules2] = await Promise.all([
      client1.executeKw("ir.module.module", "search_read", [[["state", "=", "installed"]]], {
        fields: ["name", "display_name", "state"],
      }),
      client2.executeKw("ir.module.module", "search_read", [[["state", "=", "installed"]]], {
        fields: ["name", "display_name", "state"],
      }),
    ])

    const modules1Map = new Map(modules1.map((m: Module) => [m.name, m]))
    const modules2Map = new Map(modules2.map((m: Module) => [m.name, m]))

    const only_in_env1 = modules1.filter((m: Module) => !modules2Map.has(m.name))
    const only_in_env2 = modules2.filter((m: Module) => !modules1Map.has(m.name))
    const common: Module[] = []

    for (const mod1 of modules1) {
      const mod2 = modules2Map.get(mod1.name)
      if (mod2) {
        common.push(mod1)
      }
    }

    return NextResponse.json({
      only_in_env1,
      only_in_env2,
      common,
      version_diff: [],
    })
  } catch (error) {
    console.error("Compare modules error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "An error occurred" }, { status: 500 })
  }
}
