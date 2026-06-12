import React, { useState } from 'react'

interface LoginProps {
  onLoginSuccess: () => void
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'mooving2025') {
      localStorage.setItem('mooving_auth', 'mooving2025')
      onLoginSuccess()
    } else {
      setError('Contraseña incorrecta. Por favor intente de nuevo.')
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-4 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div 
        className={`w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300 ${
          isShaking ? 'animate-bounce' : ''
        }`}
        style={{
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-sky-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mb-4 text-3xl">
            🚚
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Mooving</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">Panel de Operaciones</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2" htmlFor="password">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                className="w-full bg-slate-950/50 border border-slate-700/60 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition duration-200"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl py-3 px-4 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-sky-600 to-orange-500 text-white font-bold py-3.5 px-4 rounded-xl hover:from-sky-500 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transform active:scale-[0.98] transition-all duration-150 shadow-lg shadow-sky-950/50"
          >
            Ingresar
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Mooving. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
