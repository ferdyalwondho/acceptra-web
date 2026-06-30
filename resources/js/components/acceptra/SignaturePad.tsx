import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Pen, Upload, Trash2, RotateCcw } from 'lucide-react';

export interface SignaturePadProps {
  onSave?: (dataUrl: string) => void;
  savedSignature?: string | null;
  className?: string;
}

type Mode = 'draw' | 'upload';

export default function SignaturePad({ onSave, savedSignature, className }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [uploadedImg, setUploadedImg] = useState<string | null>(null);
  const [useSaved, setUseSaved] = useState(!!savedSignature);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  /* ── canvas helpers ── */
  function getCtx() {
    const c = canvasRef.current;
    if (!c) return null;
    return c.getContext('2d');
  }

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function clearCanvas() {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasStroke(false);
    lastPos.current = null;
  }

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    lastPos.current = pos;
    setIsDrawing(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasStroke(true);
  }, [isDrawing]);

  const onPointerUp = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  /* ── upload ── */
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImg(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  /* ── get current sig ── */
  function getCurrentSig(): string | null {
    if (useSaved && savedSignature) return savedSignature;
    if (mode === 'upload') return uploadedImg;
    if (!hasStroke || !canvasRef.current) return null;
    return canvasRef.current.toDataURL('image/png');
  }

  const isReady = useSaved ? !!savedSignature : mode === 'upload' ? !!uploadedImg : hasStroke;

  function handleConfirm() {
    const sig = getCurrentSig();
    if (sig && onSave) onSave(sig);
  }

  /* resize canvas on mount */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const parent = c.parentElement;
    if (parent) {
      c.width = parent.clientWidth;
      c.height = 180;
    }
  }, [mode]);

  if (useSaved && savedSignature) {
    return (
      <div className={cn('space-y-3', className)}>
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Tanda Tangan Tersimpan</p>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-white p-4">
          <img src={savedSignature} alt="Saved signature" className="h-16 object-contain" />
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setUseSaved(false)}
            className="text-xs font-medium text-ming hover:underline"
          >
            Ganti
          </button>
        </div>
        <button
          type="button"
          disabled={!isReady}
          onClick={handleConfirm}
          className={cn(
            'h-10 w-full rounded-md text-sm font-semibold text-white transition-all',
            'bg-brand-ink hover:bg-brand-hover',
            'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
            'disabled:opacity-50 disabled:pointer-events-none',
          )}
        >
          Pakai Tanda Tangan Ini
        </button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-1">
        {(['draw', 'upload'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); clearCanvas(); setUploadedImg(null); }}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors',
              mode === m ? 'bg-white text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {m === 'draw' ? <Pen className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
            {m === 'draw' ? 'Gambar' : 'Upload'}
          </button>
        ))}
      </div>

      {/* Saved signature shortcut */}
      {savedSignature && (
        <button
          type="button"
          onClick={() => setUseSaved(true)}
          className="w-full rounded-lg border border-dashed border-brand/40 bg-brand-surface py-2 text-xs font-medium text-brand-ink hover:bg-brand-surface/80 transition-colors"
        >
          Pakai tanda tangan tersimpan
        </button>
      )}

      {mode === 'draw' ? (
        <div className="relative rounded-lg border border-[var(--color-border-strong)] bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            className="block w-full cursor-crosshair touch-none"
            style={{ height: 180 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          {!hasStroke && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-[var(--color-text-tertiary)]">Gambar tanda tangan di sini…</p>
            </div>
          )}
          <button
            type="button"
            onClick={clearCanvas}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-muted"
            aria-label="Clear"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border-strong)] bg-white p-4 text-center transition-colors hover:border-brand hover:bg-brand-surface/30">
          {uploadedImg ? (
            <>
              <img src={uploadedImg} alt="Uploaded signature" className="max-h-24 object-contain" />
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setUploadedImg(null); }}
                className="mt-2 flex items-center gap-1 text-xs text-danger hover:underline"
              >
                <Trash2 className="h-3 w-3" /> Hapus
              </button>
            </>
          ) : (
            <>
              <Upload className="mb-2 h-8 w-8 text-[var(--color-text-tertiary)]" />
              <p className="text-xs text-[var(--color-text-secondary)]">Klik atau drag gambar TTD</p>
              <p className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">PNG / JPG, transparan lebih baik</p>
            </>
          )}
          <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
        </label>
      )}

      <button
        type="button"
        disabled={!isReady}
        onClick={handleConfirm}
        className={cn(
          'h-10 w-full rounded-md text-sm font-semibold text-white transition-all',
          'bg-brand-ink hover:bg-brand-hover',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
          'disabled:opacity-50 disabled:pointer-events-none',
        )}
      >
        Konfirmasi Tanda Tangan
      </button>
    </div>
  );
}
