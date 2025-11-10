"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, AlertCircle, CheckCircle2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { ConnectionSelector } from "@/components/connection-selector"

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

export function SqlQueryExecutor() {
  const [connection, setConnection] = useState({
    url: "",
    db: "",
    username: "",
    password: "",
  })
  const [query, setQuery] = useState("SELECT id, login FROM res_users LIMIT 10;")
  const [applyChanges, setApplyChanges] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExecute = async () => {
    if (!connection.url || !connection.db || !connection.username || !connection.password || !query) {
      setError("Please fill in all connection fields and provide a query")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/execute-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...connection,
          query,
          applyChanges,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute query")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <ConnectionSelector value={connection} onChange={setConnection} disabled={loading} />

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>SQL Query</CardTitle>
          <CardDescription>Write your SQL query to execute on the Odoo database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query">Query</Label>
            <textarea
              id="query"
              className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="SELECT * FROM res_users LIMIT 10;"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch id="apply-changes" checked={applyChanges} onCheckedChange={setApplyChanges} disabled={loading} />
              <Label htmlFor="apply-changes" className="cursor-pointer">
                Apply changes (commit)
              </Label>
            </div>
            <Button onClick={handleExecute} disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Query
                </>
              )}
            </Button>
          </div>

          {!applyChanges && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Running in <strong>simulation mode</strong>. Changes will be rolled back automatically.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-mono text-sm whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Query Results
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant={result.dry_run ? "secondary" : "default"}>
                  {result.dry_run ? "Simulation" : "Applied"}
                </Badge>
                <Badge variant="outline">{result.row_count} rows</Badge>
              </div>
            </div>
            <CardDescription>
              Executed at: {result.executed_at || "N/A"}
              {result.statusmessage && ` • ${result.statusmessage}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="table" className="w-full">
              <TabsList>
                <TabsTrigger value="table">Table View</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
              <TabsContent value="table" className="mt-4">
                {result.columns.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          {result.columns.map((col, idx) => (
                            <th key={idx} className="px-4 py-2 text-left text-sm font-semibold text-foreground">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-b border-border hover:bg-muted/30">
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="px-4 py-2 text-sm font-mono text-foreground">
                                {cell === null ? <span className="text-muted-foreground italic">null</span> : cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Query executed successfully. {result.affected_rows} rows affected.</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="json" className="mt-4">
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
