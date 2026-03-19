import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Rating } from '@/lib/types'

// Add a user-defined feature
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company_id, feature_name, description, rating } = await request.json()

  if (!company_id || !feature_name || !rating) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify company belongs to user
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('id', company_id)
    .eq('user_id', user.id)
    .single()

  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('company_features')
    .insert({ company_id, feature_name, description, rating, source: 'user', is_user_added: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Update a feature rating
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, rating, description } = await request.json()
  if (!id) return NextResponse.json({ error: 'Feature id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('company_features')
    .update({ rating, description })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Delete a feature
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Feature id required' }, { status: 400 })

  const { error } = await supabase.from('company_features').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
