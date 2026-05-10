import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { X, ExternalLink, RefreshCw } from 'lucide-react';

export default function UIPreview() {
  const { artifacts } = useSelector((state: RootState) => state.plan);
  const [activeArtifact, setActiveArtifact] = React.useState<string | null>(null);

  const uiArtifacts = artifacts.filter(a => a.type === 'code' || a.title.toLowerCase().includes('ui'));

  React.useEffect(() => {
    if (uiArtifacts.length > 0 && !activeArtifact) {
      setActiveArtifact(uiArtifacts[uiArtifacts.length - 1].id);
    }
  }, [uiArtifacts, activeArtifact]);

  const current = uiArtifacts.find(a => a.id === activeArtifact);

  if (uiArtifacts.length === 0) return null;

  return (
    <div className="flex flex-col h-full w-[400px] bg-[var(--bg-main)] border-l border-[var(--border-main)] overflow-hidden shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="h-9 bg-[var(--bg-side)] border-b border-[var(--border-main)] flex items-center justify-between px-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Live UI Preview</span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1 hover:bg-[var(--border-main)] rounded transition-colors text-[var(--text-muted)]">
            <RefreshCw size={12} />
          </button>
          <button className="p-1 hover:bg-[var(--border-main)] rounded transition-colors text-[var(--text-muted)]">
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      <div className="p-2 bg-[var(--bg-side)] flex space-x-2 overflow-x-auto no-scrollbar border-b border-[var(--border-main)]">
        {uiArtifacts.map(a => (
          <button
            key={a.id}
            onClick={() => setActiveArtifact(a.id)}
            className={cn(
              "px-2 py-1 rounded text-[9px] whitespace-nowrap transition-all border",
              activeArtifact === a.id 
                ? "bg-blue-500/10 border-blue-500/50 text-blue-400" 
                : "bg-transparent border-transparent text-[var(--text-muted)] hover:bg-[var(--border-main)]"
            )}
          >
            {a.title}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white overflow-auto p-4 flex items-center justify-center">
        {current?.content.startsWith('<svg') ? (
          <div dangerouslySetInnerHTML={{ __html: current.content }} />
        ) : (
          <iframe 
            srcDoc={`
              <html>
                <head>
                  <script src="https://cdn.tailwindcss.com"></script>
                  <style>body { margin: 0; display: flex; items: center; justify-content: center; min-height: 100vh; background: #f8fafc; }</style>
                </head>
                <body>${current?.content || ''}</body>
              </html>
            `}
            className="w-full h-full border-none"
          />
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
