import jsonrpc from "jsonrpc-lite"

interface ConnectionConfig {
  url: string
  db: string
  username: string
  password: string
}

type OdooService = "object" | "common" | "db"

export class OdooClient {
  private config: ConnectionConfig
  public uid: number | null = null
  private requestId = 0

  constructor(config: ConnectionConfig) {
    this.config = {
      ...config,
      url: this.normalizeUrl(config.url),
    }
  }

  private normalizeUrl(url: string): string {
    let normalized = url.trim()
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = `https://${normalized}`
    }
    normalized = normalized.replace(/\/$/, "")
    return normalized
  }

  async authenticate(): Promise<void> {
    if (this.uid) return
    const uid = await this.callRpc<number>("common", "login", [this.config.db, this.config.username, this.config.password])
    if (typeof uid !== "number") {
      throw new Error("Authentication failed")
    }
    this.uid = uid
  }

  async executeKw(model: string, method: string, args: any[] = [], kwargs: Record<string, any> = {}): Promise<any> {
    if (!this.uid) {
      await this.authenticate()
    }
    return this.callRpc("object", "execute_kw", [
      this.config.db,
      this.uid,
      this.config.password,
      model,
      method,
      args,
      kwargs,
    ])
  }

  private async callRpc<T>(service: OdooService, method: string, args: any[]): Promise<T> {
    const payload = jsonrpc.request(++this.requestId, "call", {
      service,
      method,
      args,
    })

    const response = await fetch(`${this.config.url}/jsonrpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }

    const json = await response.json()
    const parsed = jsonrpc.parseObject(json)

    if (parsed.type === "success") {
      return parsed.payload.result as T
    }

    const { error } = parsed.payload
    const details =
      (error.data && (error.data.message || error.data.debug || JSON.stringify(error.data))) || error.message || "Error"
    throw new Error(details)
  }
}
