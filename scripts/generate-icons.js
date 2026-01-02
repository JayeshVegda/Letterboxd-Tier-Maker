#!/usr/bin/env node

/**
 * Icon Generation Script
 * Generates all required icon files from favicon.svg
 * 
 * Requires: sharp (npm install sharp --save-dev)
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs')
const path = require('path')

async function generateIcons() {
  try {
    // Check if sharp is available
    let sharp
    try {
      sharp = require('sharp')
    } catch (e) {
      console.error('Error: sharp is not installed.')
      console.error('Please install it with: npm install sharp --save-dev')
      process.exit(1)
    }

    const publicDir = path.join(__dirname, '..', 'public')
    const svgPath = path.join(publicDir, 'favicon.svg')
    
    if (!fs.existsSync(svgPath)) {
      console.error(`Error: ${svgPath} not found`)
      process.exit(1)
    }

    console.log('Generating icons from favicon.svg...\n')

    // Read SVG
    const svgBuffer = fs.readFileSync(svgPath)

    // Generate PNG icons
    const icons = [
      { name: 'icon-16x16.png', size: 16 },
      { name: 'icon-32x32.png', size: 32 },
      { name: 'apple-icon.png', size: 180 },
      { name: 'icon-192x192.png', size: 192 },
      { name: 'icon-512x512.png', size: 512 },
    ]

    for (const icon of icons) {
      const outputPath = path.join(publicDir, icon.name)
      await sharp(svgBuffer)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath)
      console.log(`✓ Generated ${icon.name} (${icon.size}x${icon.size})`)
    }

    // Generate favicon.ico (multi-size ICO)
    const icoPath = path.join(publicDir, 'favicon.ico')
    // Create ICO with multiple sizes
    const icoSizes = [16, 32, 48]
    const icoImages = await Promise.all(
      icoSizes.map(size =>
        sharp(svgBuffer)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer()
      )
    )
    
    // For ICO, we'll create a simple 32x32 version
    // Note: Full multi-size ICO requires additional libraries
    await sharp(svgBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(icoPath.replace('.ico', '-temp.png'))
    
    // Convert to ICO (simplified - using PNG as ICO for compatibility)
    // In production, you might want to use a proper ICO converter
    fs.copyFileSync(icoPath.replace('.ico', '-temp.png'), icoPath)
    fs.unlinkSync(icoPath.replace('.ico', '-temp.png'))
    console.log(`✓ Generated favicon.ico (32x32)`)

    // Generate OG image (1200x630)
    const ogPath = path.join(publicDir, 'og-image.png')
    await sharp(svgBuffer)
      .resize(630, 630, {
        fit: 'contain',
        background: { r: 10, g: 10, b: 10, alpha: 1 } // #0a0a0a
      })
      .extend({
        top: 0,
        bottom: 0,
        left: 285, // (1200 - 630) / 2
        right: 285,
        background: { r: 10, g: 10, b: 10, alpha: 1 }
      })
      .png()
      .toFile(ogPath)
    console.log(`✓ Generated og-image.png (1200x630)`)

    console.log('\n✅ All icons generated successfully!')
    console.log('\nNote: favicon.ico is generated as PNG format.')
    console.log('For a proper multi-size ICO file, use an online tool like:')
    console.log('https://realfavicongenerator.net/')
  } catch (error) {
    console.error('Error generating icons:', error)
    process.exit(1)
  }
}

generateIcons()
