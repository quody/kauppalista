import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { error } = await supabase
      .from('food_items')
      .select('count', { count: 'exact' })
      .limit(1)
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database is alive',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Keep-alive check failed:', error)
    return NextResponse.json({ 
      error: 'Keep-alive failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}