import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

export type FoodItem = Database['public']['Tables']['food_items']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type FoodItemInsert = Database['public']['Tables']['food_items']['Insert']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']

export type Recipe = Database['public']['Tables']['recipes']['Row']
export type RecipeInsert = Database['public']['Tables']['recipes']['Insert']
export type RecipeIngredient = Database['public']['Tables']['recipe_ingredients']['Row']
export type RecipeIngredientInsert = Database['public']['Tables']['recipe_ingredients']['Insert']
export type FavoriteRecipe = Database['public']['Tables']['favorite_recipes']['Row']

export type FoodItemWithCategory = FoodItem & {
  category?: Category | null
}

export type RecipeWithIngredients = Recipe & {
  recipe_ingredients?: RecipeIngredient[]
}
