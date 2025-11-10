"use client"

import Link from "next/link"
import { Database, GitCompare, Package, Shield, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "@/lib/language-context"

export default function Home() {
  const { t } = useTranslations()

  const tools = [
    {
      title: t("home.tools.sql.title", "SQL Query Executor"),
      description: t(
        "home.tools.sql.description",
        "Execute SQL queries on remote Odoo servers via JSON-RPC with automatic cleanup and rollback support.",
      ),
      icon: Database,
      href: "/sql-executor",
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
    {
      title: t("home.tools.modules.title", "Module Manager"),
      description: t(
        "home.tools.modules.description",
        "View installed modules and compare module versions between different Odoo environments.",
      ),
      icon: Package,
      href: "/module-manager",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: t("home.tools.domain.title", "Domain Counter"),
      description: t(
        "home.tools.domain.description",
        "Test Odoo domains and count matching records. Perfect for debugging search domains before implementation.",
      ),
      icon: Database,
      href: "/domain-counter",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: t("home.tools.rights.title", "Access Rights Checker"),
      description: t(
        "home.tools.rights.description",
        "Verify user permissions and see which models a specific user has access to in the system.",
      ),
      icon: Shield,
      href: "/access-rights",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: t("home.tools.groups.title", "Group Insight"),
      description: t(
        "home.tools.groups.description",
        "Visualize a user's group membership, inherited permissions, and granted model access.",
      ),
      icon: Users,
      href: "/group-insight",
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: t("home.tools.compare.title", "Access Rights Comparator"),
      description: t(
        "home.tools.compare.description",
        "Compare two users and pinpoint the models where their permissions differ.",
      ),
      icon: GitCompare,
      href: "/access-rights-comparator",
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
    },
  ]

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
                <p className="text-xs text-muted-foreground">{t("home.tagline", "Developer utilities for Odoo")}</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-balance">{t("home.title")}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">{t("home.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tools.map((tool) => (
            <Link disabled="1" key={tool.href} href={tool.href}>
              <Card className="border-border bg-card hover:border-primary/50 transition-all duration-200 h-full group">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${tool.bgColor} flex items-center justify-center mb-4`}>
                    <tool.icon className={`h-6 w-6 ${tool.color}`} />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">{tool.title}</CardTitle>
                  <CardDescription className="text-pretty">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm text-primary font-medium">{t("home.launch", "Launch tool →")}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">{t("home.footer")}</p>
        </div>
      </footer>
    </div>
  )
}
