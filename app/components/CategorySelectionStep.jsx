'use client'

import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'

export default function CategorySelectionStep({ onBack, onComplete }) {
  const { letterboxdData, setMovies, selectedCategory: storedCategory, selectedValue: storedValue, setSelectedCategory: setSelectedCategoryContext, setSelectedValue: setSelectedValueContext, setTierListName, userApiKey } = useApp()
  const [selectedCategory, setSelectedCategory] = useState(storedCategory || null)
  const [selectedValue, setSelectedValue] = useState(storedValue || null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' })
  const [error, setError] = useState(null)

  // Extract available years from diary
  const availableYears = useMemo(() => {
    const years = new Set()
    letterboxdData?.diary?.forEach((entry) => {
      if (entry.watchedDate) {
        const year = new Date(entry.watchedDate).getFullYear()
        if (!isNaN(year)) {
          years.add(year)
        }
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [letterboxdData])

  const categories = useMemo(() => {
    const cats = []
    
    // Years category
    if (availableYears.length > 0) {
      cats.push({
        id: 'years',
        name: 'Years',
        icon: '📅',
        description: 'Rank movies by watch year',
        count: availableYears.length,
      })
    }

    // Lists category
    if (letterboxdData?.lists && letterboxdData.lists.length > 0) {
      cats.push({
        id: 'lists',
        name: 'Lists',
        icon: '📋',
        description: 'Rank movies from your custom lists',
        count: letterboxdData.lists.length,
      })
    }

    // Liked Films category
    if (letterboxdData?.likes && letterboxdData.likes.length > 0) {
      cats.push({
        id: 'likes',
        name: 'Liked Films',
        icon: '❤️',
        description: 'Rank your liked movies',
        count: letterboxdData.likes.length,
      })
    }

    // Watchlist category
    if (letterboxdData?.watchlist && letterboxdData.watchlist.length > 0) {
      cats.push({
        id: 'watchlist',
        name: 'Watchlist',
        icon: '👀',
        description: 'Rank movies in your watchlist',
        count: letterboxdData.watchlist.length,
      })
    }

    // All Watched category
    if (letterboxdData?.watched && letterboxdData.watched.length > 0) {
      cats.push({
        id: 'watched',
        name: 'All Watched',
        icon: '🎬',
        description: 'Rank all movies you\'ve watched',
        count: letterboxdData.watched.length,
      })
    }

    return cats
  }, [letterboxdData, availableYears])

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId)
    setSelectedValue(null)
  }

  const handleValueSelect = async (value) => {
    setSelectedValue(value)
    setIsLoading(true)
    setError(null)

    try {
      let moviesToRank = []

      if (selectedCategory === 'years') {
        // Filter diary by year
        const year = value
        moviesToRank = letterboxdData.diary
          .filter((entry) => {
            if (!entry.watchedDate) return false
            const entryYear = new Date(entry.watchedDate).getFullYear()
            return entryYear === year
          })
          .map((entry) => ({
            title: entry.title,
            watchedDate: entry.watchedDate,
          }))
      } else if (selectedCategory === 'lists') {
        // Get movies from selected list
        const list = letterboxdData.lists.find((l) => l.id === value)
        if (list) {
          moviesToRank = list.movies.map((movie) => ({
            title: movie.title,
            watchedDate: null, // Lists don't have watch dates
          }))
        }
      } else if (selectedCategory === 'likes') {
        // All liked movies
        moviesToRank = letterboxdData.likes.map((like) => ({
          title: like.title,
          watchedDate: null,
        }))
      } else if (selectedCategory === 'watchlist') {
        // All watchlist movies
        moviesToRank = letterboxdData.watchlist.map((item) => ({
          title: item.title,
          watchedDate: null,
        }))
      } else if (selectedCategory === 'watched') {
        // All watched movies
        moviesToRank = letterboxdData.watched.map((item) => ({
          title: item.title,
          watchedDate: null,
        }))
      }

      // Fetch TMDB metadata for all movies with progress tracking
      setLoadingProgress({ current: 0, total: moviesToRank.length, message: 'Fetching movie metadata...' })
      
      const response = await fetch('/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movies: moviesToRank,
          userApiKey: userApiKey || undefined,
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to fetch movie metadata'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          
          // Provide specific guidance based on error
          if (errorMessage.includes('TMDB API key')) {
            errorMessage = 'TMDB API key is required. Please provide your API key in the upload step, or the server needs to be configured with a default API key.'
          } else if (errorMessage.includes('Rate limit')) {
            errorMessage = 'Too many requests. The system is rate limiting to avoid API issues. Please wait a moment and try again.'
          } else if (errorMessage.includes('Invalid request')) {
            errorMessage = 'Invalid request format. Please try selecting the category again.'
          } else if (response.status === 429) {
            errorMessage = 'Rate limit exceeded. Please wait a few seconds and try again.'
          } else if (response.status === 500) {
            errorMessage = 'Server error occurred while fetching movie data. Please try again later.'
          }
        } catch (parseError) {
          if (response.status === 429) {
            errorMessage = 'Rate limit exceeded. Please wait a few seconds and try again.'
          } else if (response.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.'
          } else {
            errorMessage = `Failed to fetch metadata (${response.status}). Please try again.`
          }
        }
        throw new Error(errorMessage)
      }
      
      setLoadingProgress({ current: moviesToRank.length, total: moviesToRank.length, message: 'Processing results...' })

      const { movies: enrichedMovies } = await response.json()
      
      // Deduplicate movies by TMDB ID or title
      const uniqueMovies = []
      const seenMovies = new Map()
      
      enrichedMovies.forEach((movie) => {
        const key = movie.tmdbId ? `tmdb-${movie.tmdbId}` : movie.title.toLowerCase().trim()
        
        if (!seenMovies.has(key)) {
          seenMovies.set(key, true)
          uniqueMovies.push(movie)
        }
      })
      
      // Generate tier list name based on profile and selection
      const profile = letterboxdData?.profile
      let generatedName = 'My Tier List'
      
      if (profile) {
        const username = profile.username || profile.displayName || 'My'
        const displayName = profile.displayName || profile.username || ''
        
        if (selectedCategory === 'years') {
          generatedName = `${username}'s ${value} Rankings`
        } else if (selectedCategory === 'lists') {
          const list = letterboxdData.lists.find((l) => l.id === value)
          const listName = list?.name || 'List'
          // Clean up list name (remove file extension patterns, make it readable)
          const cleanListName = listName
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase())
          generatedName = `${username}'s ${cleanListName} Rankings`
        } else if (selectedCategory === 'likes') {
          generatedName = `${username}'s Liked Films Rankings`
        } else if (selectedCategory === 'watchlist') {
          generatedName = `${username}'s Watchlist Rankings`
        } else if (selectedCategory === 'watched') {
          generatedName = `${username}'s All Watched Rankings`
        } else {
          generatedName = displayName ? `${displayName}'s Tier List` : `${username}'s Tier List`
        }
      }
      
      // Store in context and proceed
      setMovies(uniqueMovies)
      setSelectedCategoryContext(selectedCategory)
      setSelectedValueContext(value)
      if (generatedName !== 'My Tier List') {
        setTierListName(generatedName)
      }
      onComplete()
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching metadata:', err)
      }
      setError(err.message || 'Failed to fetch movie metadata. Please try again.')
      
      // Handle network errors
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Network error: Could not connect to the server. Please check your internet connection and try again.')
      }
    } finally {
      setIsLoading(false)
      setLoadingProgress({ current: 0, total: 0, message: '' })
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-2xl p-8 md:p-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Select Category</h2>
            <p className="text-gray-400">
              Choose how you want to rank your movies
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {!selectedCategory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className="group p-6 rounded-xl border border-gray-700 bg-[#0f0f0f]/50 hover:border-blue-500/50 hover:bg-[#0f0f0f]/80 transition-all duration-300 text-left transform hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300">
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-400">
                      {category.count} {category.count === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                  {category.description}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button
              onClick={() => {
                setSelectedCategory(null)
                setSelectedValue(null)
              }}
              className="mb-6 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to categories
            </button>

            {isLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
                <p className="text-gray-300 text-lg font-medium mb-2">
                  {loadingProgress.message || 'Fetching movie posters and metadata...'}
                </p>
                {loadingProgress.total > 0 && (
                  <div className="mb-4">
                    <div className="w-full max-w-md mx-auto bg-gray-800 rounded-full h-2 mb-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-gray-500 text-sm">
                      {loadingProgress.current} of {loadingProgress.total} movies processed
                    </p>
                    <p className="text-gray-600 text-xs mt-2">
                      Rate limiting active: ~40 requests per 10 seconds
                    </p>
                  </div>
                )}
                <p className="text-gray-500 text-sm">
                  {loadingProgress.total > 50 ? 'Large list detected - this may take a few minutes' : 'This may take a moment'}
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-6 p-5 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-red-300 font-semibold mb-1">Error Loading Movies</p>
                        <p className="text-red-200/90 text-sm mb-3">{error}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setError(null)
                              if (selectedValue) {
                                handleValueSelect(selectedValue)
                              }
                            }}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all"
                          >
                            Try Again
                          </button>
                          <button
                            onClick={() => setError(null)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-all"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                {selectedCategory === 'years' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {availableYears.map((year) => {
                      const count = letterboxdData.diary.filter((entry) => {
                        if (!entry.watchedDate) return false
                        return new Date(entry.watchedDate).getFullYear() === year
                      }).length

                      return (
                        <button
                          key={year}
                          onClick={() => handleValueSelect(year)}
                          className={`p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                            selectedValue === year
                              ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                              : 'border-gray-700 bg-[#0f0f0f]/50 hover:border-blue-500/50 hover:bg-[#0f0f0f]/80'
                          }`}
                        >
                          <div className={`text-4xl font-bold mb-2 ${selectedValue === year ? 'text-blue-400' : 'text-white'}`}>
                            {year}
                          </div>
                          <div className={`text-sm ${selectedValue === year ? 'text-blue-300' : 'text-gray-400'}`}>
                            {count} {count === 1 ? 'movie' : 'movies'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {selectedCategory === 'lists' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {letterboxdData.lists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => handleValueSelect(list.id)}
                        className={`p-6 rounded-xl border-2 transition-all duration-300 text-left transform hover:scale-[1.02] ${
                          selectedValue === list.id
                            ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                            : 'border-gray-700 bg-[#0f0f0f]/50 hover:border-blue-500/50 hover:bg-[#0f0f0f]/80'
                        }`}
                      >
                        <h3 className={`text-xl font-bold mb-2 ${selectedValue === list.id ? 'text-blue-400' : 'text-white'}`}>
                          {list.name}
                        </h3>
                        <p className={`text-sm ${selectedValue === list.id ? 'text-blue-300' : 'text-gray-400'}`}>
                          {list.movies.length} {list.movies.length === 1 ? 'movie' : 'movies'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {(selectedCategory === 'likes' || selectedCategory === 'watchlist' || selectedCategory === 'watched') && (
                  <div className="text-center py-12">
                    <button
                      onClick={() => handleValueSelect(selectedCategory)}
                      className="px-10 py-5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
                    >
                      Rank All {selectedCategory === 'likes' ? 'Liked Films' : selectedCategory === 'watchlist' ? 'Watchlist' : 'Watched Movies'}
                    </button>
                    <p className="mt-6 text-gray-400 text-lg">
                      {selectedCategory === 'likes' && letterboxdData.likes.length} 
                      {selectedCategory === 'watchlist' && letterboxdData.watchlist.length}
                      {selectedCategory === 'watched' && letterboxdData.watched.length} movies
                    </p>
                  </div>
                )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
