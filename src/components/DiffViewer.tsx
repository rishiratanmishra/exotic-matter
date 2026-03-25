import React from 'react'
import ReactDiffViewer from 'react-diff-viewer-continued'
import { Check, X, FileCode } from 'lucide-react'
import { useIDE } from '../context/IDEContext'

interface DiffViewerProps {
  path: string
  oldValue: string
  newValue: string
  onApply: () => void
  onReject: () => void
}

const DiffViewer: React.FC<DiffViewerProps> = ({ path, oldValue, newValue, onApply, onReject }) => {
  const { state } = useIDE()
  const isLight = state.theme === 'light'

  return (
    <div className="my-4 border border-[var(--border-main)] rounded-xl overflow-hidden bg-[var(--bg-explorer)] shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-side)] border-b border-[var(--border-main)]">
        <div className="flex items-center space-x-2 text-[var(--text-muted)]">
          <FileCode size={14} />
          <span className="text-[11px] font-mono truncate max-w-[200px]">{path.split(/[\/\\]/).pop()}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={onReject}
            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
            title="Reject Changes"
          >
            <X size={14} />
          </button>
          <button 
            onClick={onApply}
            className="flex items-center space-x-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold rounded-md transition-all shadow-lg shadow-blue-900/20"
          >
            <Check size={14} />
            <span>Apply</span>
          </button>
        </div>
      </div>
      
      <div className="max-h-[300px] overflow-y-auto text-[11px] font-outfit">
        <ReactDiffViewer
          oldValue={oldValue}
          newValue={newValue}
          splitView={false}
          useDarkTheme={!isLight}
          styles={{
            variables: {
              dark: {
                diffViewerBackground: 'var(--bg-explorer)',
                diffViewerTitleBackground: 'var(--bg-side)',
                diffViewerTitleColor: 'var(--text-muted)',
                addedBackground: '#064e3b',
                addedColor: '#10b981',
                removedBackground: '#450a0a',
                removedColor: '#f87171',
                wordAddedBackground: '#065f46',
                wordRemovedBackground: '#7f1d1d',
                codeFoldGutterBackground: 'var(--bg-side)',
                codeFoldBackground: 'var(--bg-side)',
                codeFoldContentColor: 'var(--text-muted)',
              },
              light: {
                diffViewerBackground: 'var(--bg-explorer)',
                diffViewerTitleBackground: 'var(--bg-side)',
                diffViewerTitleColor: 'var(--text-muted)',
              }
            },
            contentText: {
              fontSize: '11px',
              fontFamily: '"Cascadia Code", "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
            }
          }}
        />
      </div>
    </div>
  )
}

export default DiffViewer
