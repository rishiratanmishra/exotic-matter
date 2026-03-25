import React, { useEffect, useState, useCallback } from 'react'
import { Folder, FolderOpen, ChevronRight, ChevronDown, FileCode, FilePlus, FolderPlus, Pencil, Trash2 } from 'lucide-react'

function cn(...c: any[]) { return c.filter(Boolean).join(' ') }

interface FileNode {
  name: string
  isDir: boolean
  path: string
  children?: FileNode[]
  isOpen?: boolean
}

interface FileExplorerProps {
  workspacePath: string | null
  onFileSelect?: (path: string) => void
}

export default function FileExplorer({ workspacePath, onFileSelect }: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [creatingParentPath, setCreatingParentPath] = useState<string | null>(null)
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode | null } | null>(null)

  useEffect(() => {
    (window as any).refreshExplorer = () => setRefreshKey(k => k + 1)
    return () => { delete (window as any).refreshExplorer }
  }, [])

  useEffect(() => {
    const loadRoot = async () => {
      const path = workspacePath || await window.em.getAppPath()
      const entries = await window.em.listDir(path)
      setFiles(entries.sort((a: FileNode, b: FileNode) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        return a.name.localeCompare(b.name)
      }))
    }
    loadRoot()
  }, [workspacePath, refreshKey])

  const toggleFolder = async (node: FileNode) => {
    const updateNodes = async (nodes: FileNode[]): Promise<FileNode[]> => {
      return Promise.all(nodes.map(async n => {
        if (n.path === node.path) {
          const isOpen = !n.isOpen
          let children = n.children
          if (isOpen && !children) {
            const raw = await window.em.listDir(n.path)
            children = (raw as FileNode[]).sort((a, b) => {
              if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
              return a.name.localeCompare(b.name)
            })
          }
          return { ...n, isOpen, children }
        }
        if (n.children) return { ...n, children: await updateNodes(n.children) }
        return n
      }))
    }
    setFiles(await updateNodes(files))
  }

  const startRename = (node: FileNode) => {
    setRenamingPath(node.path)
    setRenameValue(node.name)
    setContextMenu(null)
    requestAnimationFrame(() => {
      const el = document.getElementById(`rename-input-${node.path}`)
      el?.focus()
    })
  }

  const submitRename = async (node: FileNode, newName: string) => {
    setRenamingPath(null)
    if (!newName.trim() || newName === node.name) return
    const parentDir = node.path.substring(0, node.path.length - node.name.length).replace(/[/\\]$/, '')
    const newPath = `${parentDir}/${newName.trim()}`
    const result = await window.em.renameFile(node.path, newPath)
    if (result.success) setRefreshKey(k => k + 1)
  }

  const handleDelete = async (node: FileNode) => {
    setContextMenu(null)
    const confirmed = window.confirm(`Delete "${node.name}"? This cannot be undone.`)
    if (!confirmed) return
    const result = await window.em.deleteFile(node.path)
    if (result.success) setRefreshKey(k => k + 1)
  }

  const startCreate = (parentPath: string | null, type: 'file' | 'folder') => {
    setCreatingParentPath(parentPath || workspacePath)
    setCreatingType(type)
    setContextMenu(null)
    // If it's a folder, we might want to ensure it's open first, but for now just show input at top
    requestAnimationFrame(() => {
      const el = document.getElementById('new-item-input')
      el?.focus()
    })
  }

  const submitCreate = async (name: string) => {
    const parent = creatingParentPath
    const type = creatingType
    setCreatingParentPath(null)
    setCreatingType(null)
    if (!name.trim() || !parent) return

    const newPath = `${parent}/${name.trim()}`
    let result
    if (type === 'file') {
      result = await window.em.createFile(newPath)
    } else {
      result = await window.em.createDirectory(newPath)
    }

    if (result.success) {
      setRefreshKey(k => k + 1)
      if (type === 'file') onFileSelect?.(newPath)
    } else {
      alert(`Error: ${result.error}`)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, node: FileNode | null) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  const renderNode = (node: FileNode, depth = 0): React.ReactNode => {
    const isRenaming = renamingPath === node.path
    return (
      <div key={node.path}>
        <div
          className="flex items-center py-[2px] hover:bg-[var(--border-main)] cursor-pointer text-[13px] group transition-colors duration-75 relative"
          style={{ paddingLeft: depth * 12 + 8 }}
          onClick={() => node.isDir ? toggleFolder(node) : onFileSelect?.(node.path)}
          onContextMenu={e => handleContextMenu(e, node)}
        >
          <div className="w-4 h-4 flex items-center justify-center mr-1 text-[var(--text-muted)] flex-shrink-0">
            {node.isDir && (node.isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
          </div>
          <div className="mr-1.5 flex-shrink-0">
            {node.isDir
              ? (node.isOpen ? <FolderOpen size={15} className="text-[#dcb862]" /> : <Folder size={15} className="text-[#dcb862]" />)
              : <FileCode size={15} className="text-[#5b9bd5]" />
            }
          </div>
          {isRenaming ? (
            <input
              id={`rename-input-${node.path}`}
              autoFocus
              className="flex-1 bg-[var(--bg-side)] text-[var(--text-main)] text-[12px] px-1 py-0.5 rounded outline-none border border-blue-500/60 min-w-0"
              defaultValue={node.name}
              onKeyDown={e => {
                if (e.key === 'Enter') submitRename(node, e.currentTarget.value)
                if (e.key === 'Escape') setRenamingPath(null)
              }}
              onBlur={e => submitRename(node, e.currentTarget.value)}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className={cn('flex-1 truncate text-[12.5px] transition-colors min-w-0', node.isOpen ? 'text-[var(--text-main)]' : 'text-[var(--text-main)]/80')}>
              {node.name}
            </span>
          )}
          {!isRenaming && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-0.5 pr-1 flex-shrink-0 transition-opacity">
              <button onClick={e => { e.stopPropagation(); startRename(node) }}
                className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded transition-colors" title="Rename">
                <Pencil size={10} />
              </button>
              <button onClick={e => { e.stopPropagation(); handleDelete(node) }}
                className="p-0.5 text-[var(--text-muted)] hover:text-red-400 rounded transition-colors" title="Delete">
                <Trash2 size={10} />
              </button>
            </div>
          )}
        </div>
        {node.isOpen && (
          <div>
            {creatingParentPath === node.path && (
              <div className="flex items-center py-[2px]" style={{ paddingLeft: (depth + 1) * 12 + 8 }}>
                <div className="w-4 h-4 mr-1 flex-shrink-0" />
                <div className="mr-1.5 flex-shrink-0">
                  {creatingType === 'folder' ? <Folder size={15} className="text-[#dcb862]" /> : <FileCode size={15} className="text-[#5b9bd5]" />}
                </div>
                <input
                  id="new-item-input"
                  className="flex-1 bg-[var(--bg-side)] text-[var(--text-main)] text-[12px] px-1 py-0.5 rounded outline-none border border-blue-500/60 min-w-0"
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitCreate(e.currentTarget.value)
                    if (e.key === 'Escape') { setCreatingParentPath(null); setCreatingType(null) }
                  }}
                  onBlur={e => submitCreate(e.currentTarget.value)}
                />
              </div>
            )}
            {node.children?.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const closeContextMenu = useCallback(() => setContextMenu(null), [])
  useEffect(() => {
    if (contextMenu) {
      window.addEventListener('click', closeContextMenu)
      return () => window.removeEventListener('click', closeContextMenu)
    }
  }, [contextMenu, closeContextMenu])

  if (!workspacePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-[var(--bg-explorer)]">
        <Folder size={28} className="text-[var(--border-main)] mb-3" />
        <p className="text-[11px] text-[var(--text-muted)]">No folder open</p>
        <p className="text-[10px] text-[var(--border-main)] mt-1">Use Ctrl+O to open a folder</p>
      </div>
    )
  }

  const rootName = workspacePath ? workspacePath.split(/[/\\]/).pop()?.toUpperCase() : ''

  return (
    <div className="py-1 overflow-x-hidden select-none h-full bg-[var(--bg-explorer)] flex flex-col" onClick={() => contextMenu && setContextMenu(null)}>
      {/* Root Header */}
      {workspacePath && (
        <div className="px-5 py-2 mb-1 flex items-center justify-between group">
          <span className="text-[10.5px] font-black text-[var(--text-muted)] tracking-widest truncate">
            {rootName}
          </span>
          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-2 text-[var(--text-muted)] transition-opacity">
            <button title="New File" onClick={(e) => { e.stopPropagation(); startCreate(workspacePath, 'file') }} className="hover:text-[var(--text-main)] transition-colors"><FilePlus size={12} /></button>
            <button title="New Folder" onClick={(e) => { e.stopPropagation(); startCreate(workspacePath, 'folder') }} className="hover:text-[var(--text-main)] transition-colors"><FolderPlus size={12} /></button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto" onContextMenu={e => handleContextMenu(e, null)}>
        {creatingParentPath === workspacePath && (
          <div className="flex items-center py-[2px] px-2 ml-4">
            <div className="w-4 h-4 mr-1 flex-shrink-0" />
            <div className="mr-1.5 flex-shrink-0">
              {creatingType === 'folder' ? <Folder size={15} className="text-[#dcb862]" /> : <FileCode size={15} className="text-[#5b9bd5]" />}
            </div>
            <input
              id="new-item-input"
              className="flex-1 bg-[var(--bg-side)] text-[var(--text-main)] text-[12px] px-1 py-0.5 rounded outline-none border border-blue-500/60 min-w-0"
              onKeyDown={e => {
                if (e.key === 'Enter') submitCreate(e.currentTarget.value)
                if (e.key === 'Escape') { setCreatingParentPath(null); setCreatingType(null) }
              }}
              onBlur={e => submitCreate(e.currentTarget.value)}
            />
          </div>
        )}
        {files.map(f => renderNode(f))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[500] bg-[var(--bg-side)] border border-[var(--border-main)] rounded-lg shadow-2xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.node && (
            <>
              <button onClick={() => startCreate(contextMenu.node!.isDir ? contextMenu.node!.path : contextMenu.node!.path.substring(0, contextMenu.node!.path.length - contextMenu.node!.name.length), 'file')}
                className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-main)]/80 hover:bg-[var(--border-main)] hover:text-[var(--text-main)] flex items-center space-x-2 transition-colors">
                <FilePlus size={12} /><span>New File</span>
              </button>
              <button onClick={() => startCreate(contextMenu.node!.isDir ? contextMenu.node!.path : contextMenu.node!.path.substring(0, contextMenu.node!.path.length - contextMenu.node!.name.length), 'folder')}
                className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-main)]/80 hover:bg-[var(--border-main)] hover:text-[var(--text-main)] flex items-center space-x-2 transition-colors">
                <FolderPlus size={12} /><span>New Folder</span>
              </button>
              <div className="border-t border-[var(--border-main)] my-0.5" />
              <button onClick={() => startRename(contextMenu.node!)}
                className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-main)]/80 hover:bg-[var(--border-main)] hover:text-[var(--text-main)] flex items-center space-x-2 transition-colors">
                <Pencil size={12} /><span>Rename</span>
              </button>
              <div className="border-t border-[var(--border-main)] my-0.5" />
              <button onClick={() => handleDelete(contextMenu.node!)}
                className="w-full text-left px-3 py-2 text-[12px] text-red-500/80 hover:bg-red-500/10 hover:text-red-400 flex items-center space-x-2 transition-colors">
                <Trash2 size={12} /><span>Delete</span>
              </button>
            </>
          )}
          {!contextMenu.node && (
            <>
              <button onClick={() => startCreate(workspacePath, 'file')}
                className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-main)]/80 hover:bg-[var(--border-main)] hover:text-[var(--text-main)] flex items-center space-x-2 transition-colors">
                <FilePlus size={12} /><span>New File...</span>
              </button>
              <button onClick={() => startCreate(workspacePath, 'folder')}
                className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-main)]/80 hover:bg-[var(--border-main)] hover:text-[var(--text-main)] flex items-center space-x-2 transition-colors">
                <FolderPlus size={12} /><span>New Folder...</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
