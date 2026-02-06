/**
 * Project Selector Component
 * Sidebar dropdown for switching between projects
 *
 * Features:
 * - Shows active project name + icon
 * - Dropdown with all user projects
 * - "Add New Project" button
 * - Auto-selects first project if none active
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useProjects } from '@client/hooks/useProjects';
import { useLogger } from '@client/utils/logger';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { cn } from '@client/utils/cn';

interface IProjectSelectorProps {
  onOpenOnboarding?: () => void;
}

export function ProjectSelector({ onOpenOnboarding }: IProjectSelectorProps): JSX.Element {
  const t = useMemo(() => getTranslations('dashboard'), []);
  const logger = useLogger('ProjectSelector');
  const { projects, activeProject, activeProjectId, setActiveProject } = useProjects();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProject = (projectId: string) => {
    setActiveProject(projectId);
    setIsOpen(false);
    logger.info('Project switched', { projectId });
  };

  const handleAddNew = () => {
    setIsOpen(false);
    onOpenOnboarding?.();
  };

  // Get first letter of project name for avatar
  const getProjectInitial = (name: string) => {
    return name?.charAt(0).toUpperCase() || '?';
  };

  return (
    <div className="mb-6 px-2" ref={dropdownRef}>
      <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
        {t('projects.activeProject')}
      </div>
      <div className="relative">
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-surface-light hover:bg-elevated transition-colors border border-border rounded-lg p-3 flex items-center justify-between group"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-accent/20 text-accent-light flex items-center justify-center font-bold text-sm shrink-0">
              {activeProject ? getProjectInitial(activeProject.name) : '?'}
            </div>
            <div className="truncate text-left">
              <div className="text-sm font-medium text-white truncate">
                {activeProject?.name || t('projects.noProjectSelected')}
              </div>
              <div className="text-xs text-muted group-hover:text-secondary">
                {t('projects.manageProjects')}
              </div>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted shrink-0 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
            {/* Project List */}
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project.id)}
                className={cn(
                  'w-full px-3 py-2.5 flex items-center gap-3 hover:bg-elevated transition-colors text-left',
                  activeProjectId === project.id && 'bg-elevated'
                )}
              >
                <div className="w-8 h-8 rounded bg-accent/20 text-accent flex items-center justify-center font-bold text-sm shrink-0">
                  {getProjectInitial(project.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'text-sm font-medium truncate',
                      activeProjectId === project.id ? 'text-accent' : 'text-secondary'
                    )}
                  >
                    {project.name}
                  </div>
                  {project.domain && (
                    <div className="text-xs text-muted truncate">{project.domain}</div>
                  )}
                </div>
              </button>
            ))}

            {/* Add New Project Button */}
            <button
              onClick={handleAddNew}
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-elevated transition-colors text-left border-t border-border"
            >
              <div className="w-8 h-8 rounded bg-accent/20 text-accent flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-accent">
                {t('projects.selector.addNew')}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
