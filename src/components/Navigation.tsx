'use client'

interface NavigationProps {
  activeTab: 'list' | 'recipes'
  onTabChange: (tab: 'list' | 'recipes') => void
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="max-w-md mx-auto flex">
        <button
          onClick={() => onTabChange('list')}
          className={`flex-1 flex flex-col items-center py-3 px-4 transition-colors duration-200 ${
            activeTab === 'list'
              ? 'text-emerald-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-xs font-medium">Ostoslista</span>
        </button>
        <button
          onClick={() => onTabChange('recipes')}
          className={`flex-1 flex flex-col items-center py-3 px-4 transition-colors duration-200 ${
            activeTab === 'recipes'
              ? 'text-emerald-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-xs font-medium">Reseptit</span>
        </button>
      </div>
    </nav>
  )
}
