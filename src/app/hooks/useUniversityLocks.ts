'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

export function useUniversityLocks() {
  const [lockedUniversityIds, setLockedUniversityIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchLocks = useCallback(async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLockedUniversityIds([])
        return
      }

      const { data, error } = await supabase
        .from('user_university_locks')
        .select('university_id')
        .eq('user_id', user.id)
        .eq('status', 'locked')

      if (error) throw error

      setLockedUniversityIds(data.map(l => l.university_id))
    } catch (err) {
      console.error('Failed to load university locks', err)
      setLockedUniversityIds([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLocks()

    // 🔥 Listen for lock/unlock events
    const handler = () => fetchLocks()
    window.addEventListener('university-lock-changed', handler)

    return () => {
      window.removeEventListener('university-lock-changed', handler)
    }
  }, [fetchLocks])

  return {
    lockedUniversityIds,
    hasLockedUniversities: lockedUniversityIds.length > 0,
    isLoading,
    refresh: fetchLocks,
  }
}
