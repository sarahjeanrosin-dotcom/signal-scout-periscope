import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Nav } from '@/components/nav'
import { CompanyDetail } from '@/components/features/company-detail'

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: company }, { data: features }, { data: competitors }, { data: snapshots }] =
    await Promise.all([
      supabase.from('companies').select('*').eq('id', id).single(),
      supabase.from('company_features').select('*').eq('company_id', id).order('feature_name'),
      supabase.from('competitors').select('*').eq('company_id', id).order('created_at'),
      supabase
        .from('feature_snapshots')
        .select('id, snapshot_date, triggered_by')
        .eq('company_id', id)
        .order('snapshot_date', { ascending: false })
        .limit(10),
    ])

  if (!company) notFound()

  return (
    <div className="min-h-screen">
      <Nav />
      <CompanyDetail
        company={company}
        initialFeatures={features ?? []}
        initialCompetitors={competitors ?? []}
        snapshots={snapshots ?? []}
      />
    </div>
  )
}
