"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Layers, Loader2, ShieldCheck, Users } from "lucide-react"
import { ConnectionSelector } from "@/components/connection-selector"
import { Separator } from "@/components/ui/separator"

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

interface GroupInsightResponse {
  user: {
    id: number
    name: string
    login: string
  }
  groups: GroupInsight[]
  totals: {
    groups: number
    implied_groups: number
    models_with_access: number
  }
}

export function GroupInsight() {
  const [connection, setConnection] = useState({
    url: "",
    db: "",
    username: "",
    password: "",
  })
  const [targetUser, setTargetUser] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GroupInsightResponse | null>(null)
  const [groupQuery, setGroupQuery] = useState("")

  const handleFetch = async () => {
    if (!connection.url || !connection.db || !connection.username || !connection.password || !targetUser) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/group-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...connection,
          targetUser,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch group insight")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const filteredGroups = useMemo(() => {
    if (!result) return []
    if (!groupQuery) return result.groups

    const term = groupQuery.toLowerCase()
    return result.groups.filter((group) => {
      const technical = group.technical_name ?? ""
      return (
        group.name.toLowerCase().includes(term) ||
        technical.toLowerCase().includes(term) ||
        group.implied_groups.some((implied) => implied.name.toLowerCase().includes(term))
      )
    })
  }, [result, groupQuery])

  return (
    <div className="space-y-6">
      <ConnectionSelector value={connection} onChange={setConnection} disabled={loading} />

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Group Insight</CardTitle>
          <CardDescription>Inspect the user groups, inherited permissions, and granted access per model.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetUser">User Login</Label>
            <Input
              id="targetUser"
              placeholder="admin@example.com"
              value={targetUser}
              onChange={(event) => setTargetUser(event.target.value)}
              disabled={loading}
            />
          </div>
          <Button onClick={handleFetch} disabled={loading} size="lg" className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching group insight...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Analyze Groups
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Summary for {result.user.name}</CardTitle>
              <CardDescription className="font-mono text-xs mt-1">
                {result.user.login} (ID: {result.user.id})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Layers className="h-4 w-4" />
                    Total Groups
                  </div>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{result.totals.groups}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Layers className="h-4 w-4" />
                    Inherited Groups
                  </div>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{result.totals.implied_groups}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    Models with Access
                  </div>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{result.totals.models_with_access}</p>
                </div>
              </div>
              <Separator className="my-6" />
              <Input
                placeholder="Search groups or implied groups..."
                value={groupQuery}
                onChange={(event) => setGroupQuery(event.target.value)}
              />
            </CardContent>
          </Card>

          {filteredGroups.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="py-8 text-center text-muted-foreground">No groups match the search filter.</CardContent>
            </Card>
          ) : (
            filteredGroups.map((group) => (
              <Card key={group.id} className="border-border bg-card">
                <CardHeader>
                  <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle>{group.name}</CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        ID {group.id}
                        {group.technical_name ? ` · ${group.technical_name}` : ""}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 items-center mt-2 md:mt-0">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {group.users_count} users
                      </Badge>
                      <Badge variant="secondary">{group.access_rights.length} models</Badge>
                    </div>
                  </div>
                  {group.category && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Category: <span className="font-medium">{group.category.name}</span>
                    </p>
                  )}
                  {group.notes && (
                    <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-3">
                      {group.notes}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-2">Inherited Groups</p>
                    {group.implied_groups.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No implied groups.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {group.implied_groups.map((implied) => (
                          <Badge key={implied.id} variant="outline">
                            {implied.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-2">Access Rights</p>
                    {group.access_rights.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No model-level permissions granted.</p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-border">
                        <div className="grid grid-cols-[2fr,repeat(4,minmax(0,1fr))] bg-muted/60 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <span>Model</span>
                          <span>Read</span>
                          <span>Write</span>
                          <span>Create</span>
                          <span>Delete</span>
                        </div>
                        {group.access_rights.map((access) => (
                          <div
                            key={`${group.id}-${access.model}`}
                            className="grid grid-cols-[2fr,repeat(4,minmax(0,1fr))] px-3 py-2 text-sm border-t border-border/60"
                          >
                            <div>
                              <p className="font-medium text-foreground">{access.model_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{access.model}</p>
                            </div>
                            <span className={access.read ? "text-emerald-500 font-medium" : "text-muted-foreground"}>{access.read ? "Yes" : "No"}</span>
                            <span className={access.write ? "text-emerald-500 font-medium" : "text-muted-foreground"}>{access.write ? "Yes" : "No"}</span>
                            <span className={access.create ? "text-emerald-500 font-medium" : "text-muted-foreground"}>{access.create ? "Yes" : "No"}</span>
                            <span className={access.unlink ? "text-emerald-500 font-medium" : "text-muted-foreground"}>{access.unlink ? "Yes" : "No"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
