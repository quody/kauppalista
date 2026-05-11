import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

type CrossInput = { id?: number; name?: string; crossed?: boolean }

export async function POST(request: NextRequest) {
  try {
    const body: CrossInput | { items: CrossInput[] } = await request.json()
    const inputs: CrossInput[] = Array.isArray((body as { items?: CrossInput[] }).items)
      ? (body as { items: CrossInput[] }).items
      : [body as CrossInput]

    const results = await Promise.all(inputs.map(async (input) => {
      const crossed = input.crossed !== false
      const timestamp = crossed ? new Date().toISOString() : null

      let target: { id: number; name: string } | null = null

      if (typeof input.id === 'number') {
        const { data } = await supabase
          .from('food_items')
          .select('id, name')
          .eq('id', input.id)
          .maybeSingle()
        target = data
      } else if (typeof input.name === 'string' && input.name.trim()) {
        const { data } = await supabase
          .from('food_items')
          .select('id, name')
          .ilike('name', input.name.trim())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        target = data
      }

      if (!target) {
        return { ok: false, input, error: 'Item not found' }
      }

      const { data, error } = await supabase
        .from('food_items')
        .update({ crossed_out: crossed, crossed_out_at: timestamp })
        .eq('id', target.id)
        .select(`*, category:categories(*)`)
        .single()

      if (error) {
        return { ok: false, input, error: error.message }
      }

      return { ok: true, item: data }
    }))

    const failed = results.filter(r => !r.ok)
    return NextResponse.json(
      { results, updated: results.length - failed.length, failed: failed.length },
      { status: failed.length === results.length ? 404 : 200, headers: corsHeaders }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bad request' },
      { status: 400, headers: corsHeaders }
    )
  }
}
