import { useState, useEffect, useCallback } from 'react'

export interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  isActive: boolean
  secret?: string
  createdAt: string
  lastTriggered?: string
  successRate?: number
}

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWebhooks = useCallback(async () => {
    setLoading(true)
    try {
      // Mock data for now
      setWebhooks([
        {
          id: 'wh-1',
          name: 'GitHub Push',
          url: 'https://api.example.com/webhooks/github',
          events: ['push', 'pull_request'],
          isActive: true,
          createdAt: '2026-05-20',
          lastTriggered: '2026-05-24 14:30',
          successRate: 98,
        },
      ])
    } catch (e) {
      setError('Failed to fetch webhooks')
    } finally {
      setLoading(false)
    }
  }, [])

  const createWebhook = useCallback(async (data: Partial<Webhook>) => {
    const newWebhook: Webhook = {
      id: `wh-${Date.now()}`,
      name: data.name || 'New Webhook',
      url: data.url || '',
      events: data.events || [],
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      ...data,
    } as Webhook
    setWebhooks((prev) => [...prev, newWebhook])
    return newWebhook
  }, [])

  const updateWebhook = useCallback(async (id: string, data: Partial<Webhook>) => {
    setWebhooks((prev) =>
      prev.map((wh) => (wh.id === id ? { ...wh, ...data } : wh))
    )
  }, [])

  const deleteWebhook = useCallback(async (id: string) => {
    setWebhooks((prev) => prev.filter((wh) => wh.id !== id))
  }, [])

  const toggleWebhook = useCallback(async (id: string) => {
    setWebhooks((prev) =>
      prev.map((wh) =>
        wh.id === id ? { ...wh, isActive: !wh.isActive } : wh
      )
    )
  }, [])

  const testWebhook = useCallback(async (id: string) => {
    // Mock test - simulate a successful test
    return new Promise<{ success: boolean; message: string }>((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Webhook test successful (200 OK)' })
      }, 1000)
    })
  }, [])

  useEffect(() => {
    fetchWebhooks()
  }, [fetchWebhooks])

  return {
    webhooks,
    loading,
    error,
    refetch: fetchWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    toggleWebhook,
    testWebhook,
  }
}

// Aliases for WebhooksPage.tsx compatibility
export { useWebhooks as useWebhookDeliveries }
export type { Webhook }
