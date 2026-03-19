import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { primary_company_id, competitor_ids, comparison_name, context } = await request.json()

  if (!primary_company_id || !competitor_ids?.length) {
    return NextResponse.json({ error: 'Primary company and at least one competitor required' }, { status: 400 })
  }

  const { data: primaryCompany } = await supabase
    .from('companies')
    .select('name')
    .eq('id', primary_company_id)
    .eq('user_id', user.id)
    .single()

  if (!primaryCompany) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { data: competitorRows } = await supabase
    .from('companies')
    .select('name')
    .in('id', competitor_ids)
    .eq('user_id', user.id)

  const name = comparison_name ||
    `${primaryCompany.name} vs ${(competitorRows ?? []).map(c => c.name).join(', ')}`

  const { data: comparison, error: insertError } = await supabase
    .from('comparisons')
    .insert({
      user_id: user.id,
      primary_company_id,
      name,
      competitor_company_ids: competitor_ids,
      report_data: { status: 'pending', ...(context ? { context } : {}) },
    })
    .select()
    .single()

  if (insertError || !comparison) {
    return NextResponse.json({ error: insertError?.message ?? 'Failed to create comparison' }, { status: 500 })
  }

  return NextResponse.json({ comparison_id: comparison.id })
}
