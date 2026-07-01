import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Sparkles, BookOpen, HelpCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GetStartedModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  function handleClose() {
    if (dontShowAgain) {
      axios.post('/profile/dismiss-get-started').catch(() => {});
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-ink shrink-0" />
            <DialogTitle>{t('get_started.title')}</DialogTitle>
          </div>
          <DialogDescription className="mt-1">
            {t('get_started.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          <Link
            href="/help?tab=guide"
            onClick={handleClose}
            className="flex items-center gap-2.5 rounded-md border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            <BookOpen className="h-4 w-4 shrink-0 text-brand-ink" />
            {t('get_started.cta_guide')}
          </Link>
          <Link
            href="/help?tab=faq"
            onClick={handleClose}
            className="flex items-center gap-2.5 rounded-md border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            <HelpCircle className="h-4 w-4 shrink-0 text-brand-ink" />
            {t('get_started.cta_faq')}
          </Link>
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="h-4 w-4 rounded-[4px] border border-[var(--color-border-strong)] accent-brand-ink"
          />
          {t('get_started.dont_show_again')}
        </label>

        <DialogFooter>
          <Button onClick={handleClose}>{t('get_started.close_btn')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
