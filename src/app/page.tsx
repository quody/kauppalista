'use client'

import { ShoppingList } from '@/components/ShoppingList'
import { HoppingBunny } from '@/components/HoppingBunny'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ShoppingList />
      <HoppingBunny />
    </div>
  )
}
