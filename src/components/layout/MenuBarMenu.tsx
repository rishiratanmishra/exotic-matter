import React, { useState, useRef, useEffect } from 'react'
import { ChevronRight, Check } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

interface MenuItem {
  label?: string
  shortcut?: string
  onClick?: () => void
  disabled?: boolean
  checked?: boolean
  separator?: boolean
  submenu?: MenuItem[]
}

interface MenuBarMenuProps {
  label: string
  items: MenuItem[]
}

export default function MenuBarMenu({ label, items }: MenuBarMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-2 py-1 text-[11px] transition-colors rounded no-drag",
          isOpen 
            ? "bg-[var(--border-main)] text-[var(--text-main)]" 
            : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-main)]"
        )}
      >
        {label}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-0.5 w-64 bg-[var(--bg-side)] border border-[var(--border-main)] py-1 shadow-xl z-[100] rounded-md animate-in fade-in zoom-in-95 duration-100">
          {items.map((item, idx) => (
            item.separator ? (
              <div key={idx} className="h-[1px] bg-[var(--border-main)] my-1 mx-1" />
            ) : (
              <MenuEntry key={idx} item={item} closeMenu={() => setIsOpen(false)} />
            )
          ))}
        </div>
      )}
    </div>
  )
}

function MenuEntry({ item, closeMenu }: { item: MenuItem, closeMenu: () => void }) {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    if (item.submenu) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setIsSubmenuOpen(true)
    }
  }

  const handleMouseLeave = () => {
    if (item.submenu) {
      timeoutRef.current = setTimeout(() => setIsSubmenuOpen(false), 200)
    }
  }

  const handleClick = () => {
    if (item.onClick) {
      item.onClick()
      closeMenu()
    }
  }

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        disabled={item.disabled}
        onClick={handleClick}
        className={cn(
          "w-full px-3 py-1.5 text-[11px] flex items-center justify-between transition-colors",
          item.disabled 
            ? "opacity-40 cursor-default" 
            : "hover:bg-blue-600 hover:text-white cursor-pointer",
          isSubmenuOpen && !item.disabled && "bg-blue-600 text-white"
        )}
      >
        <div className="flex items-center">
          <div className="w-4 flex items-center">
            {item.checked && <Check size={12} />}
          </div>
          <span className="ml-1">{item.label}</span>
        </div>
        <div className="flex items-center space-x-2">
          {item.shortcut && (
            <span className="text-[10px] opacity-60 ml-4 font-mono">{item.shortcut}</span>
          )}
          {item.submenu && <ChevronRight size={12} className="opacity-60" />}
        </div>
      </button>

      {isSubmenuOpen && item.submenu && (
        <div className="absolute top-0 left-full -ml-[2px] w-56 bg-[var(--bg-side)] border border-[var(--border-main)] py-1 shadow-xl z-[110] rounded-md animate-in fade-in slide-in-from-left-1 duration-100">
          {item.submenu.map((sub, sidx) => (
            sub.separator ? (
              <div key={sidx} className="h-[1px] bg-[var(--border-main)] my-1 mx-1" />
            ) : (
              <MenuEntry key={sidx} item={sub} closeMenu={closeMenu} />
            )
          ))}
        </div>
      )}
    </div>
  )
}
