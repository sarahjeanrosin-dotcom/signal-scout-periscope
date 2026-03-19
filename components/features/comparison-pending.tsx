'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function ComparisonPending({ comparisonId }: { comparisonId: string }) {
  const router = useRouter()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    // Poll every 4 seconds as a fallback in case the generate call stalls
    const poll = setInterval(() => router.refresh(), 4000)

    // Kick off the long-running AI generation from the browser — this keeps
    // the HTTP connection alive for as long as the AI needs, with no timeout
    fetch(`/api/compare/${comparisonId}/generate`, { method: 'POST' })
      .then(() => router.refresh())
      .catch(() => router.refresh())
      .finally(() => clearInterval(poll))

    return () => clearInterval(poll)
  }, [comparisonId, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
      <div>
        <p className="text-slate-800 font-semibold text-lg">Generating comparison report…</p>
        <p className="text-slate-400 text-sm mt-1">
          This takes 30–60 seconds for multiple companies. The page will update automatically.
        </p>
      </div>
    </div>
  )
}
