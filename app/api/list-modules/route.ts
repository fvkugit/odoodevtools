import { type NextRequest, NextResponse } from "next/server"
import { OdooClient } from "@/lib/odoo-client"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, db, username, password } = body

    if (!url || !db || !username || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const client = new OdooClient({ url, db, username, password })
    await client.authenticate()

    const modules = await client.executeKw("ir.module.module", "search_read", [[]], {
      fields: ["name", "display_name", "state"],
      order: "display_name",
    })

    return NextResponse.json({ modules })
  } catch (error) {
    console.error("List modules error:", error)
    const errorMessage = error instanceof Error ? error.message : "An error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
