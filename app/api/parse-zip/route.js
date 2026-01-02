import { NextResponse } from 'next/server'
import Papa from 'papaparse'
import JSZip from 'jszip'

function parseCSV(text, fileName) {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data)
      },
      error: (error) => {
        reject(new Error(`Failed to parse ${fileName}: ${error.message}`))
      },
    })
  })
}

function parseDiary(data) {
  return data.map((row, index) => {
    const title = row.Name || row['Movie'] || row['Title'] || row.name || ''
    const watchedDate = row.Date || row['Watched Date'] || row.date || ''
    const rating = row.Rating || row.rating || null
    const uri = row['Letterboxd URI'] || row.uri || row['URI'] || ''
    const year = row.Year || null

    return {
      id: `diary-${index}`,
      title: title.trim(),
      watchedDate: watchedDate.trim(),
      rating: rating ? rating.trim() : null,
      uri: uri.trim(),
      year: year ? year.trim() : null,
    }
  }).filter((entry) => entry.title && entry.watchedDate)
}

function parseWatched(data) {
  return data.map((row, index) => {
    const title = row.Name || row['Movie'] || row['Title'] || row.name || ''
    const uri = row['Letterboxd URI'] || row.uri || row['URI'] || ''
    const year = row.Year || null

    return {
      id: `watched-${index}`,
      title: title.trim(),
      uri: uri.trim(),
      year: year ? year.trim() : null,
    }
  }).filter((entry) => entry.title)
}

function parseRatings(data) {
  return data.map((row, index) => {
    const title = row.Name || row['Movie'] || row['Title'] || row.name || ''
    const rating = row.Rating || row.rating || null
    const uri = row['Letterboxd URI'] || row.uri || row['URI'] || ''
    const year = row.Year || null

    return {
      id: `rating-${index}`,
      title: title.trim(),
      rating: rating ? rating.trim() : null,
      uri: uri.trim(),
      year: year ? year.trim() : null,
    }
  }).filter((entry) => entry.title)
}

function parseLikes(data) {
  return data.map((row, index) => {
    const title = row.Name || row['Movie'] || row['Title'] || row.name || ''
    const uri = row['Letterboxd URI'] || row.uri || row['URI'] || ''
    const year = row.Year || null

    return {
      id: `like-${index}`,
      title: title.trim(),
      uri: uri.trim(),
      year: year ? year.trim() : null,
    }
  }).filter((entry) => entry.title)
}

function parseWatchlist(data) {
  return data.map((row, index) => {
    const title = row.Name || row['Movie'] || row['Title'] || row.name || ''
    const uri = row['Letterboxd URI'] || row.uri || row['URI'] || ''
    const year = row.Year || null

    return {
      id: `watchlist-${index}`,
      title: title.trim(),
      uri: uri.trim(),
      year: year ? year.trim() : null,
    }
  }).filter((entry) => entry.title)
}

function parseListFile(text, listFileName) {
  return new Promise((resolve, reject) => {
    // Lists have a special format with header section and then Position column
    const lines = text.split('\n')
    let dataStartIndex = 0
    
    // Find where the actual list data starts (after header section)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Position,Name,Year')) {
        dataStartIndex = i
        break
      }
    }
    
    const dataSection = lines.slice(dataStartIndex).join('\n')
    
    Papa.parse(dataSection, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const movies = results.data.map((row, index) => {
          const title = row.Name || row['Movie'] || row['Title'] || row.name || ''
          const position = row.Position || row.position || null
          const uri = row.URL || row['Letterboxd URI'] || row.uri || row['URI'] || ''
          const year = row.Year || null
          const description = row.Description || row.description || ''

          return {
            id: `list-item-${index}`,
            title: title.trim(),
            position: position ? parseInt(position) : null,
            uri: uri.trim(),
            year: year ? year.trim() : null,
            description: description.trim(),
          }
        }).filter((entry) => entry.title)
        
        resolve(movies)
      },
      error: (error) => {
        reject(new Error(`Failed to parse list ${listFileName}: ${error.message}`))
      },
    })
  })
}

