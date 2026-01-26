'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Trash, ArrowDown, Pause, Play, FunnelSimple, Export } from '@phosphor-icons/react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { gameLogService, LogEntry } from '@/lib/services/GameLogService';
import { useTranslation } from 'react-i18next';

interface GameConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  modsPath: string;
  showDebugLogs: boolean;
}

/**
 * Log level colors
 */
const LEVEL_COLORS: Record<string, string> = {
  INFO: '#9CA3AF',
  WARN: '#F59E0B',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  DEBUG: '#8B5CF6',
};

/**
 * Source colors (cycling through a palette)
 */
const SOURCE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

/**
 * Get consistent color for a source
 */
function getSourceColor(source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash = hash & hash;
  }
  return SOURCE_COLORS[Math.abs(hash) % SOURCE_COLORS.length];
}

/**
 * Single log row component - memoized for performance
 */
function LogRow({ log }: { log: LogEntry }) {
  return (
    <div
      className="py-0.5 hover:bg-white/5 flex gap-2 px-2"
      style={{ lineHeight: '1.4' }}
    >
      {/* Timestamp */}
      <span className="text-gray-600 shrink-0 w-24 font-mono text-xs">
        {log.timestamp}
      </span>

      {/* Level */}
      <span
        className="shrink-0 w-12 font-mono text-xs"
        style={{ color: LEVEL_COLORS[log.level] || '#9CA3AF' }}
      >
        [{log.level}]
      </span>

      {/* Source */}
      <span
        className="shrink-0 w-32 truncate font-mono text-xs"
        style={{ color: getSourceColor(log.source) }}
        title={log.source}
      >
        {log.source}
      </span>

      {/* Message */}
      <span className="text-gray-300 break-all font-mono text-xs">
        {log.message}
      </span>
    </div>
  );
}

/**
 * Game Console Panel - Displays real-time Sims 4 logs with virtualization
 */
