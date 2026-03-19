import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Nav } from '@/components/nav'
import { ComparisonDashboard } from '@/components/features/comparison-dashboard'
import { ComparisonPending } from '@/components/features/comparison-pending'
import type { ReportData } from '@/lib/types'

export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: comparison } = await supabase
    .from('comparisons')
    .select('*')
    .eq('id', id)
    .single()

  if (!comparison) notFound()

  const report = comparison.report_data as ReportData

  return (
    <div className="min-h-screen">
      <Nav />
      {report.status === 'pending' && (
        <ComparisonPending comparisonId={id} />
      )}
      {report.status === 'error' && (
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-red-600 font-semibold text-lg">Comparison failed</p>
          <p className="text-slate-500 text-sm mt-2">{report.error}</p>
        </div>
      )}
      {report.status === 'complete' && (
        <ComparisonDashboard comparison={comparison} />
      )}
    </div>
  )
}
