"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Database, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { ConnectionSelector } from "@/components/connection-selector"
import { useTranslations } from "@/lib/language-context"

export default function DomainCounter() {
  const { t } = useTranslations()
  const [connection, setConnection] = useState({
    url: "",
    db: "",
    username: "",
    password: "",
  })
  const [model, setModel] = useState("res.partner")
  const [domain, setDomain] = useState('[\n  ["active", "=", true]\n]')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<number | null>(null)

  const handleCountRecords = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Validate domain JSON
      let parsedDomain
      try {
        parsedDomain = JSON.parse(domain)
      } catch {
        throw new Error("Invalid domain format. Must be valid JSON array.")
      }

      if (!Array.isArray(parsedDomain)) {
        throw new Error("Domain must be an array.")
      }

      const response = await fetch("/api/count-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...connection,
          model,
          domain: parsedDomain,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to count records")
      }

      setResult(data.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <svg className="h-6 w-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">OdooTools</h1>
                <p className="text-xs text-muted-foreground">{t("domainCounter.title")}</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">{t("domainCounter.title")}</h2>
            <p className="text-muted-foreground">{t("domainCounter.description")}</p>
          </div>

          <ConnectionSelector value={connection} onChange={setConnection} disabled={loading} />

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Domain Configuration</CardTitle>
              <CardDescription>Specify the model and search domain to test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="res.partner"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Example: res.partner, sale.order, product.product</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Domain (JSON format)</Label>
                <Textarea
                  id="domain"
                  placeholder='[["active", "=", true], ["customer_rank", ">", 0]]'
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="font-mono min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Use JSON array format. Supports operators: |, &, !, =, !=, &gt;, &lt;, &gt;=, &lt;=, in, not in, like,
                  ilike
                </p>
              </div>

              <Button onClick={handleCountRecords} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Counting Records...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Count Records
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

          {result !== null && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-amber-500/10">
                    <Database className="h-8 w-8 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Records found</p>
                    <p className="text-4xl font-bold text-foreground">{result.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 p-4 rounded-lg bg-muted">
                  <p className="text-sm font-mono text-muted-foreground">
                    Model: <span className="text-foreground">{model}</span>
                  </p>
                  <p className="text-sm font-mono text-muted-foreground mt-1">
                    Domain: <span className="text-foreground">{domain}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
