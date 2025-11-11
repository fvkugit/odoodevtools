import { type NextRequest, NextResponse } from "next/server"
import { OdooClient } from "@/lib/odoo-client"

interface ConnectionConfig {
  url: string
  db: string
  username: string
  password: string
  timeout?: number
}

interface QueryResult {
  query: string
  columns: string[]
  rows: string[][]
  row_count: number
  affected_rows: number
  statusmessage: string | null
  executed_at: string | null
  dry_run: boolean
}

class ScheduledQueryExecutor {
  private client: OdooClient
  private pollInterval: number
  private readonly RESULT_PREFIX = "sql_runner.result."
  private readonly ERROR_PREFIX = "sql_runner.error."

  constructor(client: OdooClient, pollInterval = 2000) {
    this.client = client
    this.pollInterval = pollInterval
  }

  async runQuery(query: string, timeout: number, commitChanges: boolean): Promise<QueryResult> {
    await this.client.authenticate()
    const token = this.generateToken()
    let cronId: number | null = null

    try {
      cronId = await this.createCron(query, token, commitChanges)
      await this.triggerCron(cronId, token)
      return await this.awaitResult(token, timeout)
    } finally {
      await this.cleanup(cronId, token)
    }
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  private async createCron(query: string, token: string, commitChanges: boolean): Promise<number> {
    const pythonCode = this.buildPythonCode(query, token, commitChanges)

    console.log("[v0] Searching for ir.cron model...")
    const modelIds = await this.client.executeKw("ir.model", "search", [[["model", "=", "ir.cron"]]], { limit: 1 })
    console.log("[v0] Model IDs found:", modelIds)
    console.log("[v0] Model IDs type:", typeof modelIds, "Is array:", Array.isArray(modelIds))

    let modelId: number
    if (Array.isArray(modelIds)) {
      if (modelIds.length === 0) {
        throw new Error("Could not find ir.cron model")
      }
      modelId = modelIds[0]
    } else if (typeof modelIds === "number") {
      modelId = modelIds
    } else {
      throw new Error(`Unexpected model_id response type: ${typeof modelIds}`)
    }

    console.log("[v0] Using model_id:", modelId, "type:", typeof modelId)
    console.log("[v0] Using user_id:", this.client.uid, "type:", typeof this.client.uid)

    const cronVals = {
      name: `SQL Runner ${token}`,
      model_id: modelId,
      state: "code",
      code: pythonCode,
      interval_number: 1,
      interval_type: "minutes",
      numbercall: 1,
      doall: true,
      active: true,
      nextcall: new Date().toISOString().replace("T", " ").substring(0, 19),
      user_id: this.client.uid,
    }

    console.log("[v0] Creating cron with values:", JSON.stringify(cronVals, null, 2))
    const cronId = await this.client.executeKw("ir.cron", "create", [cronVals])
    console.log("[v0] Cron created with ID:", cronId)

    if (!cronId || typeof cronId !== "number") {
      throw new Error("Failed to create scheduled action")
    }

    return cronId
  }

  private buildPythonCode(query: string, token: string, commitChanges: boolean): string {
    const queryLiteral = JSON.stringify(query)
    const tokenLiteral = JSON.stringify(token)
    const commitLiteral = commitChanges ? "True" : "False"

    return `query = ${queryLiteral}
token = ${tokenLiteral}
result_key = "${this.RESULT_PREFIX}" + token
error_key = "${this.ERROR_PREFIX}" + token
commit_changes = ${commitLiteral}
savepoint = "sql_runner_" + token

def _stringify(value):
    if value is None:
        return None
    try:
        return str(value)
    except Exception:
        try:
            return repr(value)
        except Exception:
            return "<unrepresentable>"

def _json_escape(value):
    return (
        value.replace("\\\\", "\\\\\\\\")
        .replace('"', '\\"')
        .replace("\\n", "\\\\n")
        .replace("\\r", "\\\\r")
        .replace("\\t", "\\\\t")
    )

def _to_json(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(_to_json(item) for item in value) + "]"
    if isinstance(value, dict):
        parts = []
        for key, val in value.items():
            parts.append('"' + _json_escape(str(key)) + '":' + _to_json(val))
        return "{" + ",".join(parts) + "}"
    stringified = _stringify(value) or ""
    return '"' + _json_escape(stringified) + '"'

try:
    env.cr.execute("SAVEPOINT %s" % savepoint)
    env.cr.execute(query)
    description = env.cr.description
    rows = env.cr.fetchall() if description else []
    columns = [col[0] for col in description] if description else []
    try:
        statusmsg = env.cr.statusmessage
    except AttributeError:
        statusmsg = None
    affected = env.cr.rowcount
    row_count = len(rows) if description else affected
    payload = {
        "query": query,
        "columns": columns,
        "rows": [[_stringify(cell) for cell in row] for row in rows],
        "row_count": row_count,
        "affected_rows": affected,
        "statusmessage": statusmsg,
        "executed_at": None,
        "dry_run": not commit_changes,
    }
    try:
        env.cr.execute("SELECT NOW()")
        executed_at = env.cr.fetchone()
        if executed_at:
            payload["executed_at"] = _stringify(executed_at[0])
    except Exception:
        payload["executed_at"] = None
    if commit_changes:
        env.cr.execute("RELEASE SAVEPOINT %s" % savepoint)
    else:
        env.cr.execute("ROLLBACK TO SAVEPOINT %s" % savepoint)
        env.cr.execute("RELEASE SAVEPOINT %s" % savepoint)
    env["ir.config_parameter"].sudo().set_param(result_key, _to_json(payload))
except Exception as exc:
    try:
        env.cr.execute("ROLLBACK TO SAVEPOINT %s" % savepoint)
        env.cr.execute("RELEASE SAVEPOINT %s" % savepoint)
    except Exception:
        pass
    env["ir.config_parameter"].sudo().set_param(
        error_key,
        _to_json({"query": query, "error": str(exc)}),
    )
    raise`
  }

  private async triggerCron(cronId: number, token: string): Promise<void> {
    try {
      await this.client.executeKw("ir.cron", "method_direct_trigger", [[cronId]])
    } catch (error) {
      const detailed = await this.extractErrorDetails(token)
      if (detailed) {
        throw new Error(detailed)
      }
      throw error
    }
  }

  private async awaitResult(token: string, timeout: number): Promise<QueryResult> {
    const deadline = Date.now() + timeout
    const resultKey = this.RESULT_PREFIX + token
    const errorKey = this.ERROR_PREFIX + token

    while (Date.now() < deadline) {
      const result = await this.getParam(resultKey)
      if (result) {
        return this.parseResult(result)
      }

      const error = await this.getParam(errorKey)
      if (error) {
        throw new Error(this.formatError(error))
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollInterval))
    }

    throw new Error(`Query timeout after ${timeout}ms`)
  }

