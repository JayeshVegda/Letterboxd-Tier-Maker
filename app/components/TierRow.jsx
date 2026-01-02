'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import MoviePoster from './MoviePoster'
import { useApp } from '../context/AppContext'

export default function TierRow({ tier, movies, onEdit, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const { setNodeRef, isOver } = useDroppable({
    id: tier.id,
  })
  const { setTiers } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(tier.name)

  const handleNameClick = () => {
    setIsEditing(true)
    setEditValue(tier.name)
  }

  const handleNameSave = () => {
    setTiers((prevTiers) =>
      prevTiers.map((t) =>
        t.id === tier.id
          ? { ...t, name: editValue || t.name, number: editValue || t.number }
          : t
      )
    )
    setIsEditing(false)
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSave()
    }
    if (e.key === 'Escape') {
      setEditValue(tier.name)
      setIsEditing(false)
    }
  }

  return (
    <div className="flex w-full min-h-[140px] bg-[#1a1a1a]/80 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden shadow-lg mb-2 transition-all hover:shadow-xl hover:border-gray-700" style={{ width: '100%' }}>
      {/* Colored Label */}
      <div
        className="flex items-center justify-center text-white font-bold text-sm uppercase shrink-0 px-4 cursor-pointer transition-all hover:brightness-110"
        style={{ 
          backgroundColor: tier.color || '#6B7280',
          minWidth: '140px',
          width: '140px',
        }}
        onClick={handleNameClick}
      >
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            className="w-full bg-transparent border-b-2 border-white text-white text-center font-bold uppercase outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-center leading-tight">
            {tier.name}
          </span>
        )}
      </div>
      
      {/* Content Area */}
      <div
        ref={setNodeRef}
        className={`flex-1 bg-[#0f0f0f]/50 flex flex-wrap content-start gap-3 p-4 min-h-[140px] transition-all duration-300 relative ${
          isOver ? 'bg-blue-500/10 ring-4 ring-blue-500/30 ring-inset' : 'hover:bg-[#0f0f0f]/70'
        }`}
        style={{
          minHeight: '140px',
          width: '100%',
          flex: '1 1 auto',
          minWidth: 0,
        }}
      >
        {movies.length > 0 ? (
          <SortableContext items={movies.map((m) => m.id)} strategy={rectSortingStrategy}>
            {movies.map((movie) => (
              <MoviePoster key={movie.id} movie={movie} />
            ))}
          </SortableContext>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm pointer-events-none z-0 border-2 border-dashed border-gray-700 rounded-lg m-2">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Drop movies here
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center justify-center shrink-0 w-14 bg-[#1a1a1a]/50 border-l border-gray-800">
        <button
          onClick={() => onEdit(tier)}
          className="p-2.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800/50 rounded-lg transition-all"
          title="Edit tier"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <div className="flex flex-col gap-1 mt-2">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800/50 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400"
            title="Move up"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800/50 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400"
            title="Move down"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
