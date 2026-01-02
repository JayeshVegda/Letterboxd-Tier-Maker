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
        <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] flex flex-col">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-12 flex-1">
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
          
          {/* Footer */}
          <footer className="mt-auto border-t border-gray-800/50 bg-[#0a0a0a]/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-gray-500 text-sm">
                  Made with ❤️ for movie lovers
                </p>
                <div className="flex items-center gap-4">
                  <a
                    href="https://github.com/JayeshVegda/Letterboxd-Tier-Maker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 group"
                  >
                    <svg
                      className="w-5 h-5 group-hover:scale-110 transition-transform"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium">View on GitHub</span>
                  </a>
                  <a
                    href="https://github.com/JayeshVegda"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 group"
                  >
                    <span className="text-sm font-medium">@JayeshVegda</span>
                    <svg
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </AppProvider>
    </ErrorBoundary>
  )
}
