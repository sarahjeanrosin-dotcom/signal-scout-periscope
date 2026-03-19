import { createClient } from '@/lib/supabase/server'
import { extractCompanyFeatures, discoverCompetitors } from '@/lib/ai'
import { NextResponse, after } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, website } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  }

  try {
    // 1. Extract features from AI
    const { features, industry, description } = await extractCompanyFeatures(name.trim(), website)

    // 2. Create company record
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ user_id: user.id, name: name.trim(), website: website || null, industry, description })
      .select()
      .single()

    if (companyError) throw companyError

    // 3. Insert features + snapshot in parallel
    const featureRows = features.map(f => ({
      company_id: company.id,
      feature_name: f.feature_name,
      description: f.description,
      rating: f.rating,
      rating_rationale: f.rating_rationale,
      source: 'ai',
    }))
    await Promise.all([
      features.length > 0 ? supabase.from('company_features').insert(featureRows) : Promise.resolve(),
      supabase.from('feature_snapshots').insert({ company_id: company.id, features, triggered_by: 'manual' }),
    ])

    // 4. Discover competitors after response is sent
    const companyId = company.id
    after(async () => {
      try {
        const discovered = await discoverCompetitors(name.trim(), industry)
        if (discovered.length > 0) {
          await supabase.from('competitors').insert(
            discovered.map(c => ({
              company_id: companyId,
              competitor_name: c.name,
              is_user_added: false,
              is_selected: false,
            }))
          )
        }
      } catch (err) {
        console.error('Error discovering competitors:', err)
      }
    })

    return NextResponse.json({ company, featuresCount: features.length })
  } catch (err) {
    console.error('Error creating company:', err)
    return NextResponse.json({ error: 'Failed to analyze company. Please try again.' }, { status: 500 })
  }
}
