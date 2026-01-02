import { NextResponse } from 'next/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY || ''
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

// Cache to avoid duplicate requests
const metadataCache = new Map()

// Rate limiter: 40 requests per 10 seconds (conservative limit)
class RateLimiter {
  constructor(maxRequests = 40, windowMs = 10000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.requests = []
  }

  async waitForSlot() {
    const now = Date.now()
    
    // Remove requests outside the time window
    this.requests = this.requests.filter((time) => now - time < this.windowMs)
    
    // If we're at the limit, wait until the oldest request expires
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0]
      const waitTime = this.windowMs - (now - oldestRequest) + 100 // Add 100ms buffer
      await new Promise((resolve) => setTimeout(resolve, waitTime))
      // Recursively check again after waiting
      return this.waitForSlot()
    }
    
    // Record this request
    this.requests.push(now)
  }
}

// Create rate limiter instances per API key
const rateLimiters = new Map()

function getRateLimiter(apiKey) {
  if (!rateLimiters.has(apiKey)) {
    rateLimiters.set(apiKey, new RateLimiter(40, 10000))
  }
  return rateLimiters.get(apiKey)
}

async function searchTMDB(title, apiKey, retryCount = 0) {
  // Check cache first (cache is shared across API keys for efficiency)
  const cacheKey = title.toLowerCase().trim()
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey)
  }

  // Wait for rate limit slot
  const limiter = getRateLimiter(apiKey)
  await limiter.waitForSlot()

  try {
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}&page=1`
    const response = await fetch(searchUrl)

    // Handle rate limiting (429 Too Many Requests)
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000 // Default 2 seconds
      
      if (retryCount < 3) {
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        return searchTMDB(title, apiKey, retryCount + 1)
      } else {
        throw new Error('Rate limit exceeded. Please try again in a few seconds.')
      }
    }

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }

    const data = await response.json()
    const results = data.results || []

    if (results.length === 0) {
      const result = {
        id: null,
        title,
        posterUrl: null,
        tmdbId: null,
        releaseYear: null,
        genres: [],
      }
      metadataCache.set(cacheKey, result)
      return result
    }

    // Take the first result (most popular match)
    const movie = results[0]
    const result = {
      id: `tmdb-${movie.id}`,
      title: movie.title || title,
      posterUrl: movie.poster_path
        ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
        : null,
      tmdbId: movie.id,
      releaseYear: movie.release_date
        ? new Date(movie.release_date).getFullYear()
        : null,
      genres: movie.genre_ids || [],
      currentTier: 'uncategorized',
      positionInTier: 0,
    }

    metadataCache.set(cacheKey, result)
    return result
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error fetching TMDB data for "${title}":`, error)
    }
    // Return fallback data
    const result = {
      id: `fallback-${Date.now()}-${Math.random()}`,
      title,
      posterUrl: null,
      tmdbId: null,
      releaseYear: null,
      genres: [],
      currentTier: 'uncategorized',
      positionInTier: 0,
    }
    metadataCache.set(cacheKey, result)
    return result
  }
}

export async function POST(request) {
  try {
    const { movies, userApiKey } = await request.json()
    
    // Use user's API key if provided, otherwise fall back to server key
    const apiKey = userApiKey || TMDB_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'TMDB API key not provided. Please provide your TMDB API key or configure TMDB_API_KEY environment variable.',
        },
        { status: 400 }
      )
    }

    if (!movies || !Array.isArray(movies)) {
      return NextResponse.json(
        { error: 'Invalid request: movies array required' },
        { status: 400 }
      )
    }

    // Deduplicate input movies by title first
    const uniqueTitles = new Map()
    const uniqueInputMovies = []
    
    movies.forEach((movie) => {
      const titleKey = movie.title.toLowerCase().trim()
      if (!uniqueTitles.has(titleKey)) {
        uniqueTitles.set(titleKey, true)
        uniqueInputMovies.push(movie)
      }
    })

    // Fetch metadata for unique movies only with rate limiting
    // Process in batches to show progress and respect rate limits
    const enrichedMovies = []
    const batchSize = 10 // Process 10 at a time
    
    for (let i = 0; i < uniqueInputMovies.length; i += batchSize) {
      const batch = uniqueInputMovies.slice(i, i + batchSize)
      const batchPromises = batch.map((movie) => searchTMDB(movie.title, apiKey))
      const batchResults = await Promise.all(batchPromises)
      enrichedMovies.push(...batchResults)
    }

    // Deduplicate by TMDB ID to handle same movie with different titles
    const seenTmdbIds = new Map()
    const finalMovies = []
    
    enrichedMovies.forEach((movie, index) => {
      // Use TMDB ID if available, otherwise use title
      const uniqueKey = movie.tmdbId ? `tmdb-${movie.tmdbId}` : `title-${movie.title.toLowerCase().trim()}`
      
      if (!seenTmdbIds.has(uniqueKey)) {
        seenTmdbIds.set(uniqueKey, true)
        finalMovies.push({
          ...movie,
          id: movie.id || `movie-${Date.now()}-${index}`,
        })
      }
    })

    return NextResponse.json({ movies: finalMovies })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in fetch-metadata:', error)
    }
    
    let errorMessage = 'An unexpected error occurred while fetching movie metadata'
    let statusCode = 500
    
    if (error.message) {
      errorMessage = error.message
    } else if (error.name === 'TypeError') {
      errorMessage = 'Network error: Could not connect to TMDB API. Please check your internet connection.'
      statusCode = 503
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
