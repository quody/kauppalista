'use client'

import { useState, useEffect } from 'react'
import { supabase, FoodItemWithCategory, Category } from '@/lib/supabase'

export function ShoppingList() {
  const [items, setItems] = useState<FoodItemWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [loading, setLoading] = useState(true)

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
    // Initial load
    fetchItems()
    
    const channel = supabase
      .channel('food_items_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'food_items' 
      }, async (payload) => {
        console.log('Realtime INSERT:', payload)
        // Fetch the full item with category relationship
        const { data } = await supabase
          .from('food_items')
          .select(`
            *,
            category:categories(*)
          `)
          .eq('id', payload.new.id)
          .single()
        
        if (data) {
          setItems(prevItems => [data, ...prevItems])
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'food_items' 
      }, async (payload) => {
        console.log('Realtime UPDATE:', payload)
        // Fetch the updated item with category relationship
        const { data } = await supabase
          .from('food_items')
          .select(`
            *,
            category:categories(*)
          `)
          .eq('id', payload.new.id)
          .single()
        
        if (data) {
          setItems(prevItems => 
            prevItems.map(item => 
              item.id === data.id ? data : item
            )
          )
        }
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'food_items' 
      }, (payload) => {
        console.log('Realtime DELETE:', payload)
        setItems(prevItems => 
          prevItems.filter(item => item.id !== payload.old.id)
        )
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to food_items changes')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel subscription error:', err)
        } else if (status === 'TIMED_OUT') {
          console.error('Channel subscription timed out')
        } else {
          console.log('Channel subscription status:', status)
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }

  const toggleItem = async (id: number, currentState: boolean | null) => {
    // Optimistic UI update
    const newState = !currentState
    const timestamp = newState ? new Date().toISOString() : null
    
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id 
          ? { 
              ...item, 
              crossed_out: newState,
              crossed_out_at: timestamp
            }
          : item
      )
    )

    try {
      const updates = {
        crossed_out: newState,
        crossed_out_at: newState ? timestamp : null
      }

      const { error } = await supabase
        .from('food_items')
        .update(updates)
        .eq('id', id)
      
      if (error) {
        // Revert optimistic update on error
        setItems(prevItems => 
          prevItems.map(item => 
            item.id === id 
              ? { 
                  ...item, 
                  crossed_out: currentState,
                  crossed_out_at: currentState ? new Date().toISOString() : null
                }
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

    try {
      const categoryId = await findBestMatchingCategory(newItemName.trim())
      
      const { error } = await supabase
        .from('food_items')
        .insert([{
          name: newItemName.trim(),
          category_id: categoryId
        }])
      
      if (error) throw error
      setNewItemName('')
    } catch (error) {
      console.error('Virhe tuotteen lisäämisessä:', error)
    }
  }

  const findBestMatchingCategory = async (itemName: string): Promise<number> => {
    try {
      const categoryName = await getCategoryFromClaude(itemName, categories)
      
      // Find exact match first
      const category = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase())
      
      if (category) {
        return category.id
      }
      
      // If no exact match, find default category or first available category
      const defaultCategory = categories.find(cat => cat.name.toLowerCase().includes('other')) 
        || categories.find(cat => cat.name.toLowerCase().includes('miscellaneous'))
        || categories[0] // fallback to first category
      
      return defaultCategory?.id || 1 // fallback to ID 1 if no categories exist
    } catch (error) {
      console.error('Virhe kategorian löytämisessä:', error)
      // Return first available category as fallback
      return categories[0]?.id || 1
    }
  }

  const getCategoryFromClaude = async (itemName: string, availableCategories: Category[]): Promise<string> => {
    try {
      const response = await fetch('/api/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          itemName,
          availableCategories: availableCategories.map(cat => cat.name)
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
    if (!groups[categoryName]) {
      groups[categoryName] = []
    }
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
    <div className="max-w-md mx-auto bg-white shadow-lg min-h-screen">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Ostoslista</h1>
        
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto mb-4">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Ei tuotteita ostoslistassa
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-1">
                  {category}
                </h2>
                <div className="space-y-2">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                        item.crossed_out 
                          ? 'bg-gray-100 text-gray-500 line-through' 
                          : 'bg-blue-50 hover:bg-blue-100 text-gray-800'
                      }`}
                      onClick={() => toggleItem(item.id, item.crossed_out)}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 mr-3 flex-shrink-0 ${
                        item.crossed_out 
                          ? 'bg-green-500 border-green-500' 
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
                      <span className="flex-1">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={addItem} className="sticky bottom-0 bg-white pt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Lisää uusi tuote..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!newItemName.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Lisää
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}