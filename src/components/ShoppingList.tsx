'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, FoodItemWithCategory, Category } from '@/lib/supabase'
import { LoadingBubblesContainer } from './LoadingBubble'
import { Row } from './Row'

export function ShoppingList() {
  const [items, setItems] = useState<FoodItemWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemRecurring, setNewItemRecurring] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingBubbles, setLoadingBubbles] = useState<Array<{ id: string; text: string }>>([])
  const [openRowId, setOpenRowId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCategories()
    const unsubscribe = setupRealtimeSubscription()

    const cleanupInterval = setInterval(() => {
      fetch('/api/cleanup', { method: 'POST' })
    }, 5 * 60 * 1000)

    return () => {
      clearInterval(cleanupInterval)
      unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Virhe kategorioiden haussa:', error)
    }
  }

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select(`
          *,
          category:categories(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Virhe tuotteiden haussa:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    fetchItems()

    const channel = supabase
      .channel('food_items_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'food_items' }, async (payload) => {
        const { data } = await supabase
          .from('food_items')
          .select(`*, category:categories(*)`)
          .eq('id', payload.new.id)
          .single()
        if (data) setItems(prev => [data, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'food_items' }, async (payload) => {
        const { data } = await supabase
          .from('food_items')
          .select(`*, category:categories(*)`)
          .eq('id', payload.new.id)
          .single()
        if (data) setItems(prev => prev.map(item => item.id === data.id ? data : item))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'food_items' }, (payload) => {
        setItems(prev => prev.filter(item => item.id !== payload.old.id))
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  const patchItem = useCallback((id: number, patch: Partial<FoodItemWithCategory>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }, [])

  const toggleItem = useCallback(async (id: number, currentState: boolean | null) => {
    const newState = !currentState
    const timestamp = newState ? new Date().toISOString() : null
    patchItem(id, { crossed_out: newState, crossed_out_at: timestamp })
    const { error } = await supabase
      .from('food_items')
      .update({ crossed_out: newState, crossed_out_at: timestamp })
      .eq('id', id)
    if (error) {
      patchItem(id, { crossed_out: currentState, crossed_out_at: currentState ? new Date().toISOString() : null })
      console.error('Virhe tuotteen tilassa:', error)
    }
  }, [patchItem])

  const updateQuantity = useCallback(async (id: number, current: number, delta: number) => {
    const next = Math.max(1, current + delta)
    if (next === current) return
    patchItem(id, { quantity: next })
    const { error } = await supabase.from('food_items').update({ quantity: next }).eq('id', id)
    if (error) {
      patchItem(id, { quantity: current })
      console.error('Virhe määrän päivityksessä:', error)
    }
  }, [patchItem])

  const togglePause = useCallback(async (id: number, pausedUntil: string | null) => {
    const isPaused = pausedUntil && new Date(pausedUntil) > new Date()
    const next = isPaused ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    patchItem(id, { paused_until: next })
    const { error } = await supabase.from('food_items').update({ paused_until: next }).eq('id', id)
    if (error) {
      patchItem(id, { paused_until: pausedUntil })
      console.error('Virhe tauon päivityksessä:', error)
    }
  }, [patchItem])

  const toggleRecurring = useCallback(async (id: number, current: boolean) => {
    const next = !current
    patchItem(id, { is_recurring: next })
    const { error } = await supabase.from('food_items').update({ is_recurring: next }).eq('id', id)
    if (error) {
      patchItem(id, { is_recurring: current })
      console.error('Virhe toistuvuuden päivityksessä:', error)
    }
  }, [patchItem])

  const renameItem = useCallback(async (id: number, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const previous = items.find(i => i.id === id)?.name
    if (previous === trimmed) return
    patchItem(id, { name: trimmed })
    const { error } = await supabase.from('food_items').update({ name: trimmed }).eq('id', id)
    if (error) {
      if (previous) patchItem(id, { name: previous })
      console.error('Virhe nimen päivityksessä:', error)
    }
  }, [items, patchItem])

  const deleteItem = useCallback(async (id: number) => {
    const previous = items
    setItems(prev => prev.filter(i => i.id !== id))
    const { error } = await supabase.from('food_items').delete().eq('id', id)
    if (error) {
      setItems(previous)
      console.error('Virhe tuotteen poistossa:', error)
    }
  }, [items])

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    const itemText = newItemName.trim()
    const isRecurring = newItemRecurring
    const bubbleId = `bubble-${Date.now()}-${Math.random()}`

    setLoadingBubbles(prev => [...prev, { id: bubbleId, text: itemText }])
    setNewItemName('')
    setNewItemRecurring(false)
    inputRef.current?.focus()

    try {
      const categoryId = await findBestMatchingCategory(itemText)
      const { error } = await supabase
        .from('food_items')
        .insert([{
          name: itemText,
          category_id: categoryId,
          is_recurring: isRecurring,
          quantity: 1,
        }])
      if (error) throw error
      setLoadingBubbles(prev => prev.filter(bubble => bubble.id !== bubbleId))
    } catch (error) {
      console.error('Virhe tuotteen lisäämisessä:', error)
      setLoadingBubbles(prev => prev.filter(bubble => bubble.id !== bubbleId))
    }
  }

  const handleBubbleComplete = (bubbleId: string) =>
    setLoadingBubbles(prev => prev.filter(bubble => bubble.id !== bubbleId))

  const findBestMatchingCategory = async (itemName: string): Promise<number> => {
    try {
      const categoryName = await getCategoryFromClaude(itemName, categories)
      const category = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase())
      if (category) return category.id
      const fallback = categories.find(cat => cat.name.toLowerCase().includes('other'))
        || categories.find(cat => cat.name.toLowerCase().includes('miscellaneous'))
        || categories[0]
      return fallback?.id || 1
    } catch (error) {
      console.error('Virhe kategorian löytämisessä:', error)
      return categories[0]?.id || 1
    }
  }

  const getCategoryFromClaude = async (itemName: string, availableCategories: Category[]): Promise<string> => {
    try {
      const response = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName,
          availableCategories: availableCategories.map(cat => cat.name),
        }),
      })
      const data = await response.json()
      return data.category || availableCategories[0]?.name || 'Other'
    } catch (error) {
      console.error('Virhe kategorian saamisessa Claude:lta:', error)
      return availableCategories[0]?.name || 'Other'
    }
  }

  const groupedItems = items.reduce((groups: Record<string, FoodItemWithCategory[]>, item) => {
    const categoryName = item.category?.name || 'Other'
    if (!groups[categoryName]) groups[categoryName] = []
    groups[categoryName].push(item)
    return groups
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Ladataan...</div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white shadow-lg min-h-screen" id="bunny-container">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800" id="bunny-ceiling">Ostoslista</h1>

        <div className="max-h-[calc(100vh-220px)] overflow-y-auto mb-4 pr-1">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Ei tuotteita ostoslistassa
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-1 bunny-shelf">
                  {category}
                </h2>
                <ul className="space-y-2">
                  {categoryItems.map((item) => (
                    <Row
                      key={item.id}
                      item={item}
                      isOpen={openRowId === item.id}
                      onOpenChange={(open) => setOpenRowId(open ? item.id : (openRowId === item.id ? null : openRowId))}
                      onToggle={() => toggleItem(item.id, item.crossed_out)}
                      onQuantity={(delta) => updateQuantity(item.id, item.quantity, delta)}
                      onPause={() => togglePause(item.id, item.paused_until)}
                      onToggleRecurring={() => toggleRecurring(item.id, item.is_recurring)}
                      onRename={(name) => renameItem(item.id, name)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <LoadingBubblesContainer bubbles={loadingBubbles} onBubbleComplete={handleBubbleComplete} />

        <form onSubmit={addItem} className="sticky bottom-0 bg-white pt-4">
          <div className="flex gap-2">
            <input
              id="bunny-floor"
              ref={inputRef}
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Lisää uusi tuote..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400"
              enterKeyHint="done"
            />
            <button
              type="submit"
              disabled={!newItemName.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Lisää
            </button>
          </div>
          <label className="flex items-center gap-2 mt-2 text-sm text-gray-600 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={newItemRecurring}
              onChange={(e) => setNewItemRecurring(e.target.checked)}
              className="rounded border-gray-300"
            />
            Toistuva (viikoittainen)
          </label>
        </form>
      </div>
    </div>
  )
}
