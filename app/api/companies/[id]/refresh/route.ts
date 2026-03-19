import { createClient } from '@/lib/supabase/server'
import { extractCompanyFeatures } from '@/lib/ai'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { features } = await extractCompanyFeatures(company.name, company.website)

  // Save snapshot before overwriting
  const { data: existingFeatures } = await supabase
    .from('company_features')
    .select('*')
    .eq('company_id', id)

  await supabase.from('feature_snapshots').insert({
    company_id: id,
    features: existingFeatures ?? [],
    triggered_by: 'manual',
  })

  // Remove old AI-generated features and replace
  await supabase.from('company_features').delete().eq('company_id', id).eq('source', 'ai')
  await supabase.from('company_features').insert(
    features.map(f => ({
      company_id: id,
      feature_name: f.feature_name,
      description: f.description,
      rating: f.rating,
      rating_rationale: f.rating_rationale,
      source: 'ai',
    }))
  )

  await supabase.from('companies').update({ last_refreshed_at: new Date().toISOString() }).eq('id', id)

  return NextResponse.json({ success: true, featuresCount: features.length })
}
