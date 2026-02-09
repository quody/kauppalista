'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, FoodItemWithCategory, Category } from '@/lib/supabase'
import { LoadingBubblesContainer } from './LoadingBubble'

export function ShoppingList() {
  const [items, setItems] = useState<FoodItemWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingBubbles, setLoadingBubbles] = useState<Array<{ id: string; text: string }>>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchItems = useCallback(async () => {
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
  }, [])

  const fetchCategories = useCallback(async () => {
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
  }, [])

  const setupRealtimeSubscription = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel('food_items_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'food_items'
      }, async (payload) => {
        const { data } = await supabase
          .from('food_items')
          .select(`*, category:categories(*)`)
          .eq('id', payload.new.id)
          .single()

        if (data) {
          setItems(prevItems => {
            if (prevItems.some(item => item.id === data.id)) return prevItems
            return [data, ...prevItems]
          })
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'food_items'
      }, async (payload) => {
        const { data } = await supabase
          .from('food_items')
          .select(`*, category:categories(*)`)
          .eq('id', payload.new.id)
          .single()

        if (data) {
          setItems(prevItems =>
            prevItems.map(item => item.id === data.id ? data : item)
          )
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'food_items'
      }, (payload) => {
        setItems(prevItems =>
          prevItems.filter(item => item.id !== payload.old.id)
        )
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime error, will retry:', status)
          setTimeout(() => {
            setupRealtimeSubscription()
            fetchItems()
          }, 3000)
        }
      })

    channelRef.current = channel
  }, [fetchItems])

  // Visibility change handler - refresh when app comes back
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App visible, refreshing...')
        fetchItems()
        setupRealtimeSubscription()
      }
    }

    const handleOnline = () => {
      console.log('Network restored, refreshing...')
      fetchItems()
      setupRealtimeSubscription()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('focus', fetchItems)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('focus', fetchItems)
    }
  }, [fetchItems, setupRealtimeSubscription])

  useEffect(() => {
    fetchCategories()
    fetchItems()
    setupRealtimeSubscription()

    const cleanupInterval = setInterval(() => {
      fetch('/api/cleanup', { method: 'POST' })
    }, 5 * 60 * 1000)

    const syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchItems()
      }
    }, 30 * 1000)

    return () => {
      clearInterval(cleanupInterval)
      clearInterval(syncInterval)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleItem = async (id: number, currentState: boolean | null) => {
    const newState = !currentState
    const timestamp = newState ? new Date().toISOString() : null

    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id
          ? { ...item, crossed_out: newState, crossed_out_at: timestamp }
          : item
      )
    )

    try {
      const { error } = await supabase
        .from('food_items')
        .update({ crossed_out: newState, crossed_out_at: newState ? timestamp : null })
        .eq('id', id)

      if (error) {
        setItems(prevItems =>
          prevItems.map(item =>
            item.id === id
              ? { ...item, crossed_out: currentState, crossed_out_at: currentState ? new Date().toISOString() : null }
              : item
          )
        )
        throw error
      }
    } catch (error) {
      console.error('Virhe tuotteen tilassa:', error)
    }
  }

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    const itemText = newItemName.trim()
    const bubbleId = `bubble-${Date.now()}-${Math.random()}`

    setLoadingBubbles(prev => [...prev, { id: bubbleId, text: itemText }])
    setNewItemName('')
    inputRef.current?.focus()

    try {
      const categoryId = await findBestMatchingCategory(itemText)
      const { error } = await supabase
        .from('food_items')
        .insert([{ name: itemText, category_id: categoryId }])

      if (error) throw error
      setLoadingBubbles(prev => prev.filter(b => b.id !== bubbleId))
    } catch (error) {
      console.error('Virhe tuotteen lisaamisessa:', error)
      setLoadingBubbles(prev => prev.filter(b => b.id !== bubbleId))
    }
  }

  const handleBubbleComplete = (bubbleId: string) => {
    setLoadingBubbles(prev => prev.filter(b => b.id !== bubbleId))
  }

  const findBestMatchingCategory = async (itemName: string): Promise<number> => {
    try {
      const categoryName = await getCategoryFromClaude(itemName, categories)
      const category = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase())
      if (category) return category.id

      const defaultCategory = categories.find(cat => cat.name.toLowerCase().includes('other'))
        || categories.find(cat => cat.name.toLowerCase().includes('miscellaneous'))
        || categories[0]

      return defaultCategory?.id || 1
    } catch (error) {
      console.error('Virhe kategorian loytamisessa:', error)
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
          availableCategories: availableCategories.map(cat => cat.name)
        }),
      })
      const data = await response.json()
      return data.category || availableCategories[0]?.name || 'Other'
    } catch (error) {
      console.error('Virhe kategorian saamisessa:', error)
      return availableCategories[0]?.name || 'Other'
    }
  }

  const groupedItems = items.reduce((groups: Record<string, FoodItemWithCategory[]>, item) => {
    const categoryName = item.category?.name || 'Muut'
    if (!groups[categoryName]) groups[categoryName] = []
    groups[categoryName].push(item)
    return groups
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-400">Ladataan...</div>
      </div>
    )
  }

  return (
    <div id="bunny-container">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800" id="bunny-ceiling">
        Ostoslista
      </h1>

      <div className="max-h-[calc(100vh-280px)] overflow-y-auto mb-4 px-1">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-3">🛒</div>
            <div>Ostoslista on tyhja</div>
            <div className="text-sm mt-1">Lisaa tuotteita alla olevalla kentalla</div>
          </div>
        ) : (
          Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category} className="mb-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1 bunny-shelf">
                {category}
              </h2>
              <div className="space-y-1.5">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      item.crossed_out
                        ? 'bg-gray-50 text-gray-400'
                        : 'bg-white shadow-sm hover:shadow-md text-gray-800 border border-gray-100'
                    }`}
                    onClick={() => toggleItem(item.id, item.crossed_out)}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex-shrink-0 transition-all duration-200 ${
                      item.crossed_out
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-gray-300'
                    }`}>
                      {item.crossed_out && (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className={`flex-1 ${item.crossed_out ? 'line-through' : ''}`}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <LoadingBubblesContainer
        bubbles={loadingBubbles}
        onBubbleComplete={handleBubbleComplete}
      />

      <form onSubmit={addItem} className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-2">
        <div className="flex gap-2">
          <input
            id="bunny-floor"
            ref={inputRef}
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Lisaa uusi tuote..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-800 placeholder-gray-400 transition-all"
          />
          <button
            type="submit"
            disabled={!newItemName.trim()}
            className="px-5 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium"
          >
            Lisaa
          </button>
        </div>
      </form>
    </div>
  )
}
