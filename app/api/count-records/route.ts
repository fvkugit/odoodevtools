import { type NextRequest, NextResponse } from "next/server"
import { OdooClient } from "@/lib/odoo-client"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, db, username, password, model, domain } = body

    if (!url || !db || !username || !password || !model || !domain) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!Array.isArray(domain)) {
      return NextResponse.json({ error: "Domain must be an array" }, { status: 400 })
    }

    const client = new OdooClient({ url, db, username, password })
    await client.authenticate()

    const count = await client.executeKw(model, "search_count", [domain])

    if (typeof count !== "number") {
      throw new Error("Invalid response from server")
    }

    return NextResponse.json({ count, model, domain })
  } catch (error) {
    console.error("Count records error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "An error occurred" }, { status: 500 })
  }
}
