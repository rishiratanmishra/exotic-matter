import React, { useState } from 'react'
import { Search as SearchIcon, FileText, ChevronRight } from 'lucide-react'

interface SearchResult {
  path: string
  line: number
  content: string
}

interface SearchSidebarProps {
  workspacePath: string | null
  onResultClick: (path: string) => void
}

const SearchSidebar: React.FC<SearchSidebarProps> = ({ workspacePath, onResultClick }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async () => {
    if (!query.trim() || !workspacePath) return
    setIsSearching(true)
    try {
      const resp = await window.capsicode.searchWorkspace(workspacePath, query)
      setResults(resp)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#252526]">
      <div className="p-4 space-y-3">
        <div className="relative group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search in workspace..."
            className="w-full bg-[#3c3c3c] text-[#cccccc] text-[11px] px-3 py-1.5 rounded border border-transparent focus:outline-none focus:ring-0 focus:border-none outline-none ring-0 transition-all"
          />
          <SearchIcon 
            size={12} 
            className="absolute right-2 top-2 text-[#858585] cursor-pointer hover:text-white"
            onClick={handleSearch}
          />
        </div>
        {isSearching && <div className="text-[10px] text-blue-400 animate-pulse px-1">Searching...</div>}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 scrollbar-none">
        {results.length > 0 ? (
          results.map((res, i) => (
            <div 
              key={i}
              onClick={() => onResultClick(res.path)}
              className="p-2 hover:bg-[#2a2d2e] rounded cursor-pointer group transition-colors border border-transparent hover:border-[#3c3c3c]"
            >
              <div className="flex items-center space-x-2 mb-1">
                <FileText size={12} className="text-[#858585]" />
                <span className="text-[10px] text-[#cccccc] truncate font-mono">
                  {res.path.split(/[\/\\]/).pop()}
                </span>
                <span className="text-[9px] text-[#858585]">line {res.line}</span>
              </div>
              <div className="text-[11px] text-[#858585] truncate pl-4 font-mono group-hover:text-[#cccccc]">
                {res.content}
              </div>
            </div>
          ))
        ) : query && !isSearching ? (
          <div className="text-center py-10 text-[11px] text-[#858585]">
            No results found for "{query}"
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default SearchSidebar
