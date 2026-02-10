'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, RecipeWithIngredients, RecipeIngredient, Category } from '@/lib/supabase'
import { RecipeCard } from './RecipeCard'
import { RecipeDetail } from './RecipeDetail'
import { RecipeForm } from './RecipeForm'

type SubTab = 'search' | 'my' | 'favorites'

interface SearchRecipe {
  title: string
  description: string
  prep_time: string
  servings: string
  source_site: string
  ingredients: Array<{ name: string; amount: string; unit: string }>
  instructions: string
}

export function RecipeBrowser() {
  const [subTab, setSubTab] = useState<SubTab>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchRecipe[]>([])
  const [savedRecipes, setSavedRecipes] = useState<RecipeWithIngredients[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithIngredients | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  const fetchSavedRecipes = useCallback(async () => {
    const { data } = await supabase
      .from('recipes')
      .select(`*, recipe_ingredients(*)`)
      .order('created_at', { ascending: false })
    if (data) setSavedRecipes(data)
  }, [])

  const fetchFavorites = useCallback(async () => {
    const { data } = await supabase
      .from('favorite_recipes')
      .select('recipe_id')
    if (data) setFavoriteIds(new Set(data.map(f => f.recipe_id)))
  }, [])

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })
    if (data) setCategories(data)
  }, [])

  useEffect(() => {
    fetchSavedRecipes()
    fetchFavorites()
    fetchCategories()
  }, [fetchSavedRecipes, fetchFavorites, fetchCategories])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    setSearchResults([])
    try {
      const response = await fetch('/api/recipes/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      })
      const data = await response.json()
      setSearchResults(data.recipes || [])
    } catch (error) {
      console.error('Virhe haussa:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleImportUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importUrl.trim()) return

    setImporting(true)
    try {
      const response = await fetch('/api/recipes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      const data = await response.json()

      if (data.recipe) {
        await saveSearchRecipe({
          title: data.recipe.title,
          description: data.recipe.description || '',
          prep_time: data.recipe.prep_time || '',
          servings: data.recipe.servings || '',
          source_site: data.recipe.source_site || 'Web',
          ingredients: data.recipe.ingredients || [],
          instructions: data.recipe.instructions || '',
        }, data.recipe.source_url, data.recipe.source_site)
        setImportUrl('')
        setSubTab('my')
      } else {
        alert(data.error || 'Reseptin tuonti epaonnistui')
      }
    } catch (error) {
      console.error('Virhe tuonnissa:', error)
    } finally {
      setImporting(false)
    }
  }

  const saveSearchRecipe = async (recipe: SearchRecipe, sourceUrl?: string, sourceSite?: string) => {
    try {
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          title: recipe.title,
          description: recipe.description,
          instructions: recipe.instructions,
          prep_time: recipe.prep_time,
          servings: recipe.servings,
          source_site: sourceSite || recipe.source_site,
          source_url: sourceUrl || null,
          is_user_created: false,
        })
        .select()
        .single()

      if (recipeError || !recipeData) throw recipeError

      if (recipe.ingredients?.length) {
        await supabase
          .from('recipe_ingredients')
          .insert(recipe.ingredients.map(ing => ({
            recipe_id: recipeData.id,
            name: ing.name,
            amount: ing.amount || null,
            unit: ing.unit || null,
          })))
      }

      await fetchSavedRecipes()
      return recipeData
    } catch (error) {
      console.error('Virhe reseptin tallennuksessa:', error)
      throw error
    }
  }

  const handleSaveOwnRecipe = async (recipe: {
    title: string
    description: string
    instructions: string
    servings: string
    prep_time: string
    ingredients: Array<{ name: string; amount: string; unit: string }>
  }) => {
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        title: recipe.title,
        description: recipe.description || null,
        instructions: recipe.instructions || null,
        prep_time: recipe.prep_time || null,
        servings: recipe.servings || null,
        is_user_created: true,
      })
      .select()
      .single()

    if (recipeError || !recipeData) throw recipeError

    if (recipe.ingredients?.length) {
      await supabase
        .from('recipe_ingredients')
        .insert(recipe.ingredients.map(ing => ({
          recipe_id: recipeData.id,
          name: ing.name,
          amount: ing.amount || null,
          unit: ing.unit || null,
        })))
    }

    await fetchSavedRecipes()
  }

  const toggleFavorite = async (recipeId: number) => {
    const isFav = favoriteIds.has(recipeId)

    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev)
      if (isFav) next.delete(recipeId)
      else next.add(recipeId)
      return next
    })

    try {
      if (isFav) {
        await supabase.from('favorite_recipes').delete().eq('recipe_id', recipeId)
      } else {
        await supabase.from('favorite_recipes').insert({ recipe_id: recipeId })
      }
    } catch {
      // Revert on error
      setFavoriteIds(prev => {
        const next = new Set(prev)
        if (isFav) next.add(recipeId)
        else next.delete(recipeId)
        return next
      })
    }
  }

  const deleteRecipe = async (recipeId: number) => {
    await supabase.from('recipes').delete().eq('id', recipeId)
    setSelectedRecipe(null)
    await fetchSavedRecipes()
    await fetchFavorites()
  }

  const addIngredientsToList = async (ingredients: RecipeIngredient[]) => {
    for (const ing of ingredients) {
      const itemName = ing.amount || ing.unit
        ? `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim()
        : ing.name

      // Try to categorize
      let categoryId: number | null = null
      try {
        const resp = await fetch('/api/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemName: ing.name,
            availableCategories: categories.map(c => c.name)
          }),
        })
        const data = await resp.json()
        const cat = categories.find(c => c.name.toLowerCase() === data.category?.toLowerCase())
        if (cat) categoryId = cat.id
      } catch {
        // Use first category as fallback
        categoryId = categories[0]?.id || null
      }

      await supabase
        .from('food_items')
        .insert({ name: itemName, category_id: categoryId || categories[0]?.id || 1 })
    }
  }

  const handleSelectSearchResult = async (recipe: SearchRecipe) => {
    try {
      const saved = await saveSearchRecipe(recipe)
      if (saved) {
        // Fetch full recipe with ingredients
        const { data } = await supabase
          .from('recipes')
          .select(`*, recipe_ingredients(*)`)
          .eq('id', saved.id)
          .single()
        if (data) setSelectedRecipe(data)
      }
    } catch (error) {
      console.error('Error saving search result:', error)
    }
  }

  const myRecipes = savedRecipes.filter(r => r.is_user_created)
  const favoriteRecipes = savedRecipes.filter(r => favoriteIds.has(r.id))

  return (
    <div>
      <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">Reseptit</h1>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {([['search', 'Haku'], ['my', 'Omat'], ['favorites', 'Suosikit']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              subTab === key
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search Tab */}
      {subTab === 'search' && (
        <div>
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Etsi resepteja... esim. 'kanakeitto'"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
              >
                {searching ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </div>
          </form>

          {/* Import from URL */}
          <form onSubmit={handleImportUrl} className="mb-4">
            <div className="flex gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Tuo resepti URL:sta (Valio, K-Ruoka...)"
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={importing || !importUrl.trim()}
                className="px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 transition-all text-sm font-medium"
              >
                {importing ? 'Tuodaan...' : 'Tuo'}
              </button>
            </div>
          </form>

          {searching && (
            <div className="text-center py-8 text-gray-400">
              <div className="animate-pulse">Etsitaan resepteja...</div>
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {searchResults.map((recipe, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden p-3"
                  onClick={() => handleSelectSearchResult(recipe)}
                >
                  <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 mb-1">
                    {recipe.title}
                  </h3>
                  {recipe.description && (
                    <p className="text-gray-500 text-xs line-clamp-2 mb-2">{recipe.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {recipe.prep_time && (
                      <span className="text-xs text-gray-400">{recipe.prep_time}</span>
                    )}
                    {recipe.source_site && (
                      <span className="text-xs text-emerald-600 font-medium">{recipe.source_site}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!searching && searchResults.length === 0 && searchQuery && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm">Hae resepteja hakusanalla</div>
            </div>
          )}

          {!searching && !searchQuery && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">🍳</div>
              <div className="text-sm">Etsi resepteja suomalaisilta sivuilta</div>
              <div className="text-xs mt-1">Valio, K-Ruoka, ja muut</div>
            </div>
          )}
        </div>
      )}

      {/* My Recipes Tab */}
      {subTab === 'my' && (
        <div>
          {myRecipes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">📝</div>
              <div className="text-sm">Ei omia resepteja viela</div>
              <div className="text-xs mt-1">Luo ensimmainen reseptisi!</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {myRecipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isFavorite={favoriteIds.has(recipe.id)}
                  onClick={() => setSelectedRecipe(recipe)}
                  onToggleFavorite={(e) => { e.stopPropagation(); toggleFavorite(recipe.id) }}
                />
              ))}
            </div>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 transition-all duration-200 flex items-center justify-center z-30"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      )}

      {/* Favorites Tab */}
      {subTab === 'favorites' && (
        <div>
          {favoriteRecipes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">❤️</div>
              <div className="text-sm">Ei suosikkiresepteja</div>
              <div className="text-xs mt-1">Tallenna resepteja suosikeiksi!</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {favoriteRecipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isFavorite={true}
                  onClick={() => setSelectedRecipe(recipe)}
                  onToggleFavorite={(e) => { e.stopPropagation(); toggleFavorite(recipe.id) }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          isFavorite={favoriteIds.has(selectedRecipe.id)}
          onClose={() => setSelectedRecipe(null)}
          onToggleFavorite={() => toggleFavorite(selectedRecipe.id)}
          onAddToList={addIngredientsToList}
          onDelete={selectedRecipe.is_user_created ? () => deleteRecipe(selectedRecipe.id) : undefined}
        />
      )}

      {/* Recipe Form Modal */}
      {showForm && (
        <RecipeForm
          onClose={() => setShowForm(false)}
          onSave={handleSaveOwnRecipe}
        />
      )}
    </div>
  )
}
