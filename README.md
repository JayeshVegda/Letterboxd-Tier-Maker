<div align="center">

<img src="./public/favicon.svg" alt="Letterboxd Tier Maker Logo" width="200" height="200">

# Letterboxd Tier Maker

A production-ready TierMaker-style web application for ranking your Letterboxd movies by year, lists, or categories.

</div>

## Overview

This application allows Letterboxd users to:
1. Upload their Letterboxd ZIP export (contains diary.csv, watched.csv, lists, etc.)
2. Select a category (years, lists, likes, watchlist, watched)
3. Automatically fetch movie posters and metadata from TMDB
4. Manually drag and drop movies into tier rows (no auto-ranking)
5. Export the final tier list as PNG image and JSON

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Drag & Drop**: @dnd-kit
- **CSV Parsing**: PapaParse
- **Image Export**: html2canvas
- **Backend**: Next.js API Routes
- **Production Ready**: Optimized with security headers, compression, and SEO metadata

## Setup

1. Install dependencies:
```bash
npm install
```

2. Get a TMDB API key:
   - Sign up at [TMDB](https://www.themoviedb.org/settings/api)
   - Create an API key

3. Create a `.env.local` file:
```env
TMDB_API_KEY=your_api_key_here
NEXT_PUBLIC_SITE_URL=https://your-domain.com  # Optional: for production metadata
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Production Build

1. Generate icons (see `scripts/generate-icons.md`):
```bash
# Use ImageMagick or online tools to generate required icons
# Place them in the /public directory
```

2. Build for production:
```bash
npm run build
```

3. Start production server:
```bash
npm start
```

## Production Features

- ✅ Comprehensive SEO metadata (Open Graph, Twitter Cards)
- ✅ Security headers (XSS protection, content type, frame options)
- ✅ Image optimization with Next.js Image component
- ✅ Compression enabled
- ✅ PWA-ready with manifest.json
- ✅ Error boundaries for graceful error handling
- ✅ Rate limiting for TMDB API calls
- ✅ Production-optimized logging (errors only in dev mode)
- ✅ Responsive design with mobile support

## Data Flow

### 1. CSV Upload
- User uploads `diary.csv` from Letterboxd
- File is parsed via `/api/parse-csv` using PapaParse
- Extracts: movie title, watched date, optional rating
- Returns array of diary entries

### 2. Year Selection
- Available years are extracted from watched dates
- User selects a year
- Movies watched in that year are filtered

### 3. Metadata Enrichment
- For each filtered movie, `/api/fetch-metadata` searches TMDB
- Fetches: poster image, TMDB ID, release year, genres
- Results are cached to avoid duplicate API calls
- Movies without matches get fallback data

### 4. Tier Creation
- Movies start in "Uncategorized" pool
- User manually drags posters into tier rows
- Movies can be reordered within tiers
- Movies can be moved between tiers or back to uncategorized

### 5. Export
- **PNG Export**: Captures the visual tier list using html2canvas
- **JSON Export**: Exports structured data with tier assignments and positions

## Design Decisions

### Frontend-First Architecture
- All state managed in React Context
- No database required (MVP)
- Client-side drag & drop with @dnd-kit
- Minimal backend logic (CSV parsing, TMDB API calls)

### No Auto-Ranking
- Explicitly avoids AI or algorithmic ranking
- User has full control over tier assignments
- Respects the manual, visual nature of TierMaker

### TMDB Integration
- Uses TMDB Search API for movie matching
- Caches results in-memory (per session)
- Gracefully handles missing posters or failed matches
- Falls back to text-only display if poster unavailable

### Drag & Drop Behavior
- Posters draggable from uncategorized → tiers
- Posters draggable between tiers
- Posters draggable within tiers (reordering)
- Posters draggable back to uncategorized
- Visual feedback during drag operations

### Tier System
- Default tiers: Absolute Cinema, Gem Alert, Average, Okay, Delete Button
- Each tier has a color label
- Tiers are sortable (order preserved)
- Movies maintain position within tiers

## Known Limitations

1. **No Persistence**: Tier lists are not saved between sessions
2. **No Authentication**: MVP doesn't include user accounts
3. **TMDB Rate Limits**: Large movie lists may hit API rate limits (consider batching)
4. **CSV Format Assumptions**: Assumes standard Letterboxd CSV format
5. **Image Export Quality**: PNG export quality depends on screen resolution
6. **Cache Scope**: TMDB cache is in-memory and resets on server restart

## Future Enhancements (v2)

- Save tier lists to database
- Share tier lists via URL
- User authentication
- Custom tier names and colors
- Batch TMDB requests with rate limiting
- Better error handling for ambiguous movie titles
- Social features (viewing others' tier lists)

## File Structure

```
app/
  api/
    parse-csv/        # CSV parsing endpoint
    fetch-metadata/   # TMDB API integration
  components/
    UploadStep.jsx
    YearSelectionStep.jsx
    TierMakerStep.jsx
    TierRow.jsx
    MoviePoster.jsx
    ExportButton.jsx
  context/
    AppContext.jsx    # Global state management
  page.jsx            # Main app entry
  layout.jsx
  globals.css
```

## Environment Variables

- `TMDB_API_KEY`: Required. Your TMDB API key for fetching movie metadata.

## License

MIT
