"use client"

import { useState, type ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, FileText, Loader2 } from "lucide-react"
import { useTranslations } from "@/lib/language-context"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

type ValidationResult = {
  stats: {
    totalEntries: number
    translated: number
    missing: number
    duplicates: number
  }
  issues: Array<{
    type: "missing" | "placeholder" | "duplicate" | "duplicateReference"
    msgid: string
    msgctxt?: string
    details: string
  }>
}

export function PoValidator() {
  const { t } = useTranslations()
  const [content, setContent] = useState("")
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setContent(text)
    setResult(null)
    setError(null)
  }

  const handleValidate = async () => {
    if (!content.trim()) {
      setError(t("poValidator.errors.empty"))
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/validate-po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t("poValidator.errors.generic"))
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("poValidator.errors.generic"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>{t("poValidator.input.title")}</CardTitle>
          <CardDescription>{t("poValidator.input.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t("poValidator.input.fileLabel")}</label>
            <Input type="file" accept=".po" onChange={handleFileChange} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t("poValidator.input.textLabel")}</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("poValidator.input.placeholder")}
              className="min-h-[220px] font-mono"
            />
          </div>

          <Button onClick={handleValidate} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("poValidator.input.validating")}
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                {t("poValidator.input.cta")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>{t("poValidator.results.title")}</CardTitle>
              <CardDescription>{t("poValidator.results.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase text-muted-foreground">{t("poValidator.results.total")}</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{result.stats.totalEntries}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase text-muted-foreground">{t("poValidator.results.translated")}</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-500">{result.stats.translated}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase text-muted-foreground">{t("poValidator.results.missing")}</p>
                  <p className="mt-2 text-3xl font-semibold text-amber-500">{result.stats.missing}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase text-muted-foreground">{t("poValidator.results.duplicates")}</p>
                  <p className="mt-2 text-3xl font-semibold text-rose-500">{result.stats.duplicates}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <IssueSection result={result} />
        </div>
      )}
    </div>
  )
}

type IssueSectionProps = {
  result: ValidationResult
}

function IssueSection({ result }: IssueSectionProps) {
  const { t } = useTranslations()
  const blockingIssues = result.issues.filter(
    (issue) => issue.type === "duplicate" || issue.type === "duplicateReference",
  )
  const warningIssues = result.issues.filter(
    (issue) => issue.type !== "duplicate" && issue.type !== "duplicateReference",
  )

  const renderIssueCard = (
    title: string,
    description: string,
    emptyText: string,
    issues: ValidationResult["issues"],
    badgeVariant: "destructive" | "outline",
    icon: ReactNode,
  ) => (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title.replace("{count}", String(issues.length))}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {issues.length > 0 ? (
        <CardContent className="space-y-3">
          {issues.map((issue, index) => (
            <div key={`${issue.msgid}-${index}`} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={issue.type === "duplicate" || issue.type === "duplicateReference" ? "destructive" : badgeVariant}>
                  {t(`poValidator.issue.${issue.type}`)}
                </Badge>
                {issue.msgctxt && (
                  <span className="text-xs text-muted-foreground">{t("poValidator.issue.context") + issue.msgctxt}</span>
                )}
              </div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                msgid: <span className="text-foreground">{issue.msgid || "<empty>"}</span>
              </p>
              <p className="mt-1 text-foreground">{issue.details}</p>
            </div>
          ))}
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </CardContent>
      )}
    </Card>
  )

  return (
    <>
      {renderIssueCard(
        t("poValidator.results.blockingTitle"),
        t("poValidator.results.blockingDescription"),
        t("poValidator.results.blockingEmpty"),
        blockingIssues,
        "destructive",
        <AlertCircle className="h-5 w-5 text-rose-500" />,
      )}
      {renderIssueCard(
        t("poValidator.results.warningTitle"),
        t("poValidator.results.warningDescription"),
        t("poValidator.results.warningEmpty"),
        warningIssues,
        "outline",
        <AlertCircle className="h-5 w-5 text-amber-500" />,
      )}
    </>
  )
}
