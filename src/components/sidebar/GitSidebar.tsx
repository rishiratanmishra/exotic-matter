import React, { useState, useEffect } from 'react'
import { GitBranch, FileEdit, Plus, Trash2, ChevronRight, RefreshCw } from 'lucide-react'
import DiffViewer from '../DiffViewer'

interface GitFile {
  status: string
  path: string
}

interface GitSidebarProps {
  workspacePath: string | null
  onShowDiff: (path: string) => void
}

const GitSidebar: React.FC<GitSidebarProps> = ({ workspacePath, onShowDiff }) => {
  const [changes, setChanges] = useState<GitFile[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchStatus = async () => {
    if (!workspacePath) return
    setIsLoading(true)
    try {
      const status = await window.em.getGitStatus(workspacePath)
      setChanges(status)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileClick = (path: string) => {
    onShowDiff(path)
  }

  useEffect(() => {
    fetchStatus()
  }, [workspacePath])

  return (
    <div className="flex flex-col h-full bg-[#252526]">
      <div className="p-4 flex items-center justify-between border-b border-[#1e1e1e]">
        <div className="flex items-center space-x-2 text-[#cccccc]">
          <GitBranch size={14} className="text-blue-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider">Source Control</span>
        </div>
        <button onClick={fetchStatus} disabled={isLoading} className="text-[#858585] hover:text-white transition-colors">
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
        {changes.length > 0 ? (
          changes.map((file, i) => (
            <div 
              key={i}
              onClick={() => handleFileClick(file.path)}
              className="group flex items-center justify-between p-2 hover:bg-[#2a2d2e] rounded cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-2 truncate">
                {file.status === 'M' && <FileEdit size={12} className="text-amber-400" />}
                {file.status === 'A' || file.status === '??' ? <Plus size={12} className="text-emerald-400" /> : null}
                {file.status === 'D' && <Trash2 size={12} className="text-red-400" />}
                <span className="text-[11px] text-[#cccccc] truncate font-mono">{file.path.split(/[\/\\]/).pop()}</span>
              </div>
              <span className="text-[9px] font-bold text-[#858585] group-hover:text-white px-1.5 py-0.5 rounded border border-[#3c3c3c]">
                {file.status}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-[11px] text-[#858585]">
            No changes detected
          </div>
        )}
      </div>
    </div>
  )
}

export default GitSidebar
