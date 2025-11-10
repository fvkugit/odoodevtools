"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Shield, AlertCircle, Check, X } from "lucide-react"
import { ConnectionSelector } from "@/components/connection-selector"

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
}

export function AccessRightsChecker() {
  const [connection, setConnection] = useState({
    url: "",
    db: "",
    username: "",
    password: "",
  })
  const [targetUser, setTargetUser] = useState("")

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AccessRightsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const handleCheck = async () => {
    if (!connection.url || !connection.db || !connection.username || !connection.password || !targetUser) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
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
        throw new Error(data.error || "Failed to check access rights")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const filteredRights = result?.access_rights.filter(
    (right) =>
      right.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      right.model_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const hasAnyAccess = (right: AccessRight) => right.read || right.write || right.create || right.unlink

  return (
    <div className="space-y-6">
      <ConnectionSelector value={connection} onChange={setConnection} disabled={loading} />

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Target User
          </CardTitle>
          <CardDescription>Specify the user to check access rights for</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetUser">Target User (login or email)</Label>
            <Input
              id="targetUser"
              placeholder="user@example.com"
              value={targetUser}
              onChange={(e) => setTargetUser(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button onClick={handleCheck} disabled={loading} size="lg" className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking Access Rights...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Check Access Rights
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
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Access Rights for {result.user_name}</CardTitle>
                <CardDescription className="font-mono text-xs mt-1">
                  {result.user_login} (ID: {result.user_id})
                </CardDescription>
              </div>
              <Badge variant="outline">{result.access_rights.length} models</Badge>
            </div>
            <div className="mt-4">
              <Input
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredRights?.map((right, idx) => (
                <div
                  key={idx}
                  className={`p-3 border rounded-lg ${
                    hasAnyAccess(right) ? "border-border bg-card" : "border-border bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{right.model_name}</h4>
                      <p className="text-sm text-muted-foreground font-mono truncate">{right.model}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        {right.read ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">Read</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {right.write ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">Write</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {right.create ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">Create</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {right.unlink ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">Delete</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
