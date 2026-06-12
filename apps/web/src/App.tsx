/**
 * Main App Component
 * Router setup and global layout
 */

import React, { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { Login } from './components/Login'

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('mooving_auth') === 'mooving2025'
  })

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="App">
      <Dashboard />
    </div>
  )
}

export default App
