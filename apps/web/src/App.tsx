/**
 * Main App Component
 * Router setup and global layout
 */

import React, { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { Login } from './components/Login'
import { MyTime } from './components/MyTime'

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
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'mytime'>(isAdmin ? 'dashboard' : 'mytime')
  const [showProfile, setShowProfile] = useState(false)

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
    <div className="App flex flex-col h-screen">
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="font-bold text-xl text-indigo-900 mr-4">Mooving</div>
          {isAdmin && (
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`font-medium pb-1 border-b-2 transition ${currentView === 'dashboard' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
            >
              Dashboard Admin
            </button>
          )}
          <button 
            onClick={() => setCurrentView('mytime')}
            className={`font-medium pb-1 border-b-2 transition ${currentView === 'mytime' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            Mis Horas (Mooving Assistant)
          </button>
        </div>
        
        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition"
          >
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700">{userName}</span>
            <span className="text-xs text-slate-500">▼</span>
          </button>
          
          {showProfile && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-50">
                <p className="text-sm text-gray-900 font-medium">{userName}</p>
                <p className="text-xs text-gray-500 capitalize">Rol: {userRole}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </nav>
      
      <div className="flex-1 overflow-auto">
        {currentView === 'dashboard' && isAdmin ? <Dashboard /> : <MyTime />}
      </div>

      {/* Senda Chat Widget Integration */}
      <senda-chat 
        api-key={import.meta.env.VITE_SENDA_API_KEY || ''} 
        space="operaciones-mooving" 
        title="Senda Mooving Assistant"
      ></senda-chat>
    </div>
  )
}

export default App
