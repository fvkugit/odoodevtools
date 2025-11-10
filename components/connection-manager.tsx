"use client"

import { useState } from "react"
import { useConnections } from "@/lib/connections-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Database, Edit, Plus, Trash2, Eye, EyeOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function ConnectionManager() {
  const { connections, addConnection, updateConnection, deleteConnection } = useConnections()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    db: "",
    username: "",
    password: "",
  })

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      db: "",
      username: "",
      password: "",
    })
  }

  const handleAdd = () => {
    if (!formData.name || !formData.url || !formData.db || !formData.username || !formData.password) {
      return
    }

    addConnection({
      name: formData.name.trim(),
      url: formData.url.trim(),
      db: formData.db.trim(),
      username: formData.username.trim(),
      password: formData.password.trim(),
    })
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEdit = (id: string) => {
    const connection = connections.find((c) => c.id === id)
    if (connection) {
      setFormData({
        name: connection.name,
        url: connection.url,
        db: connection.db,
        username: connection.username,
        password: connection.password,
      })
      setEditingId(id)
    }
  }

  const handleUpdate = () => {
    if (!editingId || !formData.name || !formData.url || !formData.db || !formData.username || !formData.password) {
      return
    }

    updateConnection(editingId, {
      name: formData.name.trim(),
      url: formData.url.trim(),
      db: formData.db.trim(),
      username: formData.username.trim(),
      password: formData.password.trim(),
    })
    resetForm()
    setEditingId(null)
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteConnection(deleteId)
      setDeleteId(null)
    }
  }

  const togglePasswordVisibility = (id: string) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Saved Connections</h2>
          <p className="text-muted-foreground">Manage your Odoo server connections</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Connection</DialogTitle>
              <DialogDescription>Enter the details for your Odoo server connection</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Connection Name</Label>
                <Input
                  id="add-name"
                  placeholder="Production Server"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-url">Server URL</Label>
                  <Input
                    id="add-url"
                    placeholder="https://your-server.odoo.com"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-db">Database</Label>
                  <Input
                    id="add-db"
                    placeholder="production"
                    value={formData.db}
                    onChange={(e) => setFormData({ ...formData, db: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-username">Username</Label>
                  <Input
                    id="add-username"
                    placeholder="admin"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-password">Password</Label>
                  <Input
                    id="add-password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full">
                Add Connection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {connections.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No connections saved</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first Odoo server connection to get started
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map((conn) => (
            <Card key={conn.id} className="border-border bg-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      {conn.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Added {new Date(conn.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(conn.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(conn.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Server</p>
                  <p className="text-sm font-mono text-foreground break-all">{conn.url}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Database</p>
                    <Badge variant="outline" className="font-mono">
                      {conn.db}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Username</p>
                    <Badge variant="outline" className="font-mono">
                      {conn.username}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Password</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-foreground">
                      {showPassword[conn.id] ? conn.password : "••••••••"}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => togglePasswordVisibility(conn.id)}
                    >
                      {showPassword[conn.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
            <DialogDescription>Update the details for this connection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Connection Name</Label>
              <Input
                id="edit-name"
                placeholder="Production Server"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-url">Server URL</Label>
                <Input
                  id="edit-url"
                  placeholder="https://your-server.odoo.com"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-db">Database</Label>
                <Input
                  id="edit-db"
                  placeholder="production"
                  value={formData.db}
                  onChange={(e) => setFormData({ ...formData, db: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  placeholder="admin"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Password</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleUpdate} className="w-full">
              Update Connection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this connection? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
