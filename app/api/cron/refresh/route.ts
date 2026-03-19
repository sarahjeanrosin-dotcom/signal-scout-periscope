import { createAdminClient } from '@/lib/supabase/admin'
import { extractCompanyFeatures } from '@/lib/ai'
import { NextResponse } from 'next/server'

// Weekly cron job — refreshes all companies whose last_refreshed_at is > 7 days ago
// Called by Vercel Cron or any scheduler with Authorization: Bearer <SERVICE_ROLE_KEY>
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, website')
    .lt('last_refreshed_at', oneWeekAgo)

  if (!companies?.length) {
    return NextResponse.json({ refreshed: 0 })
  }

  let refreshed = 0
  const errors: string[] = []

  for (const company of companies) {
    try {
      const { features } = await extractCompanyFeatures(company.name, company.website)

      // Snapshot current features before updating
      const { data: currentFeatures } = await supabase
        .from('company_features')
        .select('*')
        .eq('company_id', company.id)

      await supabase.from('feature_snapshots').insert({
        company_id: company.id,
        features: currentFeatures ?? [],
        triggered_by: 'scheduled',
      })

      // Replace AI-generated features
      await supabase.from('company_features').delete().eq('company_id', company.id).eq('source', 'ai')
      await supabase.from('company_features').insert(
        features.map(f => ({
          company_id: company.id,
          feature_name: f.feature_name,
          description: f.description,
          rating: f.rating,
          rating_rationale: f.rating_rationale,
          source: 'ai',
        }))
      )

      await supabase.from('companies').update({ last_refreshed_at: new Date().toISOString() }).eq('id', company.id)
      refreshed++
    } catch (err) {
      errors.push(`${company.name}: ${err}`)
    }
  }

  return NextResponse.json({ refreshed, errors })
}
