"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface OdooConnection {
  id: string
  name: string
  url: string
  db: string
  username: string
  password: string
  createdAt: string
}

interface ConnectionsContextType {
  connections: OdooConnection[]
  addConnection: (connection: Omit<OdooConnection, "id" | "createdAt">) => void
  updateConnection: (id: string, connection: Omit<OdooConnection, "id" | "createdAt">) => void
  deleteConnection: (id: string) => void
  getConnection: (id: string) => OdooConnection | undefined
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined)

const STORAGE_KEY = "odootools_connections"

export function ConnectionsProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<OdooConnection[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load connections from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setConnections(JSON.parse(stored))
      } catch (error) {
        console.error("Failed to load connections:", error)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save connections to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(connections))
    }
  }, [connections, isLoaded])

  const addConnection = (connection: Omit<OdooConnection, "id" | "createdAt">) => {
    const newConnection: OdooConnection = {
      ...connection,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    setConnections((prev) => [...prev, newConnection])
  }

  const updateConnection = (id: string, connection: Omit<OdooConnection, "id" | "createdAt">) => {
    setConnections((prev) =>
      prev.map((conn) =>
        conn.id === id
          ? {
              ...connection,
              id: conn.id,
              createdAt: conn.createdAt,
            }
          : conn,
      ),
    )
  }

  const deleteConnection = (id: string) => {
    setConnections((prev) => prev.filter((conn) => conn.id !== id))
  }

  const getConnection = (id: string) => {
    return connections.find((conn) => conn.id === id)
  }

  return (
    <ConnectionsContext.Provider
      value={{
        connections,
        addConnection,
        updateConnection,
        deleteConnection,
        getConnection,
      }}
    >
      {children}
    </ConnectionsContext.Provider>
  )
}

export function useConnections() {
  const context = useContext(ConnectionsContext)
  if (context === undefined) {
    throw new Error("useConnections must be used within a ConnectionsProvider")
  }
  return context
}
