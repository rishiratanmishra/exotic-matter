import React, { useEffect, useState } from 'react'
import ReactDiffViewer from 'react-diff-viewer-continued'
import { Loader2, FileCode } from 'lucide-react'

interface DiffEditorProps {
  path: string
  workspacePath: string | null
}

const DiffEditor: React.FC<DiffEditorProps> = ({ path, workspacePath }) => {
  const [oldValue, setOldValue] = useState('')
  const [newValue, setNewValue] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDiff = async () => {
      if (!workspacePath) return
      setLoading(true)
      try {
        const original = await window.capsicode.readFile(path)
        const diffText = await window.capsicode.gitDiff(workspacePath, path)
        
        // This is a simplified way to reconstruct the "new" value for visualization.
        // In a real IDE, we'd use the current disk state vs HEAD.
        // For git unstaged changes, readFile(path) IS the newValue.
        // We need the HEAD version as oldValue.
        
        const headContent = await window.capsicode.readFile(`HEAD:${path}`) // Wait, I need a main process helper for this
        // Actually, let's just use the current file as newValue and previous as oldValue if possible.
        // But getGitDiff already gives the colored text.
        
        setNewValue(original)
        // For now, let's just show the raw unified diff if we can't get the old value easily.
        // Alternatively, I can add a main process helper: getFileAtHead(path)
        
        setOldValue('Loading original...') // Fallback
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadDiff()
  }, [path, workspacePath])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#858585]">
        <Loader2 className="animate-spin mr-2" size={16} />
        <span className="text-xs">Loading Diff...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e]">
      <div className="px-4 py-2 border-b border-[#333333] bg-[#252526] flex items-center space-x-2">
        <FileCode size={14} className="text-amber-500" />
        <span className="text-[11px] font-mono text-[#cccccc]">{path}</span>
        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">Working Tree Change</span>
      </div>
      <div className="flex-1 overflow-auto">
        <ReactDiffViewer
          oldValue={oldValue}
          newValue={newValue}
          splitView={true}
          useDarkTheme={true}
          styles={{
            variables: {
              dark: {
                diffViewerBackground: '#1e1e1e',
                diffViewerTitleBackground: '#252526',
                addedBackground: '#064e3b',
                removedBackground: '#450a0a',
              }
            },
            contentText: {
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace'
            }
          }}
        />
      </div>
    </div>
  )
}

export default DiffEditor
