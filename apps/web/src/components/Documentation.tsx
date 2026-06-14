import React from 'react';
import { BookOpen, FileText, Settings, Shield } from 'lucide-react';

export const Documentation: React.FC = () => {
  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="max-w-5xl mx-auto py-8 px-8">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900">Documentación y Ayuda</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Bienvenido a la Base de Conocimiento</h2>
            <p className="text-gray-600 mb-6">
              Esta sección está destinada a centralizar manuales, políticas de la empresa y guías de uso del Panel de Horas Mooving.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="border border-gray-100 rounded-lg p-5 hover:shadow-md transition bg-slate-50 cursor-pointer">
                <FileText className="w-6 h-6 text-indigo-500 mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Guía de Uso Rápido</h3>
                <p className="text-sm text-gray-500">Aprende cómo usar Senda AI para registrar tus horas y extraer información de forma autónoma.</p>
              </div>
              
              <div className="border border-gray-100 rounded-lg p-5 hover:shadow-md transition bg-slate-50 cursor-pointer">
                <Settings className="w-6 h-6 text-slate-500 mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Políticas de Proyectos</h3>
                <p className="text-sm text-gray-500">Reglas sobre cómo imputar horas correctamente según cada centro de costo.</p>
              </div>

              <div className="border border-gray-100 rounded-lg p-5 hover:shadow-md transition bg-slate-50 cursor-pointer">
                <Shield className="w-6 h-6 text-emerald-500 mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Seguridad y Privacidad</h3>
                <p className="text-sm text-gray-500">Información sobre el manejo de datos y visibilidad de los reportes.</p>
              </div>
            </div>

            <div className="mt-10 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <h4 className="font-medium text-indigo-800 mb-1">¿Necesitas ayuda adicional?</h4>
              <p className="text-sm text-indigo-600">
                Abre el widget de Senda Assistant en la esquina inferior derecha. La IA está entrenada con nuestros manuales operativos y puede responderte de inmediato.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
