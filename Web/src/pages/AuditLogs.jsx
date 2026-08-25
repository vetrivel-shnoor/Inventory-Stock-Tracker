import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { auditApi } from '../services/auditApi';
import { format } from 'date-fns';
import { ShieldAlert, Loader2, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const parentRef = useRef(null);

  const fetchLogs = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setIsFetchingNextPage(true);

    try {
      const response = await auditApi.getAuditLogs({ page: pageNum, limit: 50 });
      if (pageNum === 1) {
        setLogs(response.data);
      } else {
        setLogs(prev => [...prev, ...response.data]);
      }
      setHasMore(pageNum < response.totalPages);
    } catch (err) {
      toast.error('Failed to load audit logs', { id: 'fetch-audit-error' });
    } finally {
      setLoading(false);
      setIsFetchingNextPage(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  const rowVirtualizer = useVirtualizer({
    count: hasMore ? logs.length + 1 : logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Estimated row height
    overscan: 5,
  });

  useEffect(() => {
    const [lastItem] = rowVirtualizer.getVirtualItems().slice(-1);
    if (
      lastItem &&
      lastItem.index >= logs.length - 1 &&
      hasMore &&
      !isFetchingNextPage
    ) {
      setPage(prev => prev + 1);
    }
  }, [rowVirtualizer.getVirtualItems(), hasMore, isFetchingNextPage, logs.length]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6 max-w-7xl mx-auto w-full gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
            <ShieldAlert className="text-[var(--color-primary)]" />
            Audit Logs
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">System activity and security events</p>
        </div>
      </div>

      <div 
        ref={parentRef}
        className="flex-1 overflow-auto bg-[var(--color-bg-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl relative"
      >
        {loading && page === 1 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <Activity className="w-12 h-12 mb-4" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const isLoaderRow = virtualRow.index > logs.length - 1;
              const log = logs[virtualRow.index];

              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="px-6"
                >
                  {isLoaderRow ? (
                    <div className="flex justify-center items-center py-4">
                      {hasMore ? <Loader2 className="animate-spin text-[var(--color-primary)]" /> : <span className="text-sm opacity-50">End of records</span>}
                    </div>
                  ) : (
                    <div className="flex items-center w-full h-full border-b border-[var(--color-border-subtle)] hover:bg-white/5 transition-colors text-sm">
                        <div className="flex-1 min-w-[200px] flex items-center gap-3">
                            <span className="px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded text-xs font-semibold">{log.action}</span>
                        </div>
                        <div className="flex-1 min-w-[150px] opacity-70">
                            {log.performedBy ? log.performedBy.fullname || log.performedBy.email : 'System'}
                        </div>
                        <div className="flex-1 min-w-[150px] opacity-70">
                            {log.entity} {log.entityId && `(${log.entityId.sku || log.entityId.name || log.entityId})`}
                        </div>
                        <div className="flex-1 min-w-[150px] font-mono text-xs opacity-60">
                            {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                        </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
