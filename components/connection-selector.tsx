"use client"

import { useMemo, useState } from "react"
import { useConnections } from "@/lib/connections-context"
import { useTranslations } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Eye, EyeOff, Save, Settings2, Trash2 } from "lucide-react"

interface ConnectionSelectorProps {
  value: {
    url: string
    db: string
    username: string
    password: string
  }
  onChange: (connection: { url: string; db: string; username: string; password: string }) => void
  disabled?: boolean
  label?: string
}

function getHostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function ConnectionSelector({ value, onChange, disabled, label }: ConnectionSelectorProps) {
  const { t } = useTranslations()
  const { connections, addConnection, deleteConnection } = useConnections()
  const [selectedId, setSelectedId] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [connectionName, setConnectionName] = useState("")
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const handleSelectConnection = (id: string) => {
    setSelectedId(id)
    const connection = connections.find((c) => c.id === id)
    if (connection) {
      onChange({
        url: connection.url,
        db: connection.db,
        username: connection.username,
        password: connection.password,
      })
    }
  }

  const handleSaveConnection = () => {
    if (!connectionName.trim()) return

    addConnection({
      name: connectionName,
      url: value.url,
      db: value.db,
      username: value.username,
      password: value.password,
    })

    setConnectionName("")
    setShowSaveDialog(false)
  }

  const canSave = value.url && value.db && value.username && value.password

  const connectionPendingDeletion = useMemo(
    () => (deleteTargetId ? connections.find((connection) => connection.id === deleteTargetId) : null),
    [deleteTargetId, connections],
  )

  const confirmDeleteConnection = () => {
    if (deleteTargetId) {
      deleteConnection(deleteTargetId)
      if (selectedId === deleteTargetId) {
        setSelectedId("")
      }
      setDeleteTargetId(null)
    }
  }

  const resolvedLabel = label ?? t("connection.selector.title", "Connection")

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {resolvedLabel}
              </CardTitle>
              <CardDescription>{t("connection.selector.description")}</CardDescription>
            </div>
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!canSave || disabled}>
                  <Save className="mr-2 h-4 w-4" />
                  {t("connection.selector.saveButton")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("connection.selector.saveDialogTitle")}</DialogTitle>
                  <DialogDescription>{t("connection.selector.saveDialogDescription")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="connection-name">{t("connection.selector.connectionName")}</Label>
                    <Input
                      id="connection-name"
                      placeholder={t("connection.selector.connectionNamePlaceholder")}
                      value={connectionName}
                      onChange={(e) => setConnectionName(e.target.value)}
                      onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveConnection()
                      }
                    }}
                  />
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>URL:</strong> {value.url}
                  </p>
                  <p>
                    <strong>Database:</strong> {value.db}
                  </p>
                  <p>
                    <strong>Username:</strong> {value.username}
                  </p>
                </div>
                <Button onClick={handleSaveConnection} disabled={!connectionName.trim()} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {t("connection.selector.saveButton")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.length > 0 && (
          <div className="space-y-2">
            <Label>{t("connection.selector.savedConnections")}</Label>
            <div className="flex items-center gap-2">
              <Select value={selectedId} onValueChange={handleSelectConnection} disabled={disabled}>
                <SelectTrigger>
                  <SelectValue placeholder={t("connection.selector.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{conn.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {conn.db} @ {getHostnameFromUrl(conn.url)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                disabled={!selectedId || disabled}
                onClick={() => setDeleteTargetId(selectedId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("connection.selector.deleteHint")}</p>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t("connection.selector.dividerLabel")}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="url">{t("connection.selector.url")}</Label>
            <Input
              id="url"
              placeholder={t("connection.selector.urlPlaceholder")}
              value={value.url}
              onChange={(e) => onChange({ ...value, url: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="db">{t("connection.selector.db")}</Label>
            <Input
              id="db"
              placeholder={t("connection.selector.dbPlaceholder")}
              value={value.db}
              onChange={(e) => onChange({ ...value, db: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">{t("connection.selector.username")}</Label>
            <Input
              id="username"
              placeholder={t("connection.selector.usernamePlaceholder")}
              value={value.username}
              onChange={(e) => onChange({ ...value, username: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("connection.selector.password")}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={value.password}
                onChange={(e) => onChange({ ...value, password: e.target.value })}
                disabled={disabled}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("connection.selector.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {connectionPendingDeletion ? (
                <>
                  {t("connection.selector.deleteDescription")}{" "}
                  <strong>{connectionPendingDeletion.name}</strong> ({connectionPendingDeletion.db}@
                  {getHostnameFromUrl(connectionPendingDeletion.url)}).
                </>
              ) : (
                t("connection.selector.deleteDescription")
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTargetId(null)}>
              {t("connection.selector.deleteCancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteConnection} className="bg-destructive hover:bg-destructive/90">
              {t("connection.selector.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