export default function GameConsole({ isOpen, onClose, modsPath, showDebugLogs }: GameConsoleProps) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [showSourceFilter, setShowSourceFilter] = useState(false);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const pausedLogsRef = useRef<LogEntry[]>([]);

  /**
   * Handle new log entries from the service
   */
  const handleNewLogs = useCallback((entries: LogEntry[]) => {
    if (isPaused) {
      pausedLogsRef.current.push(...entries);
      return;
    }

    setLogs(prev => {
      const updated = [...prev, ...entries];
      // Keep last 10000 entries to prevent memory issues
      return updated.slice(-10000);
    });

    // Update available sources
    const sources = new Set(entries.map(e => e.source));
    setAvailableSources(prev => {
      const updated = new Set([...prev, ...sources]);
      return Array.from(updated).sort();
    });

    // Force scroll to bottom if we're at bottom
    if (atBottom) {
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: 'LAST',
          behavior: 'auto',
        });
      });
    }
  }, [isPaused, atBottom]);

  /**
   * Start/stop watching logs based on panel state
   */
  useEffect(() => {
    if (isOpen && modsPath) {
      gameLogService.startWatching(modsPath, handleNewLogs, 500, {
        includeDebugLogs: showDebugLogs,
      });
    } else {
      gameLogService.stopWatching();
    }

    return () => {
      gameLogService.stopWatching();
    };
  }, [isOpen, modsPath, handleNewLogs, showDebugLogs]);

  /**
   * Resume and flush paused logs
   */
  const handleResume = () => {
    setIsPaused(false);
    if (pausedLogsRef.current.length > 0) {
      setLogs(prev => [...prev, ...pausedLogsRef.current].slice(-10000));
      pausedLogsRef.current = [];
    }
  };

  /**
   * Clear all logs
   */
  const handleClear = () => {
    setLogs([]);
    pausedLogsRef.current = [];
    setAvailableSources([]);
    setSelectedSources(new Set());
  };

  /**
   * Scroll to bottom
   */
  const scrollToBottom = () => {
    virtuosoRef.current?.scrollToIndex({
      index: 'LAST',
      behavior: 'smooth',
    });
  };

  /**
   * Toggle source filter
   */
  const toggleSource = (source: string) => {
    setSelectedSources(prev => {
      const updated = new Set(prev);
      if (updated.has(source)) {
        updated.delete(source);
      } else {
        updated.add(source);
      }
      return updated;
    });
  };

  /**
   * Export logs to a file
   */
  const handleExport = async () => {
    // Generate default filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultName = `sims4-logs-${timestamp}.log`;

    // Ask user where to save
    const filePath = await save({
      defaultPath: defaultName,
      filters: [
        { name: 'Log Files', extensions: ['log', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!filePath) return; // User cancelled

    // Format logs for export
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : logs;
    const content = logsToExport
      .map(log => `${log.timestamp} [${log.level}] ${log.source}: ${log.message}`)
      .join('\n');

    // Write to file
    try {
      await writeTextFile(filePath, content);
      console.log(`[GameConsole] Exported ${logsToExport.length} logs to ${filePath}`);
    } catch (error) {
      console.error('[GameConsole] Failed to export logs:', error);
    }
  };

  /**
   * Filter logs based on search and source selection
   */
  const filteredLogs = logs.filter(log => {
    // Filter by source
    if (selectedSources.size > 0 && !selectedSources.has(log.source)) {
      return false;
    }
    // Filter by search text
    if (filter && !log.raw.toLowerCase().includes(filter.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-[90vw] h-[80vh] max-w-6xl rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: '#1E1E1E' }}
      >
        {/* Header */}
        <div
          className="h-12 flex items-center justify-between px-4 border-b shrink-0"
          style={{ borderColor: '#333', backgroundColor: '#252526' }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white">{t('console.title')}</h2>
            <span className="text-xs text-gray-500">
              {t('console.logs_count', { count: filteredLogs.length })} {isPaused && t('console.paused_count', { count: pausedLogsRef.current.length })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter input */}
            <input
              type="text"
              placeholder={t('console.filter_placeholder')}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2 py-1 text-xs rounded border bg-transparent text-white"
              style={{ borderColor: '#444', width: '150px' }}
            />

            {/* Source filter toggle */}
            <button
              onClick={() => setShowSourceFilter(!showSourceFilter)}
              className="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title={t('console.filter_by_source')}
            >
              <FunnelSimple
                size={16}
                className={selectedSources.size > 0 ? 'text-brand-green' : 'text-gray-400'}
              />
            </button>

            {/* Pause/Resume */}
            <button
              onClick={() => isPaused ? handleResume() : setIsPaused(true)}
              className="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title={isPaused ? t('console.resume') : t('console.pause')}
            >
              {isPaused ? (
                <Play size={16} className="text-green-400" />
              ) : (
                <Pause size={16} className="text-gray-400" />
              )}
            </button>

            {/* Scroll to bottom */}
            <button
              onClick={scrollToBottom}
              className="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title={t('console.scroll_to_bottom')}
            >
              <ArrowDown size={16} className={atBottom ? 'text-brand-green' : 'text-gray-400'} />
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              className="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title={t('console.export_logs')}
            >
              <Export size={16} className="text-gray-400" />
            </button>

            {/* Clear */}
            <button
              onClick={handleClear}
              className="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title={t('console.clear_logs')}
            >
              <Trash size={16} className="text-gray-400" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title={t('console.close')}
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Source filter dropdown */}
        {showSourceFilter && availableSources.length > 0 && (
          <div
            className="px-4 py-2 border-b flex flex-wrap gap-1 max-h-24 overflow-y-auto"
            style={{ borderColor: '#333', backgroundColor: '#2D2D2D' }}
          >
            {availableSources.map(source => (
              <button
                key={source}
                onClick={() => toggleSource(source)}
                className="px-2 py-0.5 text-xs rounded transition-colors"
                style={{
                  backgroundColor: selectedSources.has(source) ? getSourceColor(source) : '#444',
                  color: 'white',
                  opacity: selectedSources.size === 0 || selectedSources.has(source) ? 1 : 0.5,
                }}
              >
                {source}
              </button>
            ))}
            {selectedSources.size > 0 && (
              <button
                onClick={() => setSelectedSources(new Set())}
                className="px-2 py-0.5 text-xs rounded bg-gray-600 text-white hover:bg-gray-500"
              >
                {t('console.clear_filter')}
              </button>
            )}
          </div>
        )}

        {/* Virtualized log content */}
        <div className="flex-1" style={{ backgroundColor: '#1E1E1E' }}>
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              {logs.length === 0 ? t('console.waiting_for_logs') : t('console.no_match')}
            </div>
          ) : (
            <Virtuoso
              ref={virtuosoRef}
              data={filteredLogs}
              followOutput="smooth"
              atBottomStateChange={setAtBottom}
              itemContent={(index, log) => <LogRow log={log} />}
              style={{ height: '100%' }}
            />
          )}
        </div>

        {/* Status bar */}
        <div
          className="h-6 px-4 flex items-center justify-between text-xs border-t"
          style={{ borderColor: '#333', backgroundColor: '#252526', color: '#888' }}
        >
          <span>
            {t('console.sources_count', { count: availableSources.length })} | {t('console.total_logs', { count: logs.length })}
          </span>
          {!atBottom && (
            <span className="text-yellow-500">{t('console.auto_scroll_disabled')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
