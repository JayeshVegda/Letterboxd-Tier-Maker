'use client'

import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'

const COLOR_PALETTE = [
  '#FF6B6B', '#FF8E53', '#FFA726', '#FFD54F', '#66BB6A',
  '#26A69A', '#42A5F5', '#5C6BC0', '#7E57C2', '#AB47BC',
  '#EC407A', '#EF5350', '#78909C', '#546E7A', '#FFFFFF'
]

export default function TierSettings({ isOpen, onClose, selectedTierId = null }) {
  const { tiers, setTiers, movies, setMovies } = useApp()
  const [currentTier, setCurrentTier] = useState(null)
  const [tierName, setTierName] = useState('')
  const [selectedColor, setSelectedColor] = useState('')

  useEffect(() => {
    if (isOpen && selectedTierId) {
      const tier = tiers.find((t) => t.id === selectedTierId)
      if (tier) {
        setCurrentTier(tier)
        setTierName(tier.name)
        setSelectedColor(tier.color)
      }
    } else if (isOpen && !selectedTierId && tiers.length > 0) {
      // Default to first tier if none selected
      const tier = tiers[0]
      setCurrentTier(tier)
      setTierName(tier.name)
      setSelectedColor(tier.color)
    }
  }, [isOpen, selectedTierId, tiers])

  const handleSave = () => {
    if (!currentTier) return

    setTiers((prevTiers) =>
      prevTiers.map((tier) =>
        tier.id === currentTier.id
          ? { ...tier, name: tierName || tier.name, color: selectedColor || tier.color, number: tierName || tier.number }
          : tier
      )
    )
  }

  const handleDeleteRow = () => {
    if (!currentTier) return

    // Move all movies from this tier to uncategorized
    setMovies((prevMovies) =>
      prevMovies.map((movie) =>
        movie.currentTier === currentTier.id
          ? { ...movie, currentTier: null, positionInTier: 0 }
          : movie
      )
    )

    // Remove the tier
    setTiers((prevTiers) => {
      const filtered = prevTiers.filter((t) => t.id !== currentTier.id)
      // Reorder remaining tiers
      return filtered.map((tier, idx) => ({ ...tier, order: idx }))
    })

    onClose()
  }

  const handleClearRow = () => {
    if (!currentTier) return

    setMovies((prevMovies) =>
      prevMovies.map((movie) =>
        movie.currentTier === currentTier.id
          ? { ...movie, currentTier: null, positionInTier: 0 }
          : movie
      )
    )
  }

  const handleAddRowAbove = () => {
    if (!currentTier) return

    const currentOrder = currentTier.order
    const newTier = {
      id: `tier-${Date.now()}`,
      name: 'New Tier',
      order: currentOrder,
      color: '#6B7280',
      emoji: '⭐',
      number: 'New',
    }

    setTiers((prevTiers) =>
      prevTiers
        .map((tier) =>
          tier.order >= currentOrder ? { ...tier, order: tier.order + 1 } : tier
        )
        .concat(newTier)
    )
  }

  const handleAddRowBelow = () => {
    if (!currentTier) return

    const currentOrder = currentTier.order
    const newTier = {
      id: `tier-${Date.now()}`,
      name: 'New Tier',
      order: currentOrder + 1,
      color: '#6B7280',
      emoji: '⭐',
      number: 'New',
    }

    setTiers((prevTiers) =>
      prevTiers
        .map((tier) =>
          tier.order > currentOrder ? { ...tier, order: tier.order + 1 } : tier
        )
        .concat(newTier)
    )
  }

  if (!isOpen || !currentTier) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-200 p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Tier Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Color Palette */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-full border-2 ${
                  selectedColor === color ? 'border-black' : 'border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Tier Name Input */}
        <div className="mb-4">
          <textarea
            value={tierName}
            onChange={(e) => setTierName(e.target.value)}
            onBlur={handleSave}
            placeholder={currentTier.name}
            className="w-full p-3 bg-gray-100 border border-gray-300 text-gray-800 resize-none"
            rows={2}
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDeleteRow}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm"
          >
            Delete Row
          </button>
          <button
            onClick={handleClearRow}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm"
          >
            Clear Row Images
          </button>
          <button
            onClick={handleAddRowAbove}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm"
          >
            Add a Row Above
          </button>
          <button
            onClick={handleAddRowBelow}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm"
          >
            Add a Row Below
          </button>
        </div>
      </div>
    </div>
  )
}
