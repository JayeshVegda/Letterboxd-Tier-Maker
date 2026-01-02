'use client'

import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'

export default function YearSelectionStep({ onBack, onComplete }) {
  const { letterboxdData, diaryData, setSelectedYear, setMovies } = useApp()
  const [selectedYearState, setSelectedYearState] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Use letterboxdData.diary if available, fallback to legacy diaryData
  const activeDiaryData = letterboxdData?.diary?.length > 0 ? letterboxdData.diary : diaryData

  const availableYears = useMemo(() => {
    const years = new Set()
    activeDiaryData.forEach((entry) => {
      if (entry.watchedDate) {
        const year = new Date(entry.watchedDate).getFullYear()
        if (!isNaN(year)) {
          years.add(year)
        }
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [activeDiaryData])

  const handleYearSelect = async (year) => {
    setSelectedYearState(year)
    setIsLoading(true)

    try {
      const moviesForYear = activeDiaryData.filter((entry) => {
        if (!entry.watchedDate) return false
        const entryYear = new Date(entry.watchedDate).getFullYear()
        return entryYear === year
      })

      // Fetch TMDB metadata for all movies
      const response = await fetch('/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movies: moviesForYear.map((entry) => ({
            title: entry.title,
            watchedDate: entry.watchedDate,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch movie metadata')
      }

      const { movies: enrichedMovies } = await response.json()
      
      // Deduplicate movies by TMDB ID or title
      const uniqueMovies = []
      const seenMovies = new Map()
      
      enrichedMovies.forEach((movie) => {
        // Use TMDB ID as primary key, fallback to title
        const key = movie.tmdbId ? `tmdb-${movie.tmdbId}` : movie.title.toLowerCase().trim()
        
        if (!seenMovies.has(key)) {
          seenMovies.set(key, true)
          uniqueMovies.push(movie)
        }
      })
      
      setMovies(uniqueMovies)
      setSelectedYear(year)
      onComplete()
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching metadata:', err)
      }
      alert('Failed to fetch movie metadata. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Select Year</h2>
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            ← Back
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Choose a year to create your tier list for:
        </p>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73D700] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Fetching movie posters and metadata...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {availableYears.map((year) => {
              const count = activeDiaryData.filter((entry) => {
                if (!entry.watchedDate) return false
                return new Date(entry.watchedDate).getFullYear() === year
              }).length

              return (
                <button
                  key={year}
                  onClick={() => handleYearSelect(year)}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    selectedYearState === year
                      ? 'border-[#73D700] bg-[#73D700]/10 dark:bg-[#73D700]/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-[#73D700]/50 dark:hover:border-[#73D700]'
                  }`}
                >
                  <div className="text-3xl font-bold mb-2">{year}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {count} {count === 1 ? 'movie' : 'movies'}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
