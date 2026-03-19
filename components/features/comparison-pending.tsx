'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function ComparisonPending({ comparisonId }: { comparisonId: string }) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 3000)
    return () => clearInterval(interval)
  }, [router])

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
