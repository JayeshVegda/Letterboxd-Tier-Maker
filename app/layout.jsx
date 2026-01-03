import './globals.css'
import { Analytics } from '@vercel/analytics/react'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://letterboxd-tiermaker.vercel.app'),
  title: {
    default: 'Letterboxd Tier Maker',
    template: '%s | Letterboxd Tier Maker',
  },
  description: 'Create beautiful tier lists from your Letterboxd movie data. Rank your watched films by year, lists, or categories with drag-and-drop functionality.',
  keywords: [
    'letterboxd',
    'tier maker',
    'movie tier list',
    'film ranking',
    'letterboxd export',
    'movie organizer',
    'film tier',
    'movie sorter',
  ],
  authors: [{ name: 'Letterboxd Tier Maker' }],
  creator: 'Letterboxd Tier Maker',
  publisher: 'Letterboxd Tier Maker',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Letterboxd Tier Maker',
    title: 'Letterboxd Tier Maker - Create Movie Tier Lists',
    description: 'Rank your Letterboxd movies by year, lists, or categories with drag-and-drop tier lists',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Letterboxd Tier Maker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Letterboxd Tier Maker - Create Movie Tier Lists',
    description: 'Rank your Letterboxd movies by year, lists, or categories with drag-and-drop tier lists',
    images: ['/og-image.png'],
    creator: '@letterboxd',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#0a0a0a' },
    ],
  },
  manifest: '/manifest.json',
  category: 'entertainment',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.themoviedb.org" />
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://api.themoviedb.org" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
      </head>
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
