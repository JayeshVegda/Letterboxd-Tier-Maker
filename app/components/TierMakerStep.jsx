'use client'

import { useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useDroppable, DragOverlay } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useApp } from '../context/AppContext'
import TierRow from './TierRow'
import MoviePoster from './MoviePoster'
import ExportButton from './ExportButton'
import TierSettings from './TierSettings'
import Image from 'next/image'

const UNCATEGORIZED_TIER_ID = 'uncategorized'

function UncategorizedPool({ movies, activeId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: UNCATEGORIZED_TIER_ID,
  })

  return (
    <div
      ref={setNodeRef}
      className={`mt-4 bg-[#1a1a1a]/50 backdrop-blur-sm border-2 border-dashed rounded-xl p-6 transition-all duration-300 ${
        isOver 
          ? 'ring-4 ring-blue-500/50 border-blue-500 bg-blue-500/10' 
          : 'border-gray-700 hover:border-gray-600'
      }`}
    >
      <h3 className="text-gray-300 text-sm font-semibold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
        Uncategorized ({movies.length})
      </h3>
      {movies.length > 0 ? (
        <SortableContext items={movies.map((m) => m.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
            {movies.map((movie) => (
              <MoviePoster key={movie.id} movie={movie} isDragging={activeId === movie.id} />
            ))}
          </div>
        </SortableContext>
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm">
          All movies have been categorized
        </div>
      )}
    </div>
  )
}

export default function TierMakerStep({ onBack }) {
  const { movies, setMovies, tiers, setTiers, tierListName, setTierListName } = useApp()
  const [activeId, setActiveId] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(tierListName)

  const sensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 3,
    },
  })

  const uncategorizedMovies = movies.filter(
    (m) => !m.currentTier || m.currentTier === UNCATEGORIZED_TIER_ID
  )

  const getMoviesInTier = (tierId) => {
    return movies
      .filter((m) => m.currentTier === tierId)
      .sort((a, b) => (a.positionInTier || 0) - (b.positionInTier || 0))
  }

  const activeMovie = activeId ? movies.find((m) => m.id === activeId) : null

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const draggedMovie = movies.find((m) => m.id === active.id)
    if (!draggedMovie) return

    const sourceTierId = draggedMovie.currentTier || UNCATEGORIZED_TIER_ID
    const sourceMovies = getMoviesInTier(sourceTierId)
    const sourceIndex = sourceMovies.findIndex((m) => m.id === active.id)

    let targetTierId = UNCATEGORIZED_TIER_ID
    let targetIndex = 0

    if (over.id === UNCATEGORIZED_TIER_ID) {
      targetTierId = UNCATEGORIZED_TIER_ID
      targetIndex = uncategorizedMovies.length
    } else if (over.id.startsWith('tier-')) {
      // Dropped directly on tier row (empty space or between items)
      targetTierId = over.id
      const targetMovies = getMoviesInTier(targetTierId)
      // If empty row, insert at start (0), otherwise append to end
      targetIndex = targetMovies.length === 0 ? 0 : targetMovies.length
    } else {
      // Dropped on another movie
      const targetMovie = movies.find((m) => m.id === over.id)
      if (targetMovie) {
        targetTierId = targetMovie.currentTier || UNCATEGORIZED_TIER_ID
        const targetMovies = getMoviesInTier(targetTierId)
        targetIndex = targetMovies.findIndex((m) => m.id === over.id)
        if (targetIndex === -1) targetIndex = targetMovies.length
        // If moving within same tier and dragging forward, adjust index
        if (sourceTierId === targetTierId && sourceIndex < targetIndex) {
          targetIndex += 1
        }
      }
    }

    if (sourceTierId === targetTierId) {
      const reordered = arrayMove(sourceMovies, sourceIndex, targetIndex)
      const updatedMovies = movies.map((m) => {
        const newIndex = reordered.findIndex((rm) => rm.id === m.id)
        if (newIndex !== -1 && m.currentTier === targetTierId) {
          return { ...m, positionInTier: newIndex }
        }
        return m
      })
      setMovies(updatedMovies)
    } else {
      const updatedMovies = movies.map((m) => {
        if (m.id === active.id) {
          return { ...m, currentTier: targetTierId, positionInTier: targetIndex }
        }
        if (m.currentTier === targetTierId && m.id !== active.id) {
          const currentIndex = getMoviesInTier(targetTierId).findIndex((tm) => tm.id === m.id)
          if (currentIndex >= targetIndex) {
            return { ...m, positionInTier: (m.positionInTier || 0) + 1 }
          }
        }
        if (m.currentTier === sourceTierId && m.id !== active.id) {
          const currentIndex = sourceMovies.findIndex((sm) => sm.id === m.id)
          if (currentIndex > sourceIndex) {
            return { ...m, positionInTier: (m.positionInTier || 0) - 1 }
          }
        }
        return m
      })
      setMovies(updatedMovies)
    }
  }

  const sortedTiers = [...tiers].sort((a, b) => a.order - b.order)
  const [selectedTierId, setSelectedTierId] = useState(null)

  const handleMoveTier = (tierId, direction) => {
    const sorted = [...tiers].sort((a, b) => a.order - b.order)
    const tierIndex = sorted.findIndex((t) => t.id === tierId)
    if (tierIndex === -1) return

    const newIndex = direction === 'up' ? tierIndex - 1 : tierIndex + 1
    if (newIndex < 0 || newIndex >= sorted.length) return

    // Swap orders
    const targetTier = sorted[newIndex]
    const currentTier = sorted[tierIndex]

    setTiers((prevTiers) =>
      prevTiers.map((tier) => {
        if (tier.id === currentTier.id) {
          return { ...tier, order: targetTier.order }
        }
        if (tier.id === targetTier.id) {
          return { ...tier, order: currentTier.order }
        }
        return tier
      })
    )
  }

  const handleEditTier = (tier) => {
    setSelectedTierId(tier.id)
    setShowSettings(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 p-4 bg-[#1a1a1a]/50 backdrop-blur-sm border border-gray-800 rounded-xl">
          <div className="flex items-start gap-4 flex-1 min-w-0 w-full md:w-auto">
            {editingTitle ? (
              <textarea
                value={titleValue}
                onChange={(e) => {
                  setTitleValue(e.target.value)
                  // Auto-resize textarea
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                onBlur={() => {
                  setTierListName(titleValue || 'My Tier List')
                  setEditingTitle(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    setTierListName(titleValue || 'My Tier List')
                    setEditingTitle(false)
                  }
                  if (e.key === 'Escape') {
                    setTitleValue(tierListName)
                    setEditingTitle(false)
                  }
                }}
                className="text-2xl md:text-3xl font-bold text-white bg-transparent border-b-2 border-blue-500 outline-none w-full resize-none break-words whitespace-pre-wrap overflow-wrap-anywhere"
                style={{ 
                  minHeight: '2.5rem', 
                  maxHeight: '15rem',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  lineHeight: '1.2',
                  padding: '0.25rem 0',
                  wordWrap: 'break-word',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere'
                }}
                rows={1}
                wrap="soft"
                autoFocus
              />
            ) : (
              <h1
                className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent cursor-pointer hover:from-blue-300 hover:to-purple-300 transition-all flex items-start gap-3 break-words overflow-wrap-anywhere word-break-break-word min-w-0 flex-1"
                onClick={() => setEditingTitle(true)}
                title="Click to edit"
              >
                <span className="break-words whitespace-pre-wrap overflow-wrap-anywhere">{tierListName}</span>
                <svg className="w-5 h-5 text-gray-500 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </h1>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <ExportButton />
          </div>
        </div>

        <DndContext
          sensors={[sensor]}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(e.active.id)}
          onDragEnd={handleDragEnd}
        >
          <div data-tier-container className="space-y-1 w-full">
            {sortedTiers.map((tier, index) => {
              const tierMovies = getMoviesInTier(tier.id)
              return (
                <TierRow
                  key={tier.id}
                  tier={tier}
                  movies={tierMovies}
                  onEdit={handleEditTier}
                  onMoveUp={() => handleMoveTier(tier.id, 'up')}
                  onMoveDown={() => handleMoveTier(tier.id, 'down')}
                  canMoveUp={index > 0}
                  canMoveDown={index < sortedTiers.length - 1}
                />
              )
            })}

            <UncategorizedPool movies={uncategorizedMovies} activeId={activeId} />
          </div>

          <DragOverlay>
            {activeMovie ? (
              <div className="relative w-24 h-36 overflow-hidden shadow-2xl opacity-90">
                {activeMovie.posterUrl ? (
                  <Image
                    src={activeMovie.posterUrl}
                    alt={activeMovie.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-center p-2 bg-gray-700 text-white">
                    {activeMovie.title}
                  </div>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <TierSettings 
          isOpen={showSettings} 
          onClose={() => {
            setShowSettings(false)
            setSelectedTierId(null)
          }}
          selectedTierId={selectedTierId}
        />
      </div>
    </div>
  )
}
