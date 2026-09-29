import { ClerkProvider, useAuth } from '@clerk/react'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { setAuthTokenGetter } from './api'

// aislelys.com signs in with Clerk's production instance; previews and local
// dev use the development instance (a live key only works on its own domain).
const onLiveDomain = /(^|\.)aislelys\.com$/.test(window.location.hostname)
const PUBLISHABLE_KEY = onLiveDomain
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_LIVE
  : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Clerk's sign-in/sign-up forms in the Aislelys look: Raleway, the gold
// accent, warm ink and the cream surfaces used across the site.
const clerkAppearance = {
  variables: {
    colorPrimary: '#2b1c01',
    colorPrimaryForeground: '#fdf9ef',
    colorForeground: '#2b1c01',
    colorMutedForeground: '#5e4f3c',
    colorBackground: '#ffffff',
    colorInput: '#ffffff',
    colorInputForeground: '#2b1c01',
    colorBorder: '#ede2cc',
    colorRing: '#b99767',
    colorDanger: '#893b3b',
    fontFamily: '"Raleway", system-ui, sans-serif',
    borderRadius: '12px',
  },
  elements: {
    cardBox: { boxShadow: '0 30px 60px -36px rgba(43, 28, 1, 0.35)', border: '1px solid #ede2cc' },
    headerTitle: { fontFamily: '"Lusitana", Georgia, serif', fontWeight: 400, fontSize: '1.7rem' },
    formButtonPrimary: { borderRadius: '999px' },
    socialButtonsBlockButton: { borderRadius: '999px' },
  },
}

// Hands Clerk's session token to the API helper, so requests are signed in.
function ClerkTokenBridge() {
  const { getToken } = useAuth()
  useEffect(() => {
    setAuthTokenGetter(() => getToken())
    return () => setAuthTokenGetter(null)
  }, [getToken])
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/start"
      signUpFallbackRedirectUrl="/start"
      afterSignOutUrl="/"
    >
      <ClerkTokenBridge />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
