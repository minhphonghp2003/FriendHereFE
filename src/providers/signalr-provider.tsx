"use client"

import { useEffect, useState } from "react"
import { appHub } from "@/lib/signalr/app-hub"

export function SignalRProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let mounted = true

    const connect = async () => {
      try {
        await appHub.start()
        if (mounted) {
          setIsConnected(true)
          console.log("[SignalRProvider] Connected")
        }
      } catch (error) {
        console.error("[SignalRProvider] Connection failed:", error)
        if (mounted) {
          // Retry connection after delay
          setTimeout(connect, 5000)
        }
      }
    }

    connect()

    return () => {
      mounted = false
      appHub.stop()
    }
  }, [])

  return <>{children}</>
}