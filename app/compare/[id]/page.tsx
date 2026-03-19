import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Nav } from '@/components/nav'
import { ComparisonDashboard } from '@/components/features/comparison-dashboard'

export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: comparison } = await supabase
    .from('comparisons')
    .select('*')
    .eq('id', id)
    .single()

  if (!comparison) notFound()

  return (
    <div className="min-h-screen">
      <Nav />
      <ComparisonDashboard comparison={comparison} />
    </div>
  )
}
