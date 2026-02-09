'use client'

import { RecipeWithIngredients } from '@/lib/supabase'

interface RecipeCardProps {
  recipe: RecipeWithIngredients
  isFavorite: boolean
  onClick: () => void
  onToggleFavorite: (e: React.MouseEvent) => void
}

export function RecipeCard({ recipe, isFavorite, onClick, onToggleFavorite }: RecipeCardProps) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {recipe.image_url && (
        <div className="h-32 bg-gray-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">
            {recipe.title}
          </h3>
          <button
            onClick={onToggleFavorite}
            className="flex-shrink-0 p-1 -m-1 transition-transform duration-200 hover:scale-110"
          >
            {isFavorite ? (
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-300 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
        </div>
        {recipe.description && (
          <p className="text-gray-500 text-xs mt-1.5 line-clamp-2">{recipe.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {recipe.prep_time && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {recipe.prep_time}
            </span>
          )}
          {recipe.servings && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {recipe.servings}
            </span>
          )}
          {recipe.source_site && (
            <span className="text-xs text-emerald-600 font-medium">{recipe.source_site}</span>
          )}
          {recipe.is_user_created && (
            <span className="text-xs text-amber-600 font-medium">Oma</span>
          )}
        </div>
      </div>
    </div>
  )
}