  private parseResult(result: string): QueryResult {
    try {
      return JSON.parse(result)
    } catch {
      throw new Error("Failed to parse query result")
    }
  }

  private formatError(error: string): string {
    try {
      const parsed = JSON.parse(error)
      return parsed.error || error
    } catch {
      return error
    }
  }

  private async cleanup(cronId: number | null, token: string): Promise<void> {
    const resultKey = this.RESULT_PREFIX + token
    const errorKey = this.ERROR_PREFIX + token

    if (cronId) {
      try {
        await this.client.executeKw("ir.cron", "unlink", [[cronId]])
      } catch {
        // Ignore cleanup errors
      }
    }

    for (const key of [resultKey, errorKey]) {
      try {
        const paramIds = await this.client.executeKw("ir.config_parameter", "search", [[["key", "=", key]]])
        if (paramIds && paramIds.length > 0) {
          await this.client.executeKw("ir.config_parameter", "unlink", [paramIds])
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private async getParam(key: string): Promise<string | null> {
    try {
      const result = await this.client.executeKw("ir.config_parameter", "get_param", [key], { default: false })
      return result || null
    } catch {
      return null
    }
  }

  private async extractErrorDetails(token: string): Promise<string | null> {
    const errorKey = this.ERROR_PREFIX + token
    try {
      const payload = await this.getParam(errorKey)
      return payload ? this.formatError(payload) : null
    } catch {
      return null
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, db, username, password, query, applyChanges } = body

    if (!url || !db || !username || !password || !query) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const client = new OdooClient({ url, db, username, password })
    const executor = new ScheduledQueryExecutor(client)

    const result = await executor.runQuery(query, 60000, applyChanges || false)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Query execution error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "An error occurred" }, { status: 500 })
  }
}
