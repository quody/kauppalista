import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const includePaused = searchParams.get('include_paused') === 'true'
  const includeCrossed = searchParams.get('include_crossed') === 'true'

  let query = supabase
    .from('food_items')
    .select(`*, category:categories(*)`)
    .order('created_at', { ascending: false })

  if (type === 'recurring') query = query.eq('is_recurring', true)
  if (type === 'one_off') query = query.eq('is_recurring', false)
  if (!includeCrossed) query = query.eq('crossed_out', false)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
  }

  const now = Date.now()
  const items = (data || []).filter(item => {
    if (includePaused) return true
    const paused = item.paused_until && new Date(item.paused_until).getTime() > now
    return !paused
  })

  return NextResponse.json({ items }, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, category_id, is_recurring, quantity } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400, headers: corsHeaders })
    }

    const insert: {
      name: string
      category_id?: number
      is_recurring?: boolean
      quantity?: number
    } = { name: name.trim() }
    if (typeof category_id === 'number') insert.category_id = category_id
    if (typeof is_recurring === 'boolean') insert.is_recurring = is_recurring
    if (typeof quantity === 'number') insert.quantity = Math.max(1, Math.floor(quantity))

    const { data, error } = await supabase
      .from('food_items')
      .insert([insert])
      .select(`*, category:categories(*)`)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ item: data }, { status: 201, headers: corsHeaders })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bad request' },
      { status: 400, headers: corsHeaders }
    )
  }
}
