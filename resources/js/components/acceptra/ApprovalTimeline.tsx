import { Check, X, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepState = 'done' | 'active' | 'pending' | 'rejected';

export interface ApprovalStep {
  id: string;
  level: number;
  role: string;
  pic?: string;
  date?: string;
  state: StepState;
  requiresSignature: boolean;
  reason?: string;
}

interface Props {
  steps: ApprovalStep[];
  partnerView?: boolean;
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') return <Check className="h-3.5 w-3.5" />;
  if (state === 'rejected') return <X className="h-3.5 w-3.5" />;
  return null;
}

export default function ApprovalTimeline({ steps, partnerView = false }: Props) {
  const l1DoneIndex = steps.findIndex((s) => s.level === 1 && s.state === 'done');
  const showGeneric = partnerView && l1DoneIndex !== -1;

  const visibleSteps = partnerView
    ? steps.filter((s) => s.level <= 1)
    : steps;

  return (
    <ol className="relative space-y-0">
      {visibleSteps.map((step, i) => {
        const isLast = i === visibleSteps.length - 1 && !showGeneric;
        return (
          <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Connector line */}
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  'absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5',
                  step.state === 'done'     && 'bg-brand-ink',
                  step.state === 'rejected' && 'bg-danger',
                  (step.state === 'active' || step.state === 'pending') && 'bg-[var(--color-border-strong)]',
                )}
              />
            )}

            {/* Step marker */}
            <span
              className={cn(
                'relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full',
                step.state === 'done'     && 'bg-brand-ink text-white',
                step.state === 'active'   && 'border-2 border-brand bg-white text-brand-ink',
                step.state === 'pending'  && 'border border-[var(--color-border-strong)] bg-white',
                step.state === 'rejected' && 'bg-danger text-white',
              )}
            >
              <StepIcon state={step.state} />
            </span>

            {/* Step content */}
            <div className="pt-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  L{step.level} · {step.role}
                </span>
                {step.requiresSignature ? (
                  <PenLine className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" aria-label="Requires signature" />
                ) : (
                  <span className="text-[11px] text-[var(--color-text-tertiary)]">approve-only</span>
                )}
                {step.state === 'active' && (
                  <span className="rounded-pill bg-[var(--color-brand-surface)] px-2 py-0.5 text-[11px] font-medium text-brand-ink">
                    Giliran aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {step.pic ?? '—'}{step.date ? ` · ${step.date}` : ''}
              </p>
              {step.state === 'rejected' && step.reason && (
                <p className="mt-1 text-xs text-danger">{step.reason}</p>
              )}
            </div>
          </li>
        );
      })}

      {/* Generic "customer approval" placeholder for partner view */}
      {showGeneric && (
        <li className="relative flex gap-3 pb-0">
          <span className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--color-border-strong)] bg-white" />
          <div className="pt-0.5">
            <p className="text-sm text-[var(--color-text-secondary)] italic">
              Dalam proses approval customer…
            </p>
          </div>
        </li>
      )}
    </ol>
  );
}
