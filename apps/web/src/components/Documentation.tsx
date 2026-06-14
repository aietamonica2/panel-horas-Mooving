import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen, FileText, Settings, Shield, History, Code } from 'lucide-react';

// Vite allows importing raw string content from files using the ?raw suffix
import changelogRaw from '../../../../CHANGELOG.md?raw';
import functionalRaw from '../../../../documentation/audit/mooving-platform/01-funcional.md?raw';
import tecnicoRaw from '../../../../documentation/audit/mooving-platform/02-tecnico.md?raw';
import apiMcpRaw from '../../../../documentation/audit/mooving-platform/03-api-mcp.md?raw';
import adminRaw from '../../../../documentation/audit/mooving-platform/04-admin.md?raw';

type DocTab = 'changelog' | 'funcional' | 'tecnico' | 'api' | 'admin';

export const Documentation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DocTab>('changelog');

  const tabs: { id: DocTab; title: string; icon: React.ReactNode; content: string }[] = [
    { id: 'changelog', title: 'Novedades y Versiones', icon: <History className="w-5 h-5" />, content: changelogRaw },
    { id: 'funcional', title: 'Manual de Usuario', icon: <FileText className="w-5 h-5" />, content: functionalRaw },
    { id: 'tecnico', title: 'Arquitectura Técnica', icon: <Settings className="w-5 h-5" />, content: tecnicoRaw },
    { id: 'api', title: 'Integración IA / MCP', icon: <Code className="w-5 h-5" />, content: apiMcpRaw },
    { id: 'admin', title: 'Guía de Administración', icon: <Shield className="w-5 h-5" />, content: adminRaw },
  ];

  const activeContent = tabs.find(t => t.id === activeTab)?.content || '';

  return (
    <div className="flex-1 flex bg-slate-50 overflow-hidden h-full">
      {/* Secondary Sidebar for Documentation Tabs */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-indigo-700">
            <BookOpen className="w-6 h-6" />
            <h2 className="font-bold text-lg">Base de Conocimiento</h2>
          </div>
        </div>
        <nav className="p-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === tab.id 
                  ? 'bg-indigo-50 text-indigo-700 font-medium border border-indigo-100 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 border border-transparent'
              }`}
            >
              {tab.icon}
              <span className="text-sm">{tab.title}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Markdown Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12">
          <article className="prose prose-slate prose-indigo max-w-none">
            <ReactMarkdown>{activeContent}</ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
};
