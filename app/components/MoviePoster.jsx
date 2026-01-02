'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'

export default function MoviePoster({ movie, isDragging: externalDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: movie.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging || externalDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing select-none group"
    >
      <div className="relative w-24 h-36 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:scale-105 border border-gray-700 hover:border-blue-500/50">
        {movie.posterUrl ? (
          <>
            <Image
              src={movie.posterUrl}
              alt={movie.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="96px"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute bottom-0 left-0 right-0 p-1.5 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">
              {movie.title}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-center p-2 text-gray-400 group-hover:text-gray-300 transition-colors">
            {movie.title}
          </div>
        )}
      </div>
    </div>
  )
}
