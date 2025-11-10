"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, AlertCircle, GitCompare, CheckCircle2 } from "lucide-react"
import { ConnectionSelector } from "@/components/connection-selector"
import { useTranslations } from "@/lib/language-context"

interface Module {
  id: number
  name: string
  display_name: string
  state: string
  installed_version?: string
  latest_version?: string
  author?: string
  summary?: string
}

interface ComparisonResult {
  only_in_env1: Module[]
  only_in_env2: Module[]
  version_diff: Array<{ module: string; env1_version: string; env2_version: string }>
  common: Module[]
}

export function ModuleManager() {
  const { t } = useTranslations()
  const [connection1, setConnection1] = useState({
    url: "",
    db: "",
    username: "",
    password: "",
  })

  const [connection2, setConnection2] = useState({
    url: "",
    db: "",
    username: "",
    password: "",
  })

  const [loading, setLoading] = useState(false)
  const [modules, setModules] = useState<Module[]>([])
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const handleListModules = async () => {
    if (!connection1.url || !connection1.db || !connection1.username || !connection1.password) {
      setError("Please fill in all connection fields")
      return
    }

    setLoading(true)
    setError(null)
    setModules([])
    setComparison(null)

    try {
      const response = await fetch("/api/list-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connection1),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to list modules")
      }

      setModules(data.modules)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = async () => {
    if (
      !connection1.url ||
      !connection1.db ||
      !connection1.username ||
      !connection1.password ||
      !connection2.url ||
      !connection2.db ||
      !connection2.username ||
      !connection2.password
    ) {
      setError("Please fill in all connection fields for both environments")
      return
    }

    setLoading(true)
    setError(null)
    setModules([])
    setComparison(null)

    try {
      const response = await fetch("/api/compare-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          env1: connection1,
          env2: connection2,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to compare modules")
      }

      setComparison(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const installedModules = modules.filter((mod) => mod.state === "installed")
  const nonInstalledModules = modules.filter((mod) => mod.state !== "installed")

  const filteredInstalledModules = installedModules.filter(
    (mod) =>
      mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.display_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredNonInstalledModules = nonInstalledModules.filter(
    (mod) =>
      mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.display_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">{t("moduleManager.listTab")}</TabsTrigger>
          <TabsTrigger value="compare">{t("moduleManager.compareTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <ConnectionSelector value={connection1} onChange={setConnection1} disabled={loading} />

          <Button onClick={handleListModules} disabled={loading} size="lg" className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("moduleManager.listingLoading")}
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                {t("moduleManager.listAction")}
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="compare" className="space-y-6">
          <ConnectionSelector
            value={connection1}
            onChange={setConnection1}
            disabled={loading}
            label={t("moduleManager.env1Label")}
          />

          <ConnectionSelector
            value={connection2}
            onChange={setConnection2}
            disabled={loading}
            label={t("moduleManager.env2Label")}
          />

          <Button onClick={handleCompare} disabled={loading} size="lg" className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("moduleManager.compareLoading")}
              </>
            ) : (
              <>
                <GitCompare className="mr-2 h-4 w-4" />
                {t("moduleManager.compareAction")}
              </>
            )}
          </Button>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {modules.length > 0 && (
        <div className="space-y-4">
          <Input
            placeholder={t("moduleManager.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />

          <Tabs defaultValue="installed" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="installed">
                {t("moduleManager.installedTab")} ({installedModules.length})
              </TabsTrigger>
              <TabsTrigger value="available">
                {t("moduleManager.availableTab")} ({nonInstalledModules.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="installed">
              {filteredInstalledModules.length > 0 ? (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{t("moduleManager.installedTitle")}</CardTitle>
                      <Badge variant="default">
                        {installedModules.length} {t("moduleManager.installedTab")?.toLowerCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filteredInstalledModules.map((mod) => (
                        <div key={mod.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground">{mod.display_name}</h4>
                              <Badge variant="default">{mod.state}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">{mod.name}</p>
                            {mod.summary && <p className="text-sm text-muted-foreground mt-1">{mod.summary}</p>}
                          </div>
                          {(mod.installed_version || mod.author) && (
                            <div className="text-right">
                              {mod.installed_version && (
                                <p className="text-sm font-mono text-foreground">{mod.installed_version}</p>
                              )}
                              {mod.author && <p className="text-xs text-muted-foreground">{mod.author}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border bg-card">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    {t("moduleManager.noInstalledMatch")}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="available">
              {filteredNonInstalledModules.length > 0 ? (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{t("moduleManager.availableTitle")}</CardTitle>
                      <Badge variant="secondary">
                        {nonInstalledModules.length} {t("moduleManager.availableTab")?.toLowerCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filteredNonInstalledModules.map((mod) => (
                        <div key={mod.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground">{mod.display_name}</h4>
                              <Badge variant="secondary">{mod.state}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">{mod.name}</p>
                            {mod.summary && <p className="text-sm text-muted-foreground mt-1">{mod.summary}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border bg-card">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    {t("moduleManager.noAvailableMatch")}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {comparison && (
        <div className="space-y-6">
          {comparison.only_in_env1.length === 0 && comparison.only_in_env2.length === 0 && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Both environments have matching installed modules! All {comparison.common.length} modules are identical.
              </AlertDescription>
            </Alert>
          )}

          {comparison.version_diff.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Version Differences
                </CardTitle>
                <CardDescription>Modules with different versions between environments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparison.version_diff.map((diff, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <span className="font-mono text-sm">{diff.module}</span>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">Env1: {diff.env1_version}</Badge>
                        <Badge variant="outline">Env2: {diff.env2_version}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {comparison.only_in_env1.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Only in Environment 1</CardTitle>
                <CardDescription>{comparison.only_in_env1.length} modules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparison.only_in_env1.map((mod) => (
                    <div key={mod.id} className="p-3 border border-border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{mod.display_name}</span>
                        {mod.installed_version && (
                          <span className="text-sm font-mono text-muted-foreground">{mod.installed_version}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">{mod.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {comparison.only_in_env2.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Only in Environment 2</CardTitle>
                <CardDescription>{comparison.only_in_env2.length} modules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparison.only_in_env2.map((mod) => (
                    <div key={mod.id} className="p-3 border border-border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{mod.display_name}</span>
                        {mod.installed_version && (
                          <span className="text-sm font-mono text-muted-foreground">{mod.installed_version}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">{mod.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
