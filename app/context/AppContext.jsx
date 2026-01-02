'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext()

const STORAGE_KEY = 'letterbox_tiermaker_state'
const ZIP_DATA_KEY = 'letterbox_tiermaker_zip_data'
const DEFAULT_TIERS = [
  { id: 'tier-1', name: 'Absolute Cinema', order: 0, color: '#FF6B6B', emoji: '🏆', number: 1 },
  { id: 'tier-2', name: 'Gem Alert', order: 1, color: '#4ECDC4', emoji: '🥈', number: 2 },
  { id: 'tier-3', name: 'Average', order: 2, color: '#FFE66D', emoji: '🥉', number: 3 },
  { id: 'tier-4', name: 'Okay', order: 3, color: '#95E1D3', emoji: '👍', number: 4 },
  { id: 'tier-5', name: 'Delete Button', order: 4, color: '#A8A8A8', emoji: '👌', number: 5 },
]

function loadFromStorage() {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    // Validate structure
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load from localStorage:', error)
    }
  }
  
  return null
}

function loadZipDataFromStorage() {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(ZIP_DATA_KEY)
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    // Validate structure
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load ZIP data from localStorage:', error)
    }
  }
  
  return null
}

function saveZipDataToStorage(zipData) {
  if (typeof window === 'undefined') return
  
  try {
    // Save ZIP data separately to avoid quota issues
    const dataToSave = {
      diary: zipData.diary || [],
      watched: zipData.watched || [],
      ratings: zipData.ratings || [],
      likes: zipData.likes || [],
      watchlist: zipData.watchlist || [],
      reviews: zipData.reviews || [],
      lists: zipData.lists || [],
      profile: zipData.profile || null,
      availableFiles: zipData.availableFiles || [],
      lastSaved: new Date().toISOString(),
    }
    localStorage.setItem(ZIP_DATA_KEY, JSON.stringify(dataToSave))
  } catch (error) {
    // Handle quota exceeded error silently in production
    if (error.name === 'QuotaExceededError') {
      try {
        // Save only essential data if full save fails
        const minimalData = {
          profile: zipData.profile || null,
          availableFiles: zipData.availableFiles || [],
          lastSaved: new Date().toISOString(),
        }
        localStorage.setItem(ZIP_DATA_KEY, JSON.stringify(minimalData))
      } catch (minimalError) {
        // Silently fail - user can re-upload if needed
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to save minimal ZIP data:', minimalError)
        }
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.error('Failed to save ZIP data to localStorage:', error)
    }
  }
}

function saveToStorage(state) {
  if (typeof window === 'undefined') return
  
  try {
    // Only save essential state (not diaryData to avoid storage limits)
    const stateToSave = {
      movies: state.movies,
      tiers: state.tiers,
      tierListName: state.tierListName,
      selectedYear: state.selectedYear,
      selectedCategory: state.selectedCategory,
      selectedValue: state.selectedValue,
      userApiKey: state.userApiKey,
      lastSaved: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
  } catch (error) {
    // Handle quota exceeded error silently in production
    if (error.name === 'QuotaExceededError') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (clearError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to clear localStorage:', clearError)
        }
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.error('Failed to save to localStorage:', error)
    }
  }
}

export function AppProvider({ children }) {
  const storedState = loadFromStorage()
  const storedZipData = loadZipDataFromStorage()
  
  // Store all Letterboxd data from ZIP export - load from storage if available
  const [letterboxdData, setLetterboxdData] = useState(storedZipData || {
    diary: [],
    watched: [],
    ratings: [],
    likes: [],
    watchlist: [],
    reviews: [],
    lists: [],
    profile: null,
    availableFiles: [],
  })
  
  // Legacy support: diaryData for backward compatibility
  const [diaryData, setDiaryData] = useState([])
  
  const [selectedYear, setSelectedYear] = useState(storedState?.selectedYear || null)
  const [selectedCategory, setSelectedCategory] = useState(storedState?.selectedCategory || null)
  const [selectedValue, setSelectedValue] = useState(storedState?.selectedValue || null)
  const [movies, setMovies] = useState(storedState?.movies || [])
  const [tierListName, setTierListName] = useState(storedState?.tierListName || 'My Tier List')
  const [tiers, setTiers] = useState(storedState?.tiers || DEFAULT_TIERS)
  const [userApiKey, setUserApiKey] = useState(storedState?.userApiKey || '')

  // Generate tier list name from profile and category
  const generateTierListName = (profile, category, value, letterboxdData) => {
    const username = profile?.username || profile?.displayName || 'My'
    const displayName = profile?.displayName || profile?.username || ''
    
    if (category === 'years' && value) {
      return `${username}'s ${value} Rankings`
    } else if (category === 'lists' && value) {
      const list = letterboxdData?.lists?.find((l) => l.id === value)
      const listName = list?.name || 'List'
      return `${username}'s ${listName} Rankings`
    } else if (category === 'likes') {
      return `${username}'s Liked Films Rankings`
    } else if (category === 'watchlist') {
      return `${username}'s Watchlist Rankings`
    } else if (category === 'watched') {
      return `${username}'s All Watched Rankings`
    }
    
    return displayName ? `${displayName}'s Tier List` : `${username}'s Tier List`
  }

  // Save ZIP data to storage whenever it changes
  useEffect(() => {
    if (letterboxdData && (letterboxdData.diary.length > 0 || letterboxdData.profile || letterboxdData.availableFiles.length > 0)) {
      saveZipDataToStorage(letterboxdData)
    }
  }, [letterboxdData])

  // Sync diaryData when letterboxdData changes (for backward compatibility)
  useEffect(() => {
    if (letterboxdData.diary.length > 0) {
      setDiaryData(letterboxdData.diary)
    }
  }, [letterboxdData])

  // Auto-generate tier list name when category is selected
  useEffect(() => {
    if (letterboxdData.profile && selectedCategory && selectedValue) {
      const generatedName = generateTierListName(
        letterboxdData.profile,
        selectedCategory,
        selectedValue,
        letterboxdData
      )
      if (generatedName && (!tierListName || tierListName === 'My Tier List')) {
        setTierListName(generatedName)
      }
    }
  }, [letterboxdData.profile, selectedCategory, selectedValue])

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (movies.length > 0 || selectedYear !== null || selectedCategory !== null || userApiKey) {
      saveToStorage({
        movies,
        tiers,
        tierListName,
        selectedYear,
        selectedCategory,
        selectedValue,
        userApiKey,
      })
    }
  }, [movies, tiers, tierListName, selectedYear, selectedCategory, selectedValue, userApiKey])

  const value = {
    // New comprehensive data structure
    letterboxdData,
    setLetterboxdData,
    // Legacy support
    diaryData,
    setDiaryData,
    selectedYear,
    setSelectedYear,
    selectedCategory,
    setSelectedCategory,
    selectedValue,
    setSelectedValue,
    movies,
    setMovies,
    tiers,
    setTiers,
    tierListName,
    setTierListName,
    userApiKey,
    setUserApiKey,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
