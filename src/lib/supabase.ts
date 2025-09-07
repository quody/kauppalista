import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export type FoodItem = Database['public']['Tables']['food_items']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type FoodItemInsert = Database['public']['Tables']['food_items']['Insert']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']

export type FoodItemWithCategory = FoodItem & {
  category?: Category | null
}