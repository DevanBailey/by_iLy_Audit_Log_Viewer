* by_iLy_AuditLogViewer
 * Version: 1.0.0
 *
 * Standalone React component for the ICP Audit Log Viewer canister.
 *
 * Props
 * -----
 * actor : AuditLogBackend  -- canister actor produced by @dfinity/agent
 *
 * The component calls getMyRole() on mount and renders the paginated log
 * table only when the result is "admin". All other callers see an
 * access-denied screen.
 *
 * Dependencies: @tanstack/react-query, lucide-react, shadcn/ui
 *   (Table, Button, Badge, Skeleton)
 */

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileSearch,
  Clock,
  AlertCircle,
} from "lucide-react";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Shape of a single audit log record returned by the canister. */
export interface AuditEntry {
  timestamp : bigint;
  principal : string;
  action    : string;
  entity    : string;
}

/** Minimal canister actor interface required by this component. */
export interface AuditLogBackend {
  getAuditLogs(
    page     : bigint,
    pageSize : bigint
  ): Promise<{ total: bigint; entries: AuditEntry[] }>;
  getMyRole(): Promise<string>;
}

/** Props accepted by the AuditLogViewer component. */
export interface AuditLogViewerProps {
  /** Canister actor. Must satisfy AuditLogBackend. */
  actor : AuditLogBackend;
  /** Entries per page. Defaults to 10. */
  pageSize ?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ms: bigint): string {
  // timestamp field is stored as milliseconds (Int in Motoko)
  return new Date(Number(ms)).toLocaleString();
}

function truncatePrincipal(principal: string, maxLen = 28): string {
  if (principal.length <= maxLen) return principal;
  const half = Math.floor((maxLen - 3) / 2);
  return `${principal.slice(0, half)}...${principal.slice(-half)}`;
}

function getActionVariant(
  action: string
): "default" | "secondary" | "destructive" | "outline" {
  const u = action.toUpperCase();
  if (u.includes("DELETE") || u.includes("REMOVE") || u.includes("REVOKE") || u.includes("DENIED"))
    return "destructive";
  if (u.includes("CREATE") || u.includes("ADD") || u.includes("GRANT") || u.includes("LOGIN"))
    return "default";
  if (u.includes("UPDATE") || u.includes("MODIFY") || u.includes("EDIT") || u.includes("CHANGE"))
    return "secondary";
  return "outline";
}

// ─── Internal sub-components ──────────────────────────────────────────────────

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <TableRow key={`skel-${i}`} className="border-border">
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

interface PaginationProps {
  currentPage  : number;
  totalPages   : number;
  onPageChange : (page: number) => void;
}

function PaginationControls({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages: (number | "ellipsis")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end   = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1.5 py-4">
      <Button
        variant="outline" size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page, idx) =>
        page === "ellipsis" ? (
          <span
            key={`ellipsis-${idx}`}
            className="h-8 w-8 flex items-center justify-center text-muted-foreground text-sm select-none"
          >…</span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className={page === currentPage ? "h-8 w-8 p-0 font-semibold" : "h-8 w-8 p-0"}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant="outline" size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <div className="text-center space-y-1.5 max-w-sm">
        <h2 className="text-xl font-semibold tracking-tight">Access Restricted</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This view is only available to administrators. Contact your system
          administrator if you believe this is an error.
        </p>
      </div>
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Required role: admin
      </Badge>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * AuditLogViewer
 *
 * Renders a paginated, read-only audit log table. Verifies the caller's role
 * via `actor.getMyRole()` before displaying any data.
 */
export default function AuditLogViewer({ actor, pageSize = DEFAULT_PAGE_SIZE }: AuditLogViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Role check
  const {
    data: role,
    isLoading: roleLoading,
    isError: roleError,
  } = useQuery({
    queryKey: ["auditLogViewerRole"],
    queryFn : () => actor.getMyRole(),
  });

  // Log data (only runs when role is confirmed)
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey : ["auditLogViewerEntries", currentPage],
    queryFn  : () => actor.getAuditLogs(BigInt(currentPage - 1), BigInt(pageSize)),
    enabled  : role === "admin",
  });

  const entries    = data?.entries ?? [];
  const total      = Number(data?.total ?? 0n);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Role loading / error states ──────────────────────────────────────────
  if (roleLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Verifying access…</span>
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                {["Timestamp", "Principal", "Action", "Entity"].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody><SkeletonRows count={pageSize} /></TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (roleError) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-4 text-sm max-w-lg">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Failed to verify role</p>
          <p className="text-muted-foreground mt-0.5">
            Could not determine your access level. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  if (role !== "admin") return <AccessDenied />;

  // ── Log table ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `${total.toLocaleString()} total entries — Page ${currentPage} of ${totalPages}`}
          </span>
          {isFetching && !isLoading && (
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
          )}
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error banner */}
      {isError && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Failed to load audit log</p>
            <p className="text-muted-foreground mt-0.5">
              {error instanceof Error ? error.message : "An unexpected error occurred."}
            </p>
            <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs text-destructive underline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/60 hover:bg-secondary/60 border-b border-border">
              <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />Timestamp
                </span>
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">Principal</TableHead>
              <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">Action</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">Entity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows count={pageSize} />
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileSearch className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No audit log entries found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry, idx) => (
                <TableRow
                  key={`${entry.timestamp}-${idx}`}
                  className={`border-b border-border/60 last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/30"} hover:bg-accent/10`}
                >
                  <TableCell className="py-3">
                    <span className="font-mono text-xs text-foreground/80">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="font-mono text-xs text-foreground/70" title={entry.principal}>
                      {truncatePrincipal(entry.principal)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      variant={getActionVariant(entry.action)}
                      className="text-[11px] font-mono font-medium uppercase tracking-wide px-2 py-0.5"
                    >
                      {entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-sm text-foreground/80 font-medium">{entry.entity}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Admin indicator */}
      <div className="flex justify-end">
        <Badge variant="outline" className="text-[11px] gap-1 text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />admin
        </Badge>
      </div>
    </div>
  );
}