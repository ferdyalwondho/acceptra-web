import { useForm } from '@inertiajs/react';
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/layouts/AppShell';
import { ArrowLeft, Plus, Trash2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AvailableRole } from '@/types';

interface LevelRow {
  role: string;
  requires_signature: boolean;
}

interface FormData {
  name: string;
  sow_code: string;
  description: string;
  levels: LevelRow[];
}

interface Props {
  available_roles: AvailableRole[];
}

const inputCls = 'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40 transition-colors';
const errorCls = 'mt-1 text-xs text-danger';

const APPROVE_ONLY_ROLES = ['approver_ms_bo_team'];

export default function TemplateCreate({ available_roles }: Props) {
  const { t } = useTranslation();

  const form = useForm<FormData>({
    name:        '',
    sow_code:    '',
    description: '',
    levels:      [{ role: '', requires_signature: false }],
  });

  function addLevel() {
    if (form.data.levels.length >= 3) return;
    form.setData('levels', [...form.data.levels, { role: '', requires_signature: false }]);
  }

  function removeLevel(index: number) {
    if (form.data.levels.length <= 1) return;
    form.setData('levels', form.data.levels.filter((_, i) => i !== index));
  }

  function updateLevel(index: number, field: keyof LevelRow, value: string | boolean) {
    const updated = form.data.levels.map((l, i): LevelRow => {
      if (i !== index) return l;
      if (field === 'role') {
        const isApproveOnly = APPROVE_ONLY_ROLES.includes(value as string);
        return { role: value as string, requires_signature: isApproveOnly ? false : l.requires_signature };
      }
      return { role: l.role, requires_signature: value as boolean };
    });
    form.setData('levels', updated);
  }

  function levelError(index: number, field: string): string | undefined {
    return (form.errors as Record<string, string>)[`levels.${index}.${field}`];
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    form.post('/templates');
  }

  return (
    <AppShell>
      <Head title={t('template_form.create_page_title')} />

      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link href="/templates" className="flex items-center gap-1 hover:text-ming transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('template_form.breadcrumb_templates')}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{t('template_form.breadcrumb_create')}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('template_form.create_heading')}</h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          {t('template_form.create_subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-2xl space-y-5">
          {/* Informasi Template */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs p-6">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)]">{t('template_form.section_info')}</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                  {t('template_form.field_sow_name')} <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.data.name}
                  onChange={(e) => form.setData('name', e.target.value)}
                  placeholder={t('template_form.sow_name_placeholder')}
                  className={cn(inputCls, form.errors.name && 'border-danger')}
                />
                {form.errors.name && <p className={errorCls}>{form.errors.name}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                  {t('template_form.field_sow_code')}
                </label>
                <input
                  type="text"
                  value={form.data.sow_code}
                  onChange={(e) => form.setData('sow_code', e.target.value)}
                  placeholder={t('template_form.sow_code_placeholder')}
                  className={cn(inputCls, form.errors.sow_code && 'border-danger')}
                />
                {form.errors.sow_code && <p className={errorCls}>{form.errors.sow_code}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                  {t('template_form.field_description')}
                </label>
                <textarea
                  rows={2}
                  value={form.data.description}
                  onChange={(e) => form.setData('description', e.target.value)}
                  placeholder={t('template_form.description_placeholder')}
                  className="w-full resize-none rounded-sm border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Level Builder */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-[var(--color-text-primary)]">{t('template_form.section_levels')}</h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                  {t('template_form.level_count_info', { total: form.data.levels.length + 1, custom: form.data.levels.length })}
                </p>
              </div>
              {form.data.levels.length < 3 && (
                <button
                  type="button"
                  onClick={addLevel}
                  className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> {t('template_form.btn_add_level')}
                </button>
              )}
            </div>

            {form.errors.levels && (
              <p className="mb-3 text-xs text-danger">{form.errors.levels as unknown as string}</p>
            )}

            <div className="space-y-3">
              {/* L1 — fixed, non-editable */}
              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3 opacity-70">
                <Lock className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-text-tertiary)] text-xs font-bold text-white">
                  L1
                </span>
                <span className="flex-1 text-sm text-[var(--color-text-secondary)]">
                  {t('template_form.l1_auto_label')} <span className="ml-1 text-xs">{t('template_form.l1_auto_hint')}</span>
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{t('template_form.l1_approve_only')}</span>
              </div>

              {/* L2+ — user-defined */}
              {form.data.levels.map((level, i) => {
                const isApproveOnly = APPROVE_ONLY_ROLES.includes(level.role);
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3',
                      levelError(i, 'role')
                        ? 'border-danger bg-danger-surface/30'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-subtle)]',
                    )}
                  >
                    <span className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-ink text-xs font-bold text-white">
                      L{i + 2}
                    </span>

                    <div className="flex-1 space-y-2">
                      <select
                        value={level.role}
                        onChange={(e) => updateLevel(i, 'role', e.target.value)}
                        className={cn(
                          'h-9 w-full rounded-sm border bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40',
                          levelError(i, 'role')
                            ? 'border-danger'
                            : 'border-[var(--color-border-strong)]',
                        )}
                      >
                        <option value="">{t('template_form.select_role_placeholder')}</option>
                        {available_roles.map((r) => (
                          <option key={r.code} value={r.code}>{r.label}</option>
                        ))}
                      </select>
                      {levelError(i, 'role') && (
                        <p className={errorCls}>{levelError(i, 'role')}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className={cn('text-xs', isApproveOnly ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-secondary)]')}>
                          {isApproveOnly
                            ? t('template_form.approve_only_label')
                            : t('template_form.requires_signature_label')}
                        </span>
                        <button
                          type="button"
                          disabled={isApproveOnly}
                          onClick={() => updateLevel(i, 'requires_signature', !level.requires_signature)}
                          role="switch"
                          aria-checked={level.requires_signature}
                          className={cn(
                            'relative h-5 w-9 rounded-full transition-colors',
                            isApproveOnly
                              ? 'cursor-not-allowed bg-[var(--color-border-strong)] opacity-40'
                              : level.requires_signature
                                ? 'bg-brand-ink'
                                : 'bg-[var(--color-border-strong)]',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                              level.requires_signature ? 'left-0.5 translate-x-4' : 'left-0.5',
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLevel(i)}
                      disabled={form.data.levels.length <= 1}
                      className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-danger-surface hover:text-danger transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg bg-[var(--color-bg-subtle)] p-3 text-xs text-[var(--color-text-secondary)]">
              💡 {t('template_form.tip_roles_only')}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <Link
              href="/templates"
              className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-5 text-sm font-medium hover:bg-muted transition-colors"
            >
              {t('template_form.btn_cancel')}
            </Link>
            <button
              type="submit"
              disabled={form.processing}
              className="h-9 rounded-md bg-brand-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
            >
              {form.processing ? t('template_form.btn_saving') : t('template_form.btn_save_create')}
            </button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
