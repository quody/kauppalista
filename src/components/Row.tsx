'use client'

import { useEffect, useRef, useState, useCallback, memo } from 'react'
import type { FoodItemWithCategory } from '@/lib/supabase'

type RowProps = {
  item: FoodItemWithCategory
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onToggle: () => void
  onQuantity: (delta: number) => void
  onPause: () => void
  onToggleRecurring: () => void
  onRename: (name: string) => void
  onDelete: () => void
}

const ACTION_W = 64 // px per action button — thumb-friendly
const SWIPE_THRESHOLD = 12 // px before we consider the gesture a horizontal swipe

function RowImpl({
  item,
  isOpen,
  onOpenChange,
  onToggle,
  onQuantity,
  onPause,
  onToggleRecurring,
  onRename,
  onDelete,
}: RowProps) {
  const isPaused = !!item.paused_until && new Date(item.paused_until) > new Date()
  const isRecurring = item.is_recurring
  const isCrossed = !!item.crossed_out

  const actionCount = isRecurring ? 3 : 2
  const drawerW = ACTION_W * actionCount

  const [tx, setTx] = useState(0)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.name)
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const baseTx = useRef(0)
  const dragLocked = useRef<'h' | 'v' | null>(null)
  const containerRef = useRef<HTMLLIElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTx(isOpen ? -drawerW : 0)
  }, [isOpen, drawerW])

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(item.name)
  }, [item.name, editing])

  const onTouchStart = (e: React.TouchEvent) => {
    if (editing) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    baseTx.current = isOpen ? -drawerW : 0
    dragLocked.current = null
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    if (!dragLocked.current) {
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        dragLocked.current = 'h'
      } else if (Math.abs(dy) > SWIPE_THRESHOLD) {
        dragLocked.current = 'v'
      }
    }
    if (dragLocked.current !== 'h') return

    const next = Math.min(0, Math.max(-drawerW - 24, baseTx.current + dx))
    setTx(next)
  }

  const onTouchEnd = () => {
    if (dragLocked.current === 'h') {
      const shouldOpen = tx < -drawerW / 2.2
      onOpenChange(shouldOpen)
      setTx(shouldOpen ? -drawerW : 0)
    }
    startX.current = null
    startY.current = null
    dragLocked.current = null
  }

  const closeDrawer = useCallback(() => onOpenChange(false), [onOpenChange])

  const beginEdit = () => {
    setEditing(true)
    closeDrawer()
  }

  const commitEdit = () => {
    if (draft.trim() && draft.trim() !== item.name) {
      onRename(draft)
    } else {
      setDraft(item.name)
    }
    setEditing(false)
  }

  const cancelEdit = () => {
    setDraft(item.name)
    setEditing(false)
  }

  const cardBg = isCrossed
    ? 'bg-gray-100 text-gray-500'
    : isPaused
      ? 'bg-amber-50 text-gray-700'
      : isRecurring
        ? 'bg-emerald-50 text-gray-800'
        : 'bg-blue-50 text-gray-800'

  return (
    <li ref={containerRef} className="relative select-none">
      {/* action drawer */}
      <div
        className="absolute inset-y-0 right-0 flex rounded-lg overflow-hidden"
        style={{ width: drawerW }}
        aria-hidden={!isOpen}
      >
        {isRecurring && (
          <button
            type="button"
            onClick={() => { onPause(); closeDrawer() }}
            className="drawer-icon flex-1 flex flex-col items-center justify-center gap-1 bg-amber-200 text-amber-900 tap"
            style={{ animationDelay: '20ms' }}
            aria-label={isPaused ? 'Jatka' : 'Tauota viikoksi'}
          >
            <PauseIcon paused={isPaused} />
            <span className="text-[10px] uppercase tracking-wider font-medium">
              {isPaused ? 'Jatka' : 'Tauko'}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={beginEdit}
          className="drawer-icon flex-1 flex flex-col items-center justify-center gap-1 bg-slate-200 text-slate-800 tap"
          style={{ animationDelay: '60ms' }}
          aria-label="Muokkaa"
        >
          <EditIcon />
          <span className="text-[10px] uppercase tracking-wider font-medium">Muokkaa</span>
        </button>
        <button
          type="button"
          onClick={() => { onDelete(); closeDrawer() }}
          className="drawer-icon flex-1 flex flex-col items-center justify-center gap-1 bg-red-500 text-white tap"
          style={{ animationDelay: '100ms' }}
          aria-label="Poista"
        >
          <TrashIcon />
          <span className="text-[10px] uppercase tracking-wider font-medium">Poista</span>
        </button>
      </div>

      {/* the card */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          transform: `translateX(${tx}px)`,
          transition: dragLocked.current === 'h' ? 'none' : 'transform 280ms cubic-bezier(0.2, 0.85, 0.25, 1)',
        }}
        className={`relative rounded-lg ${cardBg} ${isCrossed ? 'line-through' : ''}`}
      >
        <div className="px-3 py-2.5 flex items-center gap-3">
          {/* check */}
          <button
            type="button"
            onClick={onToggle}
            className="tap shrink-0 w-11 h-11 -my-1 rounded-full flex items-center justify-center"
            aria-label={isCrossed ? 'Palauta' : 'Merkitse ostetuksi'}
          >
            <span
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isCrossed ? 'bg-green-500 border-green-500' : 'border-gray-300'
              }`}
            >
              {isCrossed && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
          </button>

          {/* name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {editing ? (
                <input
                  ref={editRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
                  }}
                  className="flex-1 min-w-0 bg-white border border-gray-300 rounded px-2 py-1 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  enterKeyHint="done"
                  autoComplete="off"
                />
              ) : (
                <button
                  type="button"
                  onClick={beginEdit}
                  className="text-left flex-1 min-w-0 truncate"
                >
                  <span className="text-base">{item.name}</span>
                </button>
              )}

              {/* kind badge — tap to toggle */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleRecurring() }}
                className={`tap shrink-0 text-[11px] px-2 py-0.5 rounded-full ${
                  isRecurring
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-blue-200 text-blue-900'
                }`}
                aria-label={isRecurring ? 'Vaihda kerralle' : 'Vaihda toistuvaksi'}
              >
                {isRecurring ? 'Toistuva' : 'Kerta'}
              </button>
            </div>

            {/* quantity controls */}
            {!editing && (
              <div className="mt-1.5 flex items-center gap-2">
                <Stepper
                  value={item.quantity}
                  onChange={onQuantity}
                  disabled={isCrossed}
                />
                {isPaused && (
                  <span className="text-[11px] uppercase tracking-wide text-amber-800 font-medium">
                    Tauolla viikoksi
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

function Stepper({
  value, onChange, disabled,
}: { value: number; onChange: (delta: number) => void; disabled?: boolean }) {
  return (
    <div
      className={`inline-flex items-stretch h-8 rounded-full border border-gray-300 bg-white overflow-hidden ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onChange(-1)}
        disabled={value <= 1}
        className="tap w-9 flex items-center justify-center text-gray-700 disabled:text-gray-300"
        aria-label="Vähennä määrää"
      >
        <svg width="12" height="2" viewBox="0 0 12 2"><rect width="12" height="2" rx="1" fill="currentColor" /></svg>
      </button>
      <span className="text-sm tabular-nums font-semibold min-w-[1.75rem] flex items-center justify-center text-gray-800">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(+1)}
        className="tap w-9 flex items-center justify-center text-gray-700"
        aria-label="Lisää määrää"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

function PauseIcon({ paused }: { paused: boolean }) {
  if (paused) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M6 4l11 6-11 6V4z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="5" y="4" width="3.6" height="12" rx="1" fill="currentColor" />
      <rect x="11.4" y="4" width="3.6" height="12" rx="1" fill="currentColor" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M3 17l3.5-1 9.2-9.2a1.4 1.4 0 0 0 0-2L14.2 3.3a1.4 1.4 0 0 0-2 0L3 12.5 2 16l1 1z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
      />
      <path d="M11.5 4l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 6h12M8 3h4m-6 3v9a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 9.5v5M11.5 9.5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export const Row = memo(RowImpl)
