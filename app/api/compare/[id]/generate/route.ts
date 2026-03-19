import { createClient } from '@/lib/supabase/server'
import { generateComparisonReport } from '@/lib/ai'
import { NextResponse } from 'next/server'
import { after } from 'next/server'

export const maxDuration = 300

export async function POST(
  _request: Request,
  ctx: RouteContext<'/api/compare/[id]/generate'>
) {
  const { id } = await ctx.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the comparison belongs to this user
  const { data: comparison } = await supabase
    .from('comparisons')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!comparison) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Already done or already in-flight — nothing to do
  if (comparison.report_data?.status === 'complete' ||
      comparison.report_data?.status === 'generating') {
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

  // Mark as generating so concurrent retries don't spawn duplicate jobs
  await supabase
    .from('comparisons')
    .update({ report_data: { ...comparison.report_data, status: 'generating' } })
    .eq('id', id)

  const competitorData = (competitorRows ?? []).map(c => ({
    name: c.name,
    features: c.company_features,
  }))

  const context = typeof comparison.report_data?.context === 'string'
    ? comparison.report_data.context
    : undefined

  // Run the AI work after the response is sent so the HTTP connection stays
  // short and isn't killed by a platform function timeout.
  after(async () => {
    try {
      const report = await generateComparisonReport(
        { name: primaryCompany.name, features: primaryCompany.company_features },
        competitorData,
        context
      )

      await supabase
        .from('comparisons')
        .update({ report_data: { status: 'complete', ...report } })
        .eq('id', id)
    } catch (err) {
      await supabase
        .from('comparisons')
        .update({ report_data: { status: 'error', error: String(err) } })
        .eq('id', id)
    }
  })

  return NextResponse.json({ ok: true })
}
