export interface SavedConnection {
  id: string
  name: string
  url: string
  db: string
  username: string
  password: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "odootools_connections"

export function getSavedConnections(): SavedConnection[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveConnection(connection: Omit<SavedConnection, "id" | "createdAt" | "updatedAt">): SavedConnection {
  const connections = getSavedConnections()
  const now = new Date().toISOString()

  const newConnection: SavedConnection = {
    ...connection,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }

  connections.push(newConnection)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connections))

  return newConnection
}

export function updateConnection(id: string, updates: Partial<Omit<SavedConnection, "id" | "createdAt">>): void {
  const connections = getSavedConnections()
  const index = connections.findIndex((c) => c.id === id)

  if (index !== -1) {
    connections[index] = {
      ...connections[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connections))
  }
}

export function deleteConnection(id: string): void {
  const connections = getSavedConnections()
  const filtered = connections.filter((c) => c.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export function getConnection(id: string): SavedConnection | undefined {
  const connections = getSavedConnections()
  return connections.find((c) => c.id === id)
}
