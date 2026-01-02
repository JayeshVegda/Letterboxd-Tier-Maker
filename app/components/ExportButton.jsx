'use client'

import { useState } from 'react'
import { useApp } from '../context/AppContext'

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
}

// Load image with CORS support
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (err) => {
      // Create a placeholder if image fails to load
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 300
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, 200, 300)
      ctx.fillStyle = '#666'
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('No Image', 100, 150)
      const placeholder = new Image()
      placeholder.src = canvas.toDataURL()
      placeholder.onload = () => resolve(placeholder)
      placeholder.onerror = () => reject(err)
    }
    img.src = src
  })
}

// Load SVG as image (for logo)
function loadSVG(src) {
  return new Promise((resolve, reject) => {
    fetch(src)
      .then(response => response.text())
      .then(svgText => {
        const blob = new Blob([svgText], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
          URL.revokeObjectURL(url)
          resolve(img)
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to load SVG'))
        }
        img.src = url
      })
      .catch(reject)
  })
}

export default function ExportButton() {
  const { movies, tiers, tierListName } = useApp()
  const [isExporting, setIsExporting] = useState(false)

  const handleExportJSON = () => {
    const sortedTiers = [...tiers].sort((a, b) => a.order - b.order)
    const exportData = {
      name: tierListName,
      createdAt: new Date().toISOString(),
      tiers: sortedTiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        order: tier.order,
        movies: movies
          .filter((m) => m.currentTier === tier.id)
          .sort((a, b) => (a.positionInTier || 0) - (b.positionInTier || 0))
          .map((m) => ({
            id: m.id,
            title: m.title,
            tmdbId: m.tmdbId,
            posterUrl: m.posterUrl,
          })),
      })),
      uncategorized: movies
        .filter((m) => !m.currentTier || m.currentTier === 'uncategorized')
        .map((m) => ({
          id: m.id,
          title: m.title,
          tmdbId: m.tmdbId,
          posterUrl: m.posterUrl,
        })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const filename = sanitizeFilename(tierListName) || 'tier-list'
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportPNG = async () => {
    setIsExporting(true)
    try {
      const sortedTiers = [...tiers].sort((a, b) => a.order - b.order)
      
      // Canvas dimensions
      const labelWidth = 200 // Width of tier label column
      const posterSize = 120 // Size of each movie poster
      const posterPadding = 10 // Padding between posters
      const baseTierHeight = 150 // Base height of each tier row
      const padding = 20 // Overall padding
      const minContentWidth = 1200 // Minimum content width
      
      // Calculate content width (for posters) - use a reasonable fixed width
      const contentWidth = Math.max(minContentWidth, 1400)
      const postersPerRow = Math.floor((contentWidth - padding) / (posterSize + posterPadding))
      
      // Calculate tier heights based on number of movies
      const tierHeights = sortedTiers.map((tier) => {
        const tierMovies = movies
          .filter((m) => m.currentTier === tier.id)
          .sort((a, b) => (a.positionInTier || 0) - (b.positionInTier || 0))
        const rows = Math.max(1, Math.ceil(tierMovies.length / postersPerRow))
        return baseTierHeight + (rows - 1) * (posterSize + posterPadding) + padding
      })
      
      // Calculate total height
      const totalHeight = tierHeights.reduce((sum, h) => sum + h, 0) + padding * 2
      const canvasWidth = labelWidth + contentWidth + padding * 2
      const headerHeight = 80 // Space for logo and title at top
      
      // Create canvas with header space
      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = totalHeight + headerHeight
      const ctx = canvas.getContext('2d')
      
      // Fill background
      ctx.fillStyle = '#0f0f0f'
      ctx.fillRect(0, 0, canvasWidth, canvas.height)
      
      // Draw logo and site name in top right
      try {
        const logoImg = await loadSVG('/favicon.svg')
        const logoSize = 50
        const siteName = 'Letterboxd Tier Maker'
        
        // Measure text width to ensure proper alignment
        ctx.font = 'bold 24px Arial'
        const textMetrics = ctx.measureText(siteName)
        const textWidth = textMetrics.width
        
        // Calculate positions - ensure everything fits within canvas
        const spacing = 12 // Space between logo and text
        const totalHeaderWidth = logoSize + spacing + textWidth
        const logoX = canvasWidth - padding - totalHeaderWidth
        const logoY = padding + 5
        
        // Draw logo
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
        
        // Draw site name next to logo, properly aligned
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 24px Arial'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        const textX = logoX + logoSize + spacing
        const textY = logoY + logoSize / 2
        ctx.fillText(siteName, textX, textY)
      } catch (err) {
        // If logo fails to load, just draw text (centered in available space)
        const siteName = 'Letterboxd Tier Maker'
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 24px Arial'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText(siteName, canvasWidth - padding, padding + 30)
      }
      
      // Draw separator line below header
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(padding, headerHeight)
      ctx.lineTo(canvasWidth - padding, headerHeight)
      ctx.stroke()
      
      // Draw each tier (starting below header)
      let currentY = headerHeight + padding
      for (let tierIndex = 0; tierIndex < sortedTiers.length; tierIndex++) {
        const tier = sortedTiers[tierIndex]
        const tierMovies = movies
          .filter((m) => m.currentTier === tier.id)
          .sort((a, b) => (a.positionInTier || 0) - (b.positionInTier || 0))
        
        const tierHeight = tierHeights[tierIndex]
        const y = currentY
        currentY += tierHeight
        
        // Draw tier label background
        ctx.fillStyle = tier.color || '#6B7280'
        ctx.fillRect(padding, y, labelWidth, tierHeight)
        
        // Draw tier label text
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 20px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const labelText = tier.name || `Tier ${tierIndex + 1}`
        ctx.fillText(labelText, padding + labelWidth / 2, y + tierHeight / 2)
        
        // Draw border between label and content
        ctx.strokeStyle = '#1a1a1a'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(padding + labelWidth, y)
        ctx.lineTo(padding + labelWidth, y + tierHeight)
        ctx.stroke()
        
        // Draw content area background
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(padding + labelWidth, y, contentWidth, tierHeight)
        
        // Pre-load all images for this tier in parallel
        const imagePromises = tierMovies.map((movie) => 
          movie.posterUrl 
            ? loadImage(movie.posterUrl).catch(() => null)
            : Promise.resolve(null)
        )
        const loadedImages = await Promise.all(imagePromises)
        
        // Draw movie posters
        for (let i = 0; i < tierMovies.length; i++) {
          const movie = tierMovies[i]
          const img = loadedImages[i]
          const row = Math.floor(i / postersPerRow)
          const col = i % postersPerRow
          
          const posterX = padding + labelWidth + padding + col * (posterSize + posterPadding)
          const posterY = y + padding + row * (posterSize + posterPadding)
          
          if (img) {
            // Draw poster with rounded corners effect
            ctx.save()
            const radius = 8
            ctx.beginPath()
            ctx.moveTo(posterX + radius, posterY)
            ctx.lineTo(posterX + posterSize - radius, posterY)
            ctx.quadraticCurveTo(posterX + posterSize, posterY, posterX + posterSize, posterY + radius)
            ctx.lineTo(posterX + posterSize, posterY + posterSize - radius)
            ctx.quadraticCurveTo(posterX + posterSize, posterY + posterSize, posterX + posterSize - radius, posterY + posterSize)
            ctx.lineTo(posterX + radius, posterY + posterSize)
            ctx.quadraticCurveTo(posterX, posterY + posterSize, posterX, posterY + posterSize - radius)
            ctx.lineTo(posterX, posterY + radius)
            ctx.quadraticCurveTo(posterX, posterY, posterX + radius, posterY)
            ctx.closePath()
            ctx.clip()
            
            ctx.drawImage(img, posterX, posterY, posterSize, posterSize)
            ctx.restore()
            
            // Draw border around poster
            ctx.strokeStyle = '#333'
            ctx.lineWidth = 2
            ctx.strokeRect(posterX, posterY, posterSize, posterSize)
          } else {
            // Draw placeholder for movies without poster or failed to load
            ctx.fillStyle = '#2a2a2a'
            ctx.fillRect(posterX, posterY, posterSize, posterSize)
            ctx.fillStyle = '#666'
            ctx.font = '12px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            const title = movie.title.length > 15 ? movie.title.substring(0, 15) + '...' : movie.title
            ctx.fillText(title, posterX + posterSize / 2, posterY + posterSize / 2)
          }
        }
        
        // Draw border between tiers
        if (tierIndex < sortedTiers.length - 1) {
          ctx.strokeStyle = '#1a1a1a'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(padding, y + tierHeight)
          ctx.lineTo(padding + labelWidth + contentWidth, y + tierHeight)
          ctx.stroke()
        }
      }
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image blob')
        }
        
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const filename = sanitizeFilename(tierListName) || 'tier-list'
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        setTimeout(() => {
          URL.revokeObjectURL(url)
        }, 100)
      }, 'image/png', 1.0)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Export error:', err)
      }
      let errorMessage = 'Failed to export image'
      
      if (err.message) {
        errorMessage = err.message
      } else if (err.name === 'TypeError') {
        errorMessage = 'Failed to generate image. Please make sure there are movies in your tier list.'
      }
      
      // Show user-friendly error
      const errorDiv = document.createElement('div')
      errorDiv.className = 'fixed top-4 right-4 bg-red-500/90 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      errorDiv.innerHTML = `
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-white mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <div>
            <p class="font-semibold mb-1">Export Failed</p>
            <p class="text-sm">${errorMessage}</p>
          </div>
        </div>
      `
      document.body.appendChild(errorDiv)
      setTimeout(() => {
        errorDiv.remove()
      }, 5000)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={handleExportJSON}
        disabled={isExporting}
        className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-gray-700 hover:border-gray-600"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export JSON
      </button>
      <button
        onClick={handleExportPNG}
        disabled={isExporting}
        className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:scale-105"
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Export PNG
          </>
        )}
      </button>
    </div>
  )
}
