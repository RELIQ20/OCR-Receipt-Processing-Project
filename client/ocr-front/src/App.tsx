import { useEffect, useState } from 'react'
import DashboardScheme from '../pages/DashboardScheme'
import ReceiptInbox from '../pages/receipt-inbox'

function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (path === '/receipt-inbox' || path === '/pages/receipt-inbox') {
    return <ReceiptInbox />
  }

  return <DashboardScheme />
}

export default App