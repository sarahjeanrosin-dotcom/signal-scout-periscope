import { createClient } from '@/lib/supabase/server'
import { generateComparisonReport } from '@/lib/ai'
import { NextResponse } from 'next/server'

export const maxDuration = 300

export async function POST(
  _request: Request,
  ctx: RouteContext<'/api/compare/[id]/generate'>
) {
  const { id } = await ctx.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the comparison belongs to this user and is still pending
  const { data: comparison } = await supabase
    .from('comparisons')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!comparison) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If already complete, nothing to do
  if (comparison.report_data?.status === 'complete') {
    return NextResponse.json({ ok: true })
  }

  const { primary_company_id, competitor_company_ids } = comparison

  // Fetch all data in one batch
  const [{ data: primaryCompany }, { data: competitorRows }] = await Promise.all([
    supabase
      .from('companies')
      .select('*, company_features(*)')
      .eq('id', primary_company_id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('companies')
      .select('*, company_features(*)')
      .in('id', competitor_company_ids)
      .eq('user_id', user.id),
  ])

  if (!primaryCompany) {
    return NextResponse.json({ error: 'Primary company not found' }, { status: 404 })
  }

  const competitorData = (competitorRows ?? []).map(c => ({
    name: c.name,
    features: c.company_features,
  }))

  try {
    const context = typeof comparison.report_data?.context === 'string'
      ? comparison.report_data.context
      : undefined

    const report = await generateComparisonReport(
      { name: primaryCompany.name, features: primaryCompany.company_features },
      competitorData,
      context
    )

    await supabase
      .from('comparisons')
      .update({ report_data: { status: 'complete', ...report } })
      .eq('id', id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    await supabase
      .from('comparisons')
      .update({ report_data: { status: 'error', error: String(err) } })
      .eq('id', id)

    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
