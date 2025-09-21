'use client'

import { useEffect, useState } from 'react'

interface LoadingBubbleProps {
  text: string
  onAnimationComplete: () => void
}

export function LoadingBubble({ text, onAnimationComplete }: LoadingBubbleProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleAnimationEnd = () => {
    setIsVisible(false)
    setTimeout(onAnimationComplete, 150)
  }

  return (
    <div
      className={`
        inline-block px-3 py-2 bg-blue-100 border border-blue-200 rounded-full text-sm text-blue-800 mr-2 mb-2
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
      `}
      style={{
        animation: isVisible ? 'pulse 1.5s ease-in-out infinite' : 'shrink 0.3s ease-out forwards'
      }}
    >
      <div className="flex items-center">
        <div className="flex space-x-1 mr-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span>{text}</span>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.75);
          }
        }
      `}</style>
    </div>
  )
}

interface LoadingBubblesContainerProps {
  bubbles: Array<{ id: string; text: string }>
  onBubbleComplete: (id: string) => void
}

export function LoadingBubblesContainer({ bubbles, onBubbleComplete }: LoadingBubblesContainerProps) {
  if (bubbles.length === 0) return null

  return (
    <div className="mb-4 min-h-[40px] flex flex-wrap items-end">
      {bubbles.map((bubble) => (
        <LoadingBubble
          key={bubble.id}
          text={bubble.text}
          onAnimationComplete={() => onBubbleComplete(bubble.id)}
        />
      ))}
    </div>
  )
}