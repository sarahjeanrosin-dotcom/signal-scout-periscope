import { createClient } from '@/lib/supabase/server'
import { extractCompanyFeatures } from '@/lib/ai'
import { NextResponse } from 'next/server'

// Given a competitor name, create a full company record for it (for comparison)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { competitor_name, competitor_website } = await request.json()
  if (!competitor_name) return NextResponse.json({ error: 'competitor_name required' }, { status: 400 })

  // Check if we already have this company tracked
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .ilike('name', competitor_name)
    .single()

  if (existing) {
    // Link the competitor record to the existing company
    await supabase
      .from('competitors')
      .update({ competitor_company_id: existing.id, is_selected: true })
      .eq('company_id', id)
      .ilike('competitor_name', competitor_name)

    return NextResponse.json({ company_id: existing.id, existing: true })
  }

  // Create new company record for this competitor
  const { features, industry, description } = await extractCompanyFeatures(competitor_name, competitor_website)

  const { data: newCompany, error: companyError } = await supabase
    .from('companies')
    .insert({ user_id: user.id, name: competitor_name, website: competitor_website || null, industry, description })
    .select()
    .single()

  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 })

  if (features.length > 0) {
    await supabase.from('company_features').insert(
      features.map(f => ({
        company_id: newCompany.id,
        feature_name: f.feature_name,
        description: f.description,
        rating: f.rating,
        rating_rationale: f.rating_rationale,
        sources: f.sources ?? [],
        source: 'ai',
      }))
    )
  }

  // Save initial snapshot
  await supabase.from('feature_snapshots').insert({
    company_id: newCompany.id,
    features,
    triggered_by: 'manual',
  })

  // Link competitor record
  await supabase
    .from('competitors')
    .update({ competitor_company_id: newCompany.id, is_selected: true })
    .eq('company_id', id)
    .ilike('competitor_name', competitor_name)

  return NextResponse.json({ company_id: newCompany.id, existing: false })
}
