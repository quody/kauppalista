'use client'

import { useState } from 'react'

interface IngredientInput {
  name: string
  amount: string
  unit: string
}

interface RecipeFormProps {
  onClose: () => void
  onSave: (recipe: {
    title: string
    description: string
    instructions: string
    servings: string
    prep_time: string
    ingredients: IngredientInput[]
  }) => Promise<void>
  initialData?: {
    title: string
    description: string
    instructions: string
    servings: string
    prep_time: string
    ingredients: IngredientInput[]
  }
}

export function RecipeForm({ onClose, onSave, initialData }: RecipeFormProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [instructions, setInstructions] = useState(initialData?.instructions || '')
  const [servings, setServings] = useState(initialData?.servings || '')
  const [prepTime, setPrepTime] = useState(initialData?.prep_time || '')
  const [ingredients, setIngredients] = useState<IngredientInput[]>(
    initialData?.ingredients || [{ name: '', amount: '', unit: '' }]
  )
  const [saving, setSaving] = useState(false)

  const addIngredient = () => {
    setIngredients(prev => [...prev, { name: '', amount: '', unit: '' }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof IngredientInput, value: string) => {
    setIngredients(prev => prev.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        servings: servings.trim(),
        prep_time: prepTime.trim(),
        ingredients: ingredients.filter(ing => ing.name.trim()),
      })
      onClose()
    } catch (error) {
      console.error('Virhe reseptin tallennuksessa:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">
              {initialData ? 'Muokkaa reseptia' : 'Uusi resepti'}
            </h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-4 py-4">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nimi *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Reseptin nimi"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kuvaus</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Lyhyt kuvaus reseptista"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Prep time & Servings */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Aika</label>
                <input
                  type="text"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="esim. 30 min"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Annokset</label>
                <input
                  type="text"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  placeholder="esim. 4"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ainekset</label>
              <div className="space-y-2">
                {ingredients.map((ing, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={ing.amount}
                      onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                      placeholder="Maara"
                      className="w-16 px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      placeholder="Yks."
                      className="w-14 px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      placeholder="Aines"
                      className="flex-1 px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    {ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addIngredient}
                className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Lisaa aines
              </button>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ohjeet</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Kirjoita valmistusohjeet..."
                rows={6}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="sticky bottom-0 bg-white pt-4 pb-2">
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              {saving ? 'Tallennetaan...' : 'Tallenna resepti'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