function parseProfile(data) {
  if (!data || data.length === 0) return null

  const row = data[0]
  return {
    username: row.Username || row.username || '',
    displayName: row['Given Name'] || row['given name'] || row.displayName || '',
    email: row['Email Address'] || row['email address'] || '',
    location: row.Location || row.location || '',
    bio: row.Bio || row.bio || '',
    favoriteFilms: row['Favorite Films'] || row['favorite films'] || '',
    dateJoined: row['Date Joined'] || row['date joined'] || '',
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check if it's a ZIP file
    if (!file.name.endsWith('.zip') && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
      return NextResponse.json({ error: 'Please upload a ZIP file' }, { status: 400 })
    }

    // Read ZIP file as array buffer
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    const result = {
      diary: [],
      watched: [],
      ratings: [],
      likes: [],
      watchlist: [],
      reviews: [],
      lists: [], // Array of { name, fileName, movies }
      profile: null,
      availableFiles: [],
    }

    // Parse root-level CSV files
    const rootFiles = {
      diary: 'diary.csv',
      watched: 'watched.csv',
      ratings: 'ratings.csv',
      watchlist: 'watchlist.csv',
      profile: 'profile.csv',
    }

    for (const [key, fileName] of Object.entries(rootFiles)) {
      const zipFile = zip.file(fileName)
      
      if (zipFile) {
        result.availableFiles.push(fileName)
        const text = await zipFile.async('string')
        const rawData = await parseCSV(text, fileName)

        switch (key) {
          case 'diary':
            result.diary = parseDiary(rawData)
            break
          case 'watched':
            result.watched = parseWatched(rawData)
            break
          case 'ratings':
            result.ratings = parseRatings(rawData)
            break
          case 'watchlist':
            result.watchlist = parseWatchlist(rawData)
            break
          case 'profile':
            result.profile = parseProfile(rawData)
            break
        }
      }
    }

    // Parse likes/films.csv
    const likesFile = zip.file('likes/films.csv')
    if (likesFile) {
      result.availableFiles.push('likes/films.csv')
      const text = await likesFile.async('string')
      const rawData = await parseCSV(text, 'likes/films.csv')
      result.likes = parseLikes(rawData)
    }

    // Parse lists from lists/ folder
    const listFiles = []
    zip.forEach((relativePath, file) => {
      if (relativePath.startsWith('lists/') && relativePath.endsWith('.csv')) {
        listFiles.push(relativePath)
      }
    })

    for (const listPath of listFiles) {
      const listFile = zip.file(listPath)
      if (listFile) {
        result.availableFiles.push(listPath)
        const text = await listFile.async('string')
        try {
          const movies = await parseListFile(text, listPath)
          const listName = listPath.replace('lists/', '').replace('.csv', '').replace(/-/g, ' ')
          result.lists.push({
            id: `list-${listPath}`,
            name: listName,
            fileName: listPath,
            movies: movies,
          })
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error parsing list ${listPath}:`, error)
          }
        }
      }
    }

    // Ensure we have at least some data
    if (result.diary.length === 0 && result.watched.length === 0 && result.lists.length === 0) {
      return NextResponse.json(
        { error: 'ZIP file must contain at least diary.csv, watched.csv, or lists' },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error parsing ZIP:', error)
    }
    
    let errorMessage = 'Failed to parse ZIP file'
    let statusCode = 500
    
    if (error.message) {
      if (error.message.includes('not a zip')) {
        errorMessage = 'The uploaded file is not a valid ZIP file. Please make sure you uploaded a ZIP file exported from Letterboxd.'
        statusCode = 400
      } else if (error.message.includes('corrupted')) {
        errorMessage = 'The ZIP file appears to be corrupted. Please try exporting again from Letterboxd.'
        statusCode = 400
      } else if (error.message.includes('Failed to parse')) {
        errorMessage = `Error parsing file: ${error.message}. Please make sure your Letterboxd export is complete and not corrupted.`
        statusCode = 400
      } else {
        errorMessage = `Failed to parse ZIP file: ${error.message}`
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
