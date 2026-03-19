import { createClient } from '@/lib/supabase/server'
import { extractCompanyFeatures, generateComparisonReport } from '@/lib/ai'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { primary_company_id, competitor_ids, comparison_name } = await request.json()

  if (!primary_company_id || !competitor_ids?.length) {
    return NextResponse.json({ error: 'Primary company and at least one competitor required' }, { status: 400 })
  }

  // Fetch primary company + features
  const { data: primaryCompany } = await supabase
    .from('companies')
    .select('*, company_features(*)')
    .eq('id', primary_company_id)
    .eq('user_id', user.id)
    .single()

  if (!primaryCompany) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  // Fetch competitor companies in a single batch query
  const { data: competitorRows } = await supabase
    .from('companies')
    .select('*, company_features(*)')
    .in('id', competitor_ids)
    .eq('user_id', user.id)

  const competitorData = (competitorRows ?? []).map(comp => ({
    name: comp.name,
    features: comp.company_features,
  }))

  if (competitorData.length === 0) {
    return NextResponse.json({ error: 'No valid competitor companies found' }, { status: 400 })
  }

  // Generate the report
  const report = await generateComparisonReport(
    { name: primaryCompany.name, features: primaryCompany.company_features },
    competitorData
  )

  // Save the comparison
  const { data: comparison, error } = await supabase
    .from('comparisons')
    .insert({
      user_id: user.id,
      primary_company_id,
      name: comparison_name || `${primaryCompany.name} vs ${competitorData.map(c => c.name).join(', ')}`,
      competitor_company_ids: competitor_ids,
      report_data: report,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comparison_id: comparison.id })
}
