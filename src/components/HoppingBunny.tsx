'use client'

import { useEffect, useState, useRef } from 'react'

export function HoppingBunny() {
  const [frame, setFrame] = useState(0)
  const [position, setPosition] = useState(200)
  const [verticalPosition, setVerticalPosition] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [currentRow, setCurrentRow] = useState(3) // Start with row 4 (index 3)
  const [isReversingIdle, setIsReversingIdle] = useState(false)
  const [direction, setDirection] = useState(1) // 1 = right, -1 = left
  const [shouldReverseAfterIdle, setShouldReverseAfterIdle] = useState(false)
  const [justReversed, setJustReversed] = useState(false)
  const [isFalling, setIsFalling] = useState(true)
  const [fallSpeed, setFallSpeed] = useState(0)
  const [justLanded, setJustLanded] = useState(false)
  const bunnyRef = useRef<HTMLDivElement>(null)
  const hasReversedThisCycle = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPaused) return

      // Handle falling
      if (isFalling) {
        // Stay on frame 2 (third hopping frame) while falling
        setFrame(3)
        // Don't do any other animation logic while falling
        return
      }

      setFrame((prev) => {
        // If just landed, complete the hop animation
        if (justLanded) {
          if (prev === 2) {
            setJustLanded(false)
            return 3 // Move to last frame of hop
          } else if (prev === 3) {
            // After landing hop completes, go to idle
            setCurrentRow(7)
            return 0
          }
        }

        // Reversing idle animation (row 8, frames 3->2->1->0)
        if (isReversingIdle) {
          const nextFrame = prev - 1
          if (nextFrame < 0) {
            setIsReversingIdle(false)
            setCurrentRow(3) // Go back to row 4 (hopping)
            // Reverse direction if we were near the edge (only once!)
            if (shouldReverseAfterIdle && !hasReversedThisCycle.current) {
              console.log('Reversing direction')
              setDirection((d) => -d)
              hasReversedThisCycle.current = true
              setShouldReverseAfterIdle(false)
              setJustReversed(true) // Prevent immediate re-trigger
            }
            return 0
          }
          return nextFrame
        }

        const nextFrame = (prev + 1) % 4

        // After completing the hopping cycle (row 4), switch to row 8
        if (nextFrame === 0 && prev === 3 && currentRow === 3) {
          setCurrentRow(7) // Switch to row 8 (index 7)
          return 0
        }

        // After completing row 8 animation, pause for 1 second on last frame
        if (nextFrame === 0 && prev === 3 && currentRow === 7) {
          setIsPaused(true)
          setTimeout(() => {
            setIsPaused(false)
            setIsReversingIdle(true) // Start reversing idle animation
          }, 1000)
          return prev // Stay on frame 3
        }

        return nextFrame
      })

      // Only move position during hopping animation (row 4/index 3)
      if (currentRow === 3 && !isFalling) {
        setPosition((prev) => prev + (10 * direction))
      }
    }, 150) // Change frame every 150ms for a nice hopping effect

    return () => clearInterval(interval)
  }, [isPaused, currentRow, isReversingIdle, direction, shouldReverseAfterIdle, isFalling, justLanded])

  // Check if bunny is near container edge (within 40px) during hopping
  useEffect(() => {
    if (currentRow !== 3) return // Only check during hopping
    if (justReversed) return // Skip check right after reversing

    const container = document.getElementById('bunny-container')
    if (!container || !bunnyRef.current) return

    const containerRect = container.getBoundingClientRect()
    const bunnyRect = bunnyRef.current.getBoundingClientRect()

    const PADDING = 40

    // Check if bunny is within 40px of the edge
    if (direction === 1) {
      const remainingSpace = containerRect.right - bunnyRect.right
      if (remainingSpace < PADDING && !shouldReverseAfterIdle) {
        setShouldReverseAfterIdle(true)
      }
    } else if (direction === -1) {
      const remainingSpace = bunnyRect.left - containerRect.left
      if (remainingSpace < PADDING && !shouldReverseAfterIdle) {
        setShouldReverseAfterIdle(true)
      }
    }
  }, [position, direction, currentRow, shouldReverseAfterIdle, justReversed])

  // Clear justReversed flag once bunny has moved away from edges
  useEffect(() => {
    if (!justReversed || currentRow !== 3) return

    const container = document.getElementById('bunny-container')
    if (!container || !bunnyRef.current) return

    const containerRect = container.getBoundingClientRect()
    const bunnyRect = bunnyRef.current.getBoundingClientRect()

    const SAFE_DISTANCE = 80 // Clear flag when we're 80px away from edges

    const distanceFromLeft = bunnyRect.left - containerRect.left
    const distanceFromRight = containerRect.right - bunnyRect.right

    // Clear flag if we're safely away from both edges
    if (distanceFromLeft > SAFE_DISTANCE && distanceFromRight > SAFE_DISTANCE) {
      setJustReversed(false)
      hasReversedThisCycle.current = false // Reset the ref as well
    }
  }, [position, justReversed, currentRow])

  // Gravity and floor detection
  useEffect(() => {
    const floor = document.getElementById('bunny-floor')
    if (!floor || !bunnyRef.current) return

    const floorRect = floor.getBoundingClientRect()
    const bunnyRect = bunnyRef.current.getBoundingClientRect()

    // Check if bunny is above the floor
    const isAboveFloor = bunnyRect.bottom < floorRect.top

    if (isAboveFloor) {
      // Should be falling
      if (!isFalling) {
        setIsFalling(true)
        setFallSpeed(1)
      }
    } else {
      // On or below floor level
      if (isFalling) {
        // Just landed - stop falling and align bunny to floor
        setIsFalling(false)
        setFallSpeed(0)
        // Calculate the exact position to place bunny on floor
        const distanceToFloor = floorRect.top - bunnyRect.bottom
        setVerticalPosition((pos) => pos + distanceToFloor)
        setJustLanded(true)
      }
    }
  }, [verticalPosition, isFalling])

  // Apply gravity when falling
  useEffect(() => {
    if (!isFalling) return

    const gravityInterval = setInterval(() => {
      setFallSpeed((speed) => Math.min(speed + 1, 10)) // Max speed 10px/frame
      setVerticalPosition((pos) => pos + fallSpeed)
    }, 50) // Faster interval for smooth falling

    return () => clearInterval(gravityInterval)
  }, [isFalling, fallSpeed])

  // Sprite sheet: 4 columns x 8 rows, each frame 72x72px
  const column = frame // columns 0, 1, 2, 3
  const row = currentRow

  // Sprite sheet dimensions
  const FRAME_WIDTH = 72
  const FRAME_HEIGHT = 72

  // Calculate background position in pixels
  // X positions: 0, -72, -144, -216
  // Y position for row 3: -216
  const bgX = -(column * FRAME_WIDTH)
  const bgY = -(row * FRAME_HEIGHT)

  return (
    <div
      ref={bunnyRef}
      className="fixed bottom-48 left-48 pointer-events-none"
      style={{
        width: `${FRAME_WIDTH}px`,
        height: `${FRAME_HEIGHT}px`,
        backgroundImage: 'url(/rabbit.png)',
        backgroundPosition: `${bgX}px ${bgY}px`,
        imageRendering: 'pixelated',
        transform: `translateX(${position}px) translateY(${verticalPosition}px) scaleX(${direction})`,
      }}
    />
  )
}
