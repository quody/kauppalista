'use client'

import { useState } from 'react'
import { RecipeWithIngredients, RecipeIngredient } from '@/lib/supabase'

interface RecipeDetailProps {
  recipe: RecipeWithIngredients
  isFavorite: boolean
  onClose: () => void
  onToggleFavorite: () => void
  onAddToList: (ingredients: RecipeIngredient[]) => void
  onDelete?: () => void
}

export function RecipeDetail({ recipe, isFavorite, onClose, onToggleFavorite, onAddToList, onDelete }: RecipeDetailProps) {
  const [addingToList, setAddingToList] = useState(false)
  const [added, setAdded] = useState(false)

  const handleAddToList = async () => {
    if (!recipe.recipe_ingredients?.length) return
    setAddingToList(true)
    try {
      await onAddToList(recipe.recipe_ingredients)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } finally {
      setAddingToList(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-800 leading-tight">{recipe.title}</h2>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 -m-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {recipe.prep_time && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {recipe.prep_time}
              </span>
            )}
            {recipe.servings && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {recipe.servings}
              </span>
            )}
            {recipe.source_site && (
              <span className="text-xs text-emerald-600 font-medium">{recipe.source_site}</span>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 py-4">
          {recipe.description && (
            <p className="text-gray-600 text-sm mb-4">{recipe.description}</p>
          )}

          {/* Ingredients */}
          {recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-2">Ainekset</h3>
              <div className="space-y-1.5">
                {recipe.recipe_ingredients.map((ing, i) => (
                  <div key={ing.id || i} className="flex items-center text-sm text-gray-700 py-1 border-b border-gray-50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-3 flex-shrink-0" />
                    <span>
                      {ing.amount && <span className="font-medium">{ing.amount} </span>}
                      {ing.unit && <span className="text-gray-500">{ing.unit} </span>}
                      {ing.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {recipe.instructions && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-2">Ohjeet</h3>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {recipe.instructions}
              </div>
            </div>
          )}

          {/* Source link */}
          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 mb-4"
            >
              Avaa alkuperainen resepti
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          <button
            onClick={onToggleFavorite}
            className={`p-3 rounded-xl border transition-all duration-200 ${
              isFavorite
                ? 'bg-red-50 border-red-200 text-red-500'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-red-400'
            }`}
          >
            <svg className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {onDelete && recipe.is_user_created && (
            <button
              onClick={onDelete}
              className="p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 hover:text-red-500 hover:border-red-200 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          <button
            onClick={handleAddToList}
            disabled={addingToList || !recipe.recipe_ingredients?.length}
            className={`flex-1 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              added
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400'
            }`}
          >
            {added ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Lisatty listalle!
              </>
            ) : addingToList ? (
              'Lisataan...'
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Lisaa ostoslistalle
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
