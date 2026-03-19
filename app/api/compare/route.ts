import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateComparisonReport } from '@/lib/ai'
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

  // Insert a pending record immediately so the user can be redirected right away
  const { data: comparison, error: insertError } = await supabase
    .from('comparisons')
    .insert({
      user_id: user.id,
      primary_company_id,
      name: comparison_name || `${primaryCompany.name} vs ${competitorData.map(c => c.name).join(', ')}`,
      competitor_company_ids: competitor_ids,
      report_data: { status: 'pending' },
    })
    .select()
    .single()

  if (insertError || !comparison) {
    return NextResponse.json({ error: insertError?.message ?? 'Failed to create comparison' }, { status: 500 })
  }

  // Generate the report in the background after the response is sent
  after(async () => {
    try {
      const report = await generateComparisonReport(
        { name: primaryCompany.name, features: primaryCompany.company_features },
        competitorData
      )
      await supabase
        .from('comparisons')
        .update({ report_data: { status: 'complete', ...report } })
        .eq('id', comparison.id)
    } catch (err) {
      await supabase
        .from('comparisons')
        .update({ report_data: { status: 'error', error: String(err) } })
        .eq('id', comparison.id)
    }
  })

  return NextResponse.json({ comparison_id: comparison.id })
}
