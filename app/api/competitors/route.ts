import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Toggle competitor selection
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, is_selected } = await request.json()

  const { data, error } = await supabase
    .from('competitors')
    .update({ is_selected })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Add a user-defined competitor
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company_id, competitor_name } = await request.json()
  if (!company_id || !competitor_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('id', company_id)
    .eq('user_id', user.id)
    .single()

  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('competitors')
    .insert({ company_id, competitor_name, is_user_added: true, is_selected: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Delete a competitor
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Competitor id required' }, { status: 400 })

  const { error } = await supabase.from('competitors').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
