import { NextResponse, type NextRequest } from "next/server"
import gettextParser from "gettext-parser"

type Issue = {
  type: "missing" | "placeholder" | "duplicate" | "duplicateReference"
  msgid: string
  msgctxt?: string
  details: string
}

const MODEL_REFERENCE_PREFIX = "model:"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Missing .po content" }, { status: 400 })
    }

    let parsed
    try {
      parsed = gettextParser.po.parse(content, "utf-8")
    } catch (error) {
      return NextResponse.json(
        {
          error: "Failed to parse .po file",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 400 },
      )
    }

    const isRecordContext = (value?: string) => (value ? value.startsWith(MODEL_REFERENCE_PREFIX) : false)

    const issues: Issue[] = []
    const entryMap = new Map<string, { msgid: string; msgctxt?: string }>()
    const referenceMap = new Map<string, { msgid: string; msgctxt?: string }>()
    let totalEntries = 0
    let translated = 0
    let duplicateCount = 0

    const placeholderRegex = /%(\(\w+\))?[sdif]/g

    const addIssue = (issue: Issue) => {
      issues.push(issue)
      if (issue.type === "duplicate" || issue.type === "duplicateReference") {
        duplicateCount += 1
      }
    }

    const entries = parsed.translations || {}
    const issuePriority: Record<Issue["type"], number> = {
      duplicate: 0,
      duplicateReference: 0,
      missing: 1,
      placeholder: 1,
    }

    Object.values(entries).forEach((contexts) => {
      Object.keys(contexts).forEach((key) => {
        if (key === "") return

        const entry = contexts[key]
        if (!entry) return

        totalEntries += 1

        const rawReferences = entry.comments?.reference?.split("\n") ?? []
        const references = rawReferences.map((reference) => reference.trim()).filter(Boolean)
        const recordReferences = references.filter(isRecordContext)
        const recordContextKey =
          (isRecordContext(entry.msgctxt) ? entry.msgctxt || "" : undefined) ?? recordReferences[0]

        if (recordContextKey) {
          const entryKey = `${recordContextKey}::${entry.msgid || ""}`
          if (entryMap.has(entryKey)) {
            addIssue({
              type: "duplicate",
              msgid: entry.msgid || "",
              msgctxt: entry.msgctxt,
              details: "This issue can be caused by duplicates entries who are referring to the same field.",
            })
          } else {
            entryMap.set(entryKey, { msgid: entry.msgid || "", msgctxt: entry.msgctxt })
          }
        }

        const msgstrValues = Array.isArray(entry.msgstr) ? entry.msgstr : []
        const hasTranslation = msgstrValues.some((val) => val && val.trim().length > 0)

        if (!hasTranslation) {
          addIssue({
            type: "missing",
            msgid: entry.msgid || "",
            msgctxt: entry.msgctxt,
            details: "Missing translation (msgstr is empty)",
          })
        } else {
          translated += 1
        }

        const sourcePlaceholders = (entry.msgid || "").match(placeholderRegex) || []
        const targetPlaceholders = msgstrValues.join("\n").match(placeholderRegex) || []

        const normalize = (arr: string[]) => arr.sort().join("|")
        if (normalize(sourcePlaceholders) !== normalize(targetPlaceholders)) {
          addIssue({
            type: "placeholder",
            msgid: entry.msgid || "",
            msgctxt: entry.msgctxt,
            details: "Placeholder mismatch between msgid and msgstr",
          })
        }

        recordReferences.forEach((reference) => {
          const previous = referenceMap.get(reference)
          if (previous) {
            addIssue({
              type: "duplicateReference",
              msgid: entry.msgid || "",
              msgctxt: entry.msgctxt,
              details: `Reference "${reference}" already used by msgid "${previous.msgid}"`,
            })
          } else {
            referenceMap.set(reference, { msgid: entry.msgid || "", msgctxt: entry.msgctxt })
          }
        })
      })
    })

    const sortedIssues = issues.sort((a, b) => issuePriority[a.type] - issuePriority[b.type])

    return NextResponse.json({
      stats: {
        totalEntries,
        translated,
        missing: totalEntries - translated,
        duplicates: duplicateCount,
      },
      issues: sortedIssues,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 },
    )
  }
}
