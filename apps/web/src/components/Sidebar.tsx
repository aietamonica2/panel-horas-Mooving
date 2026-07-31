import React from 'react';
import {
  LayoutDashboard,
  Clock,
  BookOpen,
  LogOut,
  UserCircle,
  Settings,
  ClipboardCheck,
  Briefcase
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: 'dashboard' | 'mytime' | 'documentation' | 'admin' | 'approvals' | 'cartera') => void;
  isAdmin: boolean;
  isCoordinator: boolean;
  userName: string;
  userRole: string;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  isAdmin,
  isCoordinator,
  userName,
  userRole,
  onLogout
}) => {
  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 shrink-0">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white shadow-lg">
            M
          </div>
          <span className="font-bold text-xl text-white tracking-tight">Mooving</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Principal
        </div>
        
        {isAdmin && (
          <>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                currentView === 'dashboard' 
                  ? 'bg-indigo-600/10 text-indigo-400 font-medium' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard Admin</span>
            </button>
            <button
              onClick={() => setCurrentView('admin')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                currentView === 'admin' 
                  ? 'bg-indigo-600/10 text-indigo-400 font-medium' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Administración</span>
            </button>
          </>
        )}

        {/* Mi Cartera: vista principal del coordinador (su equipo/clientes) */}
        {isCoordinator && (
          <button
            onClick={() => setCurrentView('cartera')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              currentView === 'cartera'
                ? 'bg-indigo-600/10 text-indigo-400 font-medium'
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <span>Mi Cartera</span>
          </button>
        )}

        {/* Aprobaciones: visible para admin y coordinador (el backend acota la cola por rol) */}
        {(isAdmin || isCoordinator) && (
          <button
            onClick={() => setCurrentView('approvals')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              currentView === 'approvals'
                ? 'bg-indigo-600/10 text-indigo-400 font-medium'
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-5 h-5" />
            <span>Aprobaciones</span>
          </button>
        )}

        <button
          onClick={() => setCurrentView('mytime')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            currentView === 'mytime' 
              ? 'bg-indigo-600/10 text-indigo-400 font-medium' 
              : 'hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span>Mis Horas</span>
        </button>

        <div className="mt-8 px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Recursos
        </div>

        <button
          onClick={() => setCurrentView('documentation')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            currentView === 'documentation' 
              ? 'bg-indigo-600/10 text-indigo-400 font-medium' 
              : 'hover:bg-slate-800 hover:text-white'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Documentación</span>
        </button>
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
            <UserCircle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-slate-500 truncate capitalize">Rol: {userRole}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
