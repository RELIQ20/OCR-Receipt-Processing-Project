import { useEffect, useState } from 'react'
import AuthPage from '../pages/auth'
import DashboardScheme from '../pages/DashboardScheme'
import ReceiptInbox from '../pages/receipt-inbox'
import { useAuth } from '../utils/auth-context'

function App() {
  const { user, loading, signOut } = useAuth()
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Redirect to auth page on initial load if not authenticated
  useEffect(() => {
    if (!loading && !user && path !== '/auth' && path !== '/pages/auth') {
      window.history.pushState({}, '', '/auth')
      setPath('/auth')
    }
  }, [loading, user, path])

  const navigate = (nextPath: string) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sea">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-castleton border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Auth page routes
  if (path === '/auth' || path === '/pages/auth') {
    // If user is already authenticated, redirect to main app
    if (user) {
      navigate('/')
      return null
    }
    return <AuthPage onAuth={() => navigate('/')} />
  }

  // Protected routes - require authentication
  if (!user) {
    // Redirect unauthenticated users to auth page
    navigate('/auth')
    return null
  }

  // Authenticated routes
  if (path === '/receipt-inbox' || path === '/pages/receipt-inbox') {
    return <ReceiptInbox onSignOut={signOut} />
  }

  return <DashboardScheme onSignOut={signOut} />
}

export default App