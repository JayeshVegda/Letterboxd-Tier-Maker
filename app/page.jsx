'use client'

import { useState, useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import UploadStep from './components/UploadStep'
import CategorySelectionStep from './components/CategorySelectionStep'
import TierMakerStep from './components/TierMakerStep'
import ErrorBoundary from './components/ErrorBoundary'

function AppContent() {
  const { movies, selectedYear, selectedCategory, letterboxdData } = useApp()
  const [step, setStep] = useState('upload') // upload -> category -> tier

  // Restore step based on saved state
  useEffect(() => {
    // If we have ZIP data, go to category selection
    if (letterboxdData && (letterboxdData.diary.length > 0 || letterboxdData.profile || letterboxdData.availableFiles.length > 0)) {
      if (movies.length > 0 && (selectedYear !== null || selectedCategory !== null)) {
        setStep('tier')
      } else {
        setStep('category')
      }
    } else {
      setStep('upload')
    }
  }, [movies.length, selectedYear, selectedCategory, letterboxdData])

  return (
    <>
      {step === 'upload' && <UploadStep onComplete={() => setStep('category')} />}
      {step === 'category' && (
        <CategorySelectionStep
          onBack={() => setStep('upload')}
          onComplete={() => setStep('tier')}
        />
      )}
      {step === 'tier' && (
        <TierMakerStep onBack={() => setStep('category')} />
      )}
    </>
  )
}

export default function Home() {

  return (
    <ErrorBoundary>
      <AppProvider>
        <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a]">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-12">
            <div className="text-center mb-8 md:mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Letterboxd Tier Maker
              </h1>
              <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
                Rank your Letterboxd movies by year, lists, or categories
              </p>
            </div>

            <AppContent />
          </div>
        </main>
      </AppProvider>
    </ErrorBoundary>
  )
}
