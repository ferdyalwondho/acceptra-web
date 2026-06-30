import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  countdown: number;
  onKeepAlive: () => void;
}

const TOTAL = 60;
const R     = 20;
const CIRC  = 2 * Math.PI * R;

export default function IdleWarningDialog({ open, countdown, onKeepAlive }: Props) {
  const { t }    = useTranslation();
  const pct      = countdown / TOTAL;
  const dashFill = pct * CIRC;
  const urgent   = countdown <= 10;

  const label = countdown >= 60
    ? '1:00'
    : `0:${String(countdown).padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onKeepAlive(); }}>
      <DialogContent
        className="max-w-sm"
        onInteractOutside={(e: Event) => e.preventDefault()}
        onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning shrink-0" />
            <DialogTitle>{t('idle.title')}</DialogTitle>
          </div>
          <DialogDescription className="mt-1">
            {t('idle.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Circular countdown */}
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="relative h-14 w-14">
            {/* SVG ring */}
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
              {/* Track */}
              <circle
                cx="24" cy="24" r={R}
                fill="none"
                className="stroke-border"
                strokeWidth="4"
              />
              {/* Progress arc */}
              <circle
                cx="24" cy="24" r={R}
                fill="none"
                className={urgent ? 'stroke-danger transition-all duration-[900ms] ease-linear' : 'stroke-brand transition-all duration-[900ms] ease-linear'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${dashFill} ${CIRC}`}
              />
            </svg>
            {/* Label */}
            <span className={[
              'absolute inset-0 flex items-center justify-center',
              'text-sm font-bold tabular-nums',
              urgent ? 'text-danger' : 'text-[var(--color-text-primary)]',
            ].join(' ')}>
              {label}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t('idle.logout_in', { count: countdown })}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => router.post('/logout')}>
            {t('idle.logout_now')}
          </Button>
          <Button onClick={onKeepAlive}>
            {t('idle.stay_logged_in')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
