"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ConnectionSelector } from "@/components/connection-selector"
import { AlertCircle, ArrowLeftRight, Loader2, Shield, ShieldOff } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface AccessRight {
  model: string
  model_name: string
  read: boolean
  write: boolean
  create: boolean
  unlink: boolean
}

interface AccessRightsResult {
  user_id: number
  user_name: string
  user_login: string
  access_rights: AccessRight[]
  total_models: number
  models_with_access: number
}

type DiffStatus = "only_left" | "only_right" | "different"

interface AccessDifference {
  model: string
  model_name: string
  left: AccessRight | null
  right: AccessRight | null
  status: DiffStatus
  changes: {
    read: boolean
    write: boolean
    create: boolean
    unlink: boolean
  }
}

export function AccessRightsComparator() {
  const [connection, setConnection] = useState({
    url: "",
    db: "",
    username: "",
    password: "",
  })
  const [leftUser, setLeftUser] = useState("")
  const [rightUser, setRightUser] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leftResult, setLeftResult] = useState<AccessRightsResult | null>(null)
  const [rightResult, setRightResult] = useState<AccessRightsResult | null>(null)
  const [differences, setDifferences] = useState<AccessDifference[]>([])
  const [filter, setFilter] = useState("")

  const fetchAccessRights = async (targetUser: string): Promise<AccessRightsResult> => {
    const response = await fetch("/api/check-access-rights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...connection,
        targetUser,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `Failed to fetch access rights for ${targetUser}`)
    }

    return data
  }

  const hasAnyAccess = (right: AccessRight | null): boolean => {
    if (!right) return false
    return right.read || right.write || right.create || right.unlink
  }

  const computeDifferences = (left: AccessRightsResult, right: AccessRightsResult): AccessDifference[] => {
    const leftMap = new Map<string, AccessRight>()
    for (const access of left.access_rights) {
      leftMap.set(access.model, access)
    }

    const rightMap = new Map<string, AccessRight>()
    for (const access of right.access_rights) {
      rightMap.set(access.model, access)
    }

    const modelKeys = new Set([...leftMap.keys(), ...rightMap.keys()])
    const diffs: AccessDifference[] = []

    modelKeys.forEach((model) => {
      const leftAccess = leftMap.get(model) || null
      const rightAccess = rightMap.get(model) || null
      const modelName = leftAccess?.model_name ?? rightAccess?.model_name ?? model

      if (leftAccess && !rightAccess && hasAnyAccess(leftAccess)) {
        diffs.push({
          model,
          model_name: modelName,
          left: leftAccess,
          right: null,
          status: "only_left",
          changes: {
            read: leftAccess.read,
            write: leftAccess.write,
            create: leftAccess.create,
            unlink: leftAccess.unlink,
          },
        })
        return
      }

      if (!leftAccess && rightAccess && hasAnyAccess(rightAccess)) {
        diffs.push({
          model,
          model_name: modelName,
          left: null,
          right: rightAccess,
          status: "only_right",
          changes: {
            read: rightAccess.read,
            write: rightAccess.write,
            create: rightAccess.create,
            unlink: rightAccess.unlink,
          },
        })
        return
      }

      if (leftAccess && rightAccess) {
        const changes = {
          read: leftAccess.read !== rightAccess.read,
          write: leftAccess.write !== rightAccess.write,
          create: leftAccess.create !== rightAccess.create,
          unlink: leftAccess.unlink !== rightAccess.unlink,
        }

        if (changes.read || changes.write || changes.create || changes.unlink) {
          diffs.push({
            model,
            model_name: modelName,
            left: leftAccess,
            right: rightAccess,
            status: "different",
            changes,
          })
        }
      }
    })

    diffs.sort((a, b) => {
      const order: Record<DiffStatus, number> = { only_left: 0, only_right: 1, different: 2 }
      const diff = order[a.status] - order[b.status]
      if (diff !== 0) return diff
      return a.model_name.localeCompare(b.model_name)
    })

    return diffs
  }

  const handleCompare = async () => {
    if (
      !connection.url ||
      !connection.db ||
      !connection.username ||
      !connection.password ||
      !leftUser ||
      !rightUser
    ) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError(null)
    setLeftResult(null)
    setRightResult(null)
    setDifferences([])

    try {
      const [leftData, rightData] = await Promise.all([fetchAccessRights(leftUser), fetchAccessRights(rightUser)])
      setLeftResult(leftData)
      setRightResult(rightData)
      setDifferences(computeDifferences(leftData, rightData))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while comparing users")
    } finally {
      setLoading(false)
    }
  }

  const diffStats = useMemo(() => {
    const stats = { only_left: 0, only_right: 0, different: 0 }
    for (const diff of differences) {
      stats[diff.status]++
    }
    return stats
  }, [differences])

  const filteredDiffs = useMemo(() => {
    if (!filter) return differences
    const term = filter.toLowerCase()
    return differences.filter(
      (diff) =>
        diff.model.toLowerCase().includes(term) ||
        diff.model_name.toLowerCase().includes(term) ||
        diff.status.includes(term),
    )
  }, [differences, filter])

  const renderPermissionCell = (value: boolean | null, changed: boolean) => {
    if (value === null) {
      return <span className="text-muted-foreground text-sm">—</span>
    }

    if (value) {
      return (
        <span className={`text-sm font-medium ${changed ? "text-emerald-500" : "text-foreground"}`}>
          <Shield className="mr-1 inline-block h-4 w-4" />
          Yes
        </span>
      )
    }

    return (
      <span className={`text-sm font-medium ${changed ? "text-rose-500" : "text-muted-foreground"}`}>
        <ShieldOff className="mr-1 inline-block h-4 w-4" />
        No
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <ConnectionSelector value={connection} onChange={setConnection} disabled={loading} />

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Access Rights Comparator</CardTitle>
          <CardDescription>Compare model permissions granted to two Odoo users in the same environment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leftUser">Left User</Label>
              <Input
                id="leftUser"
                placeholder="first.user@example.com"
                value={leftUser}
                onChange={(event) => setLeftUser(event.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rightUser">Right User</Label>
              <Input
                id="rightUser"
                placeholder="second.user@example.com"
                value={rightUser}
                onChange={(event) => setRightUser(event.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <Button onClick={handleCompare} disabled={loading} size="lg" className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Comparing access rights...
              </>
            ) : (
              <>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Compare Users
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

      {leftResult && rightResult && (
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Quick snapshot of each user and the difference set.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase text-muted-foreground mb-2">Left User</p>
                  <p className="text-base font-semibold text-foreground">{leftResult.user_name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{leftResult.user_login}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Models:{" "}
                    <span className="font-medium text-foreground">
                      {leftResult.models_with_access}/{leftResult.total_models}
                    </span>
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase text-muted-foreground mb-2">Right User</p>
                  <p className="text-base font-semibold text-foreground">{rightResult.user_name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{rightResult.user_login}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Models:{" "}
                    <span className="font-medium text-foreground">
                      {rightResult.models_with_access}/{rightResult.total_models}
                    </span>
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                  <p className="text-xs uppercase text-muted-foreground">Differences</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Left only: {diffStats.only_left}</Badge>
                    <Badge variant="outline">Right only: {diffStats.only_right}</Badge>
                    <Badge variant="outline">Changed: {diffStats.different}</Badge>
                    <Badge variant="secondary">Total: {differences.length}</Badge>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <Input
                placeholder="Filter by model or status..."
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </CardContent>
          </Card>

          {filteredDiffs.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="py-10 text-center text-muted-foreground">
                No differences found with the current filters.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-[2fr,repeat(4,minmax(0,1fr)),repeat(4,minmax(0,1fr))] bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>Model</span>
                <span>Left Read</span>
                <span>Left Write</span>
                <span>Left Create</span>
                <span>Left Delete</span>
                <span>Right Read</span>
                <span>Right Write</span>
                <span>Right Create</span>
                <span>Right Delete</span>
              </div>

              {filteredDiffs.map((diff) => (
                <div
                  key={diff.model}
                  className="grid grid-cols-[2fr,repeat(4,minmax(0,1fr)),repeat(4,minmax(0,1fr))] px-3 py-3 border-t border-border/60 text-sm"
                >
                  <div className="pr-4">
                    <p className="font-semibold text-foreground">{diff.model_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{diff.model}</p>
                    <div className="mt-2 flex gap-2">
                      {diff.status === "only_left" && <Badge variant="outline">Only left</Badge>}
                      {diff.status === "only_right" && <Badge variant="outline">Only right</Badge>}
                      {diff.status === "different" && <Badge variant="secondary">Changed</Badge>}
                    </div>
                  </div>
                  {(["read", "write", "create", "unlink"] as const).map((perm) => (
                    <div
                      key={`left-${diff.model}-${perm}`}
                      className="flex items-center"
                    >
                      {renderPermissionCell(
                        diff.left ? diff.left[perm] : null,
                        diff.status === "different" ? diff.changes[perm] : diff.status === "only_left",
                      )}
                    </div>
                  ))}
                  {(["read", "write", "create", "unlink"] as const).map((perm) => (
                    <div
                      key={`right-${diff.model}-${perm}`}
                      className="flex items-center"
                    >
                      {renderPermissionCell(
                        diff.right ? diff.right[perm] : null,
                        diff.status === "different" ? diff.changes[perm] : diff.status === "only_right",
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
