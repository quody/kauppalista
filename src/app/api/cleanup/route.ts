import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    
    const { error } = await supabase
      .from('food_items')
      .delete()
      .eq('crossed_out', true)
      .eq('is_recurring', false)
      .lt('crossed_out_at', twelveHoursAgo)
    
    if (error) throw error
    
    return NextResponse.json({ success: true, message: 'Cleanup completed' })
  } catch (error) {
    console.error('Error during cleanup:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}