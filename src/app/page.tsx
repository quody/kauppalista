'use client'

import { useState } from 'react'
import { ShoppingList } from '@/components/ShoppingList'
import { RecipeBrowser } from '@/components/RecipeBrowser'
import { HoppingBunny } from '@/components/HoppingBunny'
import { Navigation } from '@/components/Navigation'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'list' | 'recipes'>('list')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white shadow-lg min-h-screen pb-16">
        <div className="p-4">
          {activeTab === 'list' ? <ShoppingList /> : <RecipeBrowser />}
        </div>
      </div>
      {activeTab === 'list' && <HoppingBunny />}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
