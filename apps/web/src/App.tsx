/**
 * Main App Component
 * Router setup and global layout
 */

import React, { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { Login } from './components/Login'
import { MyTime } from './components/MyTime'
import { Sidebar } from './components/Sidebar'
import { Documentation } from './components/Documentation'
import { AdminPanel } from './components/AdminPanel'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'senda-chat': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { 'api-key': string; space: string; title: string };
    }
  }
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('mooving_auth')
  })
  
  const userRole = localStorage.getItem('mooving_user_role') || 'employee'
  const userName = localStorage.getItem('mooving_user_name') || 'Usuario'
  const isAdmin = userRole === 'admin'
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'mytime' | 'documentation' | 'admin'>(isAdmin ? 'dashboard' : 'mytime')

  const handleLogout = () => {
    localStorage.removeItem('mooving_auth')
    localStorage.removeItem('mooving_user_email')
    localStorage.removeItem('mooving_user_name')
    localStorage.removeItem('mooving_user_role')
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="App flex h-screen bg-slate-50 overflow-hidden">
      {/* Left Sidebar Navigation */}
      <Sidebar 
        currentView={currentView}
        setCurrentView={setCurrentView as any}
        isAdmin={isAdmin}
        userName={userName}
        userRole={userRole}
        onLogout={handleLogout}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {currentView === 'dashboard' && isAdmin && <Dashboard />}
        {currentView === 'mytime' && <MyTime />}
        {currentView === 'documentation' && <Documentation />}
        {currentView === 'admin' && isAdmin && <AdminPanel />}
      </div>

      {/* Senda Chat Widget Integration */}
      <senda-chat 
        api-key={import.meta.env.VITE_SENDA_API_KEY || ''} 
        space="tramia" 
        title="Preguntar a Senda"
      ></senda-chat>
    </div>
  )
}

export default App
