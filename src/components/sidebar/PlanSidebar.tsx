import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { CheckCircle2, Circle, Clock, AlertCircle, FileText } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export default function PlanSidebar() {
  const { tasks, artifacts } = useSelector((state: RootState) => state.plan);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-side)] overflow-y-auto">
      <div className="p-4 border-b border-[var(--border-main)]">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Implementation Plan</h2>
        
        {tasks.length === 0 && (
          <div className="text-[11px] text-[var(--text-muted)] opacity-60 italic">
            No active plan. Ask the AI to help you build something!
          </div>
        )}

        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start space-x-3 group">
              <div className="mt-0.5">
                {task.status === 'completed' && <CheckCircle2 size={14} className="text-green-500" />}
                {task.status === 'in-progress' && <Clock size={14} className="text-blue-400 animate-pulse" />}
                {task.status === 'pending' && <Circle size={14} className="text-[var(--text-muted)]" />}
                {task.status === 'failed' && <AlertCircle size={14} className="text-red-500" />}
              </div>
              <div className="flex-1">
                <div className={cn(
                  "text-[12px] leading-tight",
                  task.status === 'completed' ? "text-[var(--text-muted)] line-through opacity-60" : "text-[var(--text-main)]"
                )}>
                  {task.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Artifacts</h2>
        <div className="space-y-2">
          {artifacts.map((artifact) => (
            <div 
              key={artifact.id}
              className="flex items-center space-x-2 p-2 rounded hover:bg-[var(--bg-main)] cursor-pointer transition-colors border border-transparent hover:border-[var(--border-main)]"
            >
              <FileText size={14} className="text-blue-400" />
              <div className="flex-1 overflow-hidden">
                <div className="text-[11px] font-medium text-[var(--text-main)] truncate">{artifact.title}</div>
                <div className="text-[9px] text-[var(--text-muted)] uppercase">{artifact.type}</div>
              </div>
            </div>
          ))}
          {artifacts.length === 0 && (
             <div className="text-[11px] text-[var(--text-muted)] opacity-60 italic">
             No artifacts generated yet.
           </div>
          )}
        </div>
      </div>
    </div>
  );
}
