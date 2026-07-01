import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ZoomIn, ZoomOut, Loader2, AlertTriangle, FileText } from 'lucide-react';

export interface PlacementPosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  url: string | null;
  /** Keyed by "{level_order}_sig" | "{level_order}_name" */
  placements?: Record<string, PlacementPosition> | null;
  className?: string;
}

/** Scale positions were saved at in the placement editor */
const SAVE_SCALE = 1.4;

const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.4, 1.6, 2.0, 2.5, 3.0];
const DEFAULT_ZOOM_IDX = 4; // 1.4

const OVERLAY_LABELS: Record<string, string> = {
  sig: 'TTD', name: 'Nama',
  submitted: 'Tgl Submit', status: 'Status',
  punchlist: 'Punchlist', atpdate: 'Tgl ATP',
};

export default function PdfViewer({ url, placements, className }: Props) {
  const scrollRef        = useRef<HTMLDivElement>(null);
  const canvasRefs       = useRef<(HTMLCanvasElement | null)[]>([]);
  const pageRefs         = useRef<(HTMLDivElement | null)[]>([]);
  const renderCancel     = useRef<(() => void) | null>(null);
  const pendingScrollPage = useRef<number | null>(null);

  const [pdfDoc,      setPdfDoc]      = useState<any>(null);
  const [totalPages,  setTotalPages]  = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomIdx,     setZoomIdx]     = useState(DEFAULT_ZOOM_IDX);
  const [loading,     setLoading]     = useState(false);
  const [rendering,   setRendering]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const scale      = ZOOM_STEPS[zoomIdx];
  const canZoomIn  = zoomIdx < ZOOM_STEPS.length - 1;
  const canZoomOut = zoomIdx > 0;

  function changeZoom(newIdx: number) {
    pendingScrollPage.current = currentPage;
    setZoomIdx(newIdx);
  }

  /* ── Load PDF document ── */
  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const workerUrl = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();
        const workerText = await fetch(workerUrl).then(r => r.text());
        pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
          new Blob([workerText], { type: 'application/javascript' }),
        );

        const doc = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  /* ── Render all pages whenever pdfDoc or scale changes ── */
  const renderAllPages = useCallback(async () => {
    if (!pdfDoc || totalPages === 0) return;

    if (renderCancel.current) {
      renderCancel.current();
      renderCancel.current = null;
    }

    let cancelled = false;
    renderCancel.current = () => { cancelled = true; };
    setRendering(true);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (cancelled) break;

      const canvas = canvasRefs.current[pageNum - 1];
      if (!canvas) continue;

      try {
        const pg = await pdfDoc.getPage(pageNum);
        if (cancelled) break;

        const vp  = pg.getViewport({ scale });
        canvas.width  = vp.width;
        canvas.height = vp.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const task = pg.render({ canvasContext: ctx, viewport: vp });
        await task.promise;
      } catch (e: any) {
        if (e?.name === 'RenderingCancelledException') break;
      }
    }

    if (!cancelled) {
      setRendering(false);

      // Restore scroll position after zoom — browser needs one frame to apply new canvas sizes
      const target = pendingScrollPage.current;
      if (target !== null) {
        pendingScrollPage.current = null;
        requestAnimationFrame(() => {
          const container = scrollRef.current;
          const pageEl    = pageRefs.current[target - 1];
          if (!container || !pageEl) return;
          const gap = pageEl.getBoundingClientRect().top
                    - container.getBoundingClientRect().top;
          container.scrollTop += gap;
        });
      }
    }
  }, [pdfDoc, scale, totalPages]);

  // Re-render when pdfDoc loads or scale changes.
  // Using a string key so the effect only fires when these actually change.
  useEffect(() => {
    renderAllPages();
  }, [renderAllPages]);

  /* ── Track current page via scroll position ── */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || totalPages === 0) return;

    function onScroll() {
      const containerTop = container!.getBoundingClientRect().top;
      const containerMid = containerTop + container!.clientHeight / 2;

      let closest = 1;
      let closestDist = Infinity;

      pageRefs.current.forEach((ref, i) => {
        if (!ref) return;
        const rect = ref.getBoundingClientRect();
        const mid  = rect.top + rect.height / 2;
        const dist = Math.abs(mid - containerMid);
        if (dist < closestDist) {
          closestDist = dist;
          closest     = i + 1;
        }
      });

      setCurrentPage(closest);
    }

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [totalPages]);

  /* ── TTD overlays for a given page ── */
  const ratio = scale / SAVE_SCALE;

  function overlaysForPage(pageNum: number) {
    if (!placements) return [];
    return Object.entries(placements).filter(([, pos]) => pos.page === pageNum);
  }

  function boxStyle(pos: PlacementPosition): React.CSSProperties {
    return {
      left:   pos.x      * ratio,
      top:    pos.y      * ratio,
      width:  pos.width  * ratio,
      height: pos.height * ratio,
    };
  }

  function boxClass(key: string) {
    return key.endsWith('_sig')
      ? 'border-brand-ink bg-brand-surface/40 text-brand-ink'
      : 'border-ming/70 bg-[var(--color-bg-subtle)]/60 text-ming';
  }

  function boxLabel(key: string) {
    const [lo, type] = key.split('_');
    const label = OVERLAY_LABELS[type] ?? type;
    return lo === 'doc' ? label : `${label} L${lo}`;
  }

  /* ── No PDF state ── */
  if (!url) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed',
        'border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] py-16 text-center',
        className,
      )}>
        <FileText className="mb-3 h-10 w-10 text-[var(--color-text-tertiary)]" />
        <p className="text-sm text-[var(--color-text-secondary)]">Tidak ada PDF terlampir</p>
      </div>
    );
  }

  const hasPlacementLegend = placements && Object.keys(placements).length > 0;

  return (
    <div className={cn('flex flex-col gap-2', className)}>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-1.5 shadow-xs">
        {/* Zoom out */}
        <button
          onClick={() => changeZoom(zoomIdx - 1)}
          disabled={!canZoomOut}
          title="Zoom out"
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-30"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        {/* Zoom % — klik untuk reset ke default */}
        <button
          onClick={() => changeZoom(DEFAULT_ZOOM_IDX)}
          title="Reset zoom"
          className="min-w-[3.5rem] rounded-md px-1.5 py-0.5 text-center font-mono text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
        >
          {Math.round(scale * 100)}%
        </button>

        {/* Zoom in */}
        <button
          onClick={() => changeZoom(zoomIdx + 1)}
          disabled={!canZoomIn}
          title="Zoom in"
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-30"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

        {/* Page counter — read-only, updates on scroll */}
        <span className="font-mono text-xs text-[var(--color-text-secondary)]">
          {totalPages > 0 ? `Hal. ${currentPage} / ${totalPages}` : '—'}
        </span>

        {/* TTD legend */}
        {hasPlacementLegend && (
          <>
            <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]">
              <span className="inline-block h-3 w-5 rounded-sm border-2 border-dashed border-brand-ink bg-brand-surface/60" />
              TTD
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]">
              <span className="inline-block h-2.5 w-5 rounded-sm border-2 border-dashed border-ming/70 bg-[var(--color-bg-subtle)]" />
              Nama
            </span>
          </>
        )}

        {/* Spinner */}
        {(loading || rendering) && (
          <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-[var(--color-text-tertiary)]" />
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-surface px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Gagal memuat PDF: {error}</span>
        </div>
      )}

      {/* ── Scrollable page stack ── */}
      <div
        ref={scrollRef}
        className="overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)]"
        style={{ maxHeight: 'calc(100vh - 220px)' }}
      >
        {totalPages > 0 && Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
          <div
            key={pageNum}
            ref={el => { pageRefs.current[pageNum - 1] = el; }}
            data-page={pageNum}
            className="relative flex justify-center border-b border-[var(--color-border)] last:border-b-0 bg-white"
          >
            <div className="relative inline-block">
              <canvas
                ref={el => { canvasRefs.current[pageNum - 1] = el; }}
                className="block"
              />

              {/* TTD overlays for this page — read-only */}
              {overlaysForPage(pageNum).map(([key, pos]) => (
                <div
                  key={key}
                  style={boxStyle(pos)}
                  className={cn(
                    'pointer-events-none absolute rounded-sm border-2 border-dashed',
                    'flex items-center justify-center overflow-hidden',
                    boxClass(key),
                  )}
                >
                  <span
                    className="select-none truncate px-1 text-center font-bold"
                    style={{ fontSize: Math.max(9, Math.min(pos.height * ratio * 0.3, 13)) }}
                  >
                    {boxLabel(key)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Loading skeleton saat PDF belum selesai dimuat */}
        {loading && (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-tertiary)]" />
          </div>
        )}
      </div>
    </div>
  );
}
