import { useState, useEffect, useCallback } from 'react'

export interface ScheduledTask {
  id: string
  name: string
  cron: string
  command: string
  isActive: boolean
  lastRun?: string
  nextRun?: string
  status: 'idle' | 'running' | 'failed' | 'success'
}

export function useScheduler() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    // Mock data
    setTasks([
      {
        id: 'sch-1',
        name: 'Daily Backup',
        cron: '0 2 * * *',
        command: 'backup.sh',
        isActive: true,
        lastRun: '2026-05-24 02:00',
        nextRun: '2026-05-25 02:00',
        status: 'success',
      },
      {
        id: 'sch-2',
        name: 'Health Check',
        cron: '*/30 * * * *',
        command: 'health-check.py',
        isActive: true,
        lastRun: '2026-05-24 14:30',
        nextRun: '2026-05-24 15:00',
        status: 'idle',
      },
    ])
    setLoading(false)
  }, [])

  const createTask = useCallback(async (data: Partial<ScheduledTask>) => {
    const newTask: ScheduledTask = {
      id: `sch-${Date.now()}`,
      name: data.name || 'New Task',
      cron: data.cron || '0 0 * * *',
      command: data.command || '',
      isActive: true,
      status: 'idle',
      ...data,
    } as ScheduledTask
    setTasks((prev) => [...prev, newTask])
    return newTask
  }, [])

  const updateTask = useCallback(async (id: string, data: Partial<ScheduledTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toggleTask = useCallback(async (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    )
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, loading, refetch: fetchTasks, createTask, updateTask, deleteTask, toggleTask }
}

// Aliases for SchedulerPage.tsx compatibility
export { useScheduler as useSchedulerTasks }
export { useScheduler as useTaskHistory }
