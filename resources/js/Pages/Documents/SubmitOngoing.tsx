import { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import { useDuplicateCheck } from '@/hooks/use-duplicate-check';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Check,
  FileText,
  Info,
  Lock,
  Upload,
  X,
} from 'lucide-react';
import type {
  ClusterOption,
  OfflineLevel,
  PageProps,
  PartnerOption,
  TemplateOption,
  TemplateLevelOption,
} from '@/types';

interface Props extends PageProps {
  templates: TemplateOption[];
  clusters: ClusterOption[];
  partners: PartnerOption[];
  defaults: { vendor_contractor: string };
}

const inputCls =
  'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[120ms] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40';

const errorCls = 'mt-1 text-xs text-danger';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin Aviat',
  approver_ms_bo: 'Approver MS BO',
  approver_ms_bo_team: 'Approver MS BO Team',
  approver_ms_rts: 'Approver MS RTS',
  approver_xls_rth_team: 'Approver XLS RTH Team',
  approver_xls_rth: 'Approver XLS RTH',
  approver_sme: 'Approver SME',
};

// Synthetic L1 entry — always prepended, not returned by /api/templates/{id}/levels
const L1_SYNTHETIC: TemplateLevelOption = {
  level_order: 1,
  role: 'admin',
  role_label: 'Admin Aviat',
  requires_signature: false,
};

function Section({
  step,
  title,
  done,
  children,
}: {
  step: number;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-4">
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
            done
              ? 'bg-brand-ink text-white'
              : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
          )}
        >
          {done ? <Check className="h-3.5 w-3.5" /> : step}
        </span>
        <h2 className="font-semibold text-[var(--color-text-primary)]">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}

export default function DocumentSubmitOngoing({ templates, clusters, partners, defaults }: Props) {
  const [templateLevels, setTemplateLevels] = useState<TemplateLevelOption[]>([]);
  const [approvers, setApprovers]           = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [loadingLevels, setLoadingLevels]   = useState(false);

  const form = useForm<{
    unique_id: string;
    vendor_contractor: string;
    pt_index: string;
    project_code: string;
    link_id: string;
    link_name: string;
    cluster_zone: string;
    template_id: string;
    partner_id: string;
    pdf_file: File | null;
    levels: OfflineLevel[];
  }>({
    unique_id: '',
    vendor_contractor: defaults.vendor_contractor,
    pt_index: '',
    project_code: '',
    link_id: '',
    link_name: '',
    cluster_zone: '',
    template_id: '',
    partner_id: '',
    pdf_file: null,
    levels: [],
  });

  // Fetch template levels when template_id changes
  useEffect(() => {
    if (!form.data.template_id) {
      setTemplateLevels([]);
      setApprovers({});
      form.setData('levels', []);
      return;
    }

    setLoadingLevels(true);
    axios
      .get<{ data: TemplateLevelOption[] }>(`/api/templates/${form.data.template_id}/levels`)
      .then(({ data }) => {
        // Prepend synthetic L1 (API returns L2+)
        const allLevels = [L1_SYNTHETIC, ...data.data];
        setTemplateLevels(allLevels);

        // Init levels form data — all default to offline
        form.setData(
          'levels',
          allLevels.map((l) => ({
            level_order:    l.level_order,
            is_offline:     true,
            approver_name:  '',
            offline_date:   '',
            evidence_file:  null,
            approver_id:    '',
          })),
        );

        // Prefetch approvers for non-L1 roles (for pending dropdowns)
        const roleSet = new Set(data.data.map((l) => l.role));
        roleSet.forEach((role) => {
          axios
            .get<{ data: Array<{ id: string; name: string; role: string }> }>(
              `/api/users?role=${role}`,
            )
            .then(({ data: ud }) => {
              setApprovers((prev) => ({ ...prev, [role]: ud.data }));
            })
            .catch(() => {});
        });
      })
      .catch(() => setTemplateLevels([]))
      .finally(() => setLoadingLevels(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.data.template_id]);

  // Update a single field on a level
  function updateLevel(idx: number, patch: Partial<OfflineLevel>) {
    const updated = form.data.levels.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    form.setData('levels', updated);
  }

  // Toggle offline/pending, enforcing no-gap rule with cascade
  function toggleLevel(idx: number, makeOffline: boolean) {
    if (idx === 0) return; // L1 is always offline — immutable
    const updated = form.data.levels.map((l, i) => {
      if (i === idx) return { ...l, is_offline: makeOffline };
      // cascade: making a level pending forces all levels below to pending
      if (!makeOffline && i > idx) return { ...l, is_offline: false };
      // cascade: making a level offline forces all levels above to offline
      if (makeOffline && i < idx) return { ...l, is_offline: true };
      return l;
    });
    form.setData('levels', updated);
  }

  const uniqueIdDup = useDuplicateCheck('unique_id', form.data.unique_id);
  const ptIndexDup  = useDuplicateCheck('pt_index', form.data.pt_index);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    form.post('/documents/submit-ongoing', { forceFormData: true });
  }

  // Helper to get a nested level error from form.errors
  function levelError(idx: number, field: string): string | undefined {
    return (form.errors as Record<string, string>)[`levels.${idx}.${field}`];
  }

  const metaDone =
    !!form.data.unique_id &&
    !!form.data.partner_id &&
    !!form.data.pt_index &&
    !!form.data.vendor_contractor &&
    !!form.data.cluster_zone;

  const templateDone = !!form.data.template_id && templateLevels.length > 0;

  const levelsDone =
    templateDone &&
    form.data.levels.every((l) => {
      if (l.is_offline) return !!l.approver_name && !!l.offline_date;
      return !!l.approver_id;
    });

  const pdfDone = !!form.data.pdf_file;

  return (
    <AppShell>
      <Head title="Submit Dokumen Berjalan — Acceptra" />

      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link
          href="/documents"
          className="flex items-center gap-1 transition-colors hover:text-ming"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Dokumen
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">Submit Dokumen Berjalan</span>
      </div>

      <PageHeader
        title="Submit Dokumen Berjalan"
        description="Untuk dokumen yang sudah punya approval sebagian secara offline."
      />

      {/* Info notice */}
      <div className="mb-5 flex max-w-3xl items-start gap-3 rounded-lg border border-info/20 bg-info-surface p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p className="text-sm text-info">
          Fitur ini digunakan untuk mendaftarkan dokumen yang sudah ditandatangani sebagian secara offline.
          Sistem melanjutkan alur digital hanya pada level yang belum ditandatangani.{' '}
          <strong className="font-semibold">Tanda tangan offline tidak akan ditimpa.</strong>
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        className="max-w-3xl space-y-5"
      >
        {/* ─── 1. Metadata ─── */}
        <Section step={1} title="Metadata Dokumen" done={metaDone}>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Unique ID */}
            <div className="sm:col-span-2">
              <Field
                label="Unique ID"
                required
                error={form.errors.unique_id ?? (uniqueIdDup.duplicate ? 'Unique ID ini sudah digunakan — silakan pilih yang lain.' : undefined)}
              >
                <input
                  type="text"
                  value={form.data.unique_id}
                  maxLength={50}
                  onChange={(e) => form.setData('unique_id', e.target.value.toUpperCase())}
                  placeholder="Contoh: ACC-2026-0001"
                  className={cn(inputCls, uniqueIdDup.duplicate && 'border-danger')}
                />
                {uniqueIdDup.checking && <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Memeriksa…</p>}
              </Field>
            </div>

            {/* Partner */}
            <div className="sm:col-span-2">
              <Field label="Partner / Subkontraktor" required error={form.errors.partner_id}>
                <select
                  value={form.data.partner_id}
                  onChange={(e) => form.setData('partner_id', e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Pilih partner --</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Vendor */}
            <div className="sm:col-span-2">
              <Field label="Vendor / Contractor" required error={form.errors.vendor_contractor}>
                <input
                  type="text"
                  value={form.data.vendor_contractor}
                  onChange={(e) => form.setData('vendor_contractor', e.target.value.toUpperCase())}
                  className={inputCls}
                />
              </Field>
            </div>

            {/* PT Index */}
            <div className="sm:col-span-2">
              <Field
                label="PT Index"
                required
                error={form.errors.pt_index ?? (ptIndexDup.duplicate ? 'PT Index ini sudah digunakan — silakan pilih yang lain.' : undefined)}
              >
                <input
                  type="text"
                  value={form.data.pt_index}
                  onChange={(e) => form.setData('pt_index', e.target.value.toUpperCase())}
                  placeholder="Contoh: PTI-2026-001"
                  className={cn(inputCls, ptIndexDup.duplicate && 'border-danger')}
                />
                {ptIndexDup.checking && <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Memeriksa…</p>}
              </Field>
            </div>

            {/* Project Code */}
            <Field label="Project Code" required error={form.errors.project_code}>
              <input
                type="text"
                value={form.data.project_code}
                onChange={(e) => form.setData('project_code', e.target.value.toUpperCase())}
                placeholder="MW-BKS-2406"
                className={inputCls}
              />
            </Field>

            {/* Link ID */}
            <Field label="Link ID" required error={form.errors.link_id}>
              <input
                type="text"
                value={form.data.link_id}
                onChange={(e) => form.setData('link_id', e.target.value.toUpperCase())}
                className={inputCls}
              />
            </Field>

            {/* Link Name */}
            <div className="sm:col-span-2">
              <Field label="Link Name" required error={form.errors.link_name}>
                <input
                  type="text"
                  value={form.data.link_name}
                  onChange={(e) => form.setData('link_name', e.target.value.toUpperCase())}
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Cluster Zone */}
            <div className="sm:col-span-2">
              <Field label="Cluster Zone" required error={form.errors.cluster_zone}>
                <select
                  value={form.data.cluster_zone}
                  onChange={(e) => form.setData('cluster_zone', e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Pilih cluster --</option>
                  {clusters.map((c) => (
                    <option key={c.id} value={c.display_name}>{c.display_name}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </Section>

        {/* ─── 2. Template / SOW ─── */}
        <Section step={2} title="Template / SOW" done={templateDone}>
          <Field label="SOW Template" required error={form.errors.template_id}>
            <select
              value={form.data.template_id}
              onChange={(e) => form.setData('template_id', e.target.value)}
              className={inputCls}
              disabled={loadingLevels}
            >
              <option value="">-- Pilih template --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.sow_code ? ` (${t.sow_code})` : ''}
                </option>
              ))}
            </select>
          </Field>
          {loadingLevels && (
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Memuat level approval…</p>
          )}
        </Section>

        {/* ─── 3. Status per Level ─── */}
        {templateLevels.length > 0 && (
          <Section step={3} title="Status per Level Approval" done={levelsDone}>
            <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
              Tandai level yang sudah approved offline dari atas ke bawah. Level pending harus
              berurutan dari bawah. L1 selalu dianggap offline.
            </p>

            {/* Global level error */}
            {(form.errors as Record<string, string>)['levels'] && (
              <p className="mb-3 text-xs text-danger">
                {(form.errors as Record<string, string>)['levels']}
              </p>
            )}

            <div className="space-y-3">
              {form.data.levels.map((level, idx) => {
                const tplLevel   = templateLevels.find((l) => l.level_order === level.level_order);
                const roleLabel  = tplLevel?.role_label ?? ROLE_LABELS[tplLevel?.role ?? ''] ?? `L${level.level_order}`;
                const isL1       = level.level_order === 1;
                const isOffline  = level.is_offline;
                const levelApprovers = approvers[tplLevel?.role ?? ''] ?? [];

                return (
                  <div
                    key={level.level_order}
                    className={cn(
                      'rounded-lg border p-4 transition-colors',
                      isOffline
                        ? 'border-brand/30 bg-brand-surface/40'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-subtle)]',
                    )}
                  >
                    {/* Level header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                            isOffline
                              ? 'bg-brand-ink text-white'
                              : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]',
                          )}
                        >
                          {isOffline ? <Check className="h-3 w-3" /> : level.level_order}
                        </span>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          L{level.level_order} — {roleLabel}
                        </span>
                      </div>

                      {/* Toggle buttons — L1 is locked */}
                      {isL1 ? (
                        <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                          <Lock className="h-3 w-3" /> Approved (offline)
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          {(['offline', 'pending'] as const).map((s) => {
                            const active = s === 'offline' ? isOffline : !isOffline;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => toggleLevel(idx, s === 'offline')}
                                className={cn(
                                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                                  active
                                    ? s === 'offline'
                                      ? 'bg-brand-ink text-white'
                                      : 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] ring-1 ring-[var(--color-border-strong)]'
                                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]',
                                )}
                              >
                                {s === 'offline' ? 'Approved (offline)' : 'Pending (digital)'}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Offline fields */}
                    {isOffline && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <Field
                          label="Nama Approver"
                          required
                          error={levelError(idx, 'approver_name')}
                        >
                          <input
                            type="text"
                            value={level.approver_name}
                            onChange={(e) => updateLevel(idx, { approver_name: e.target.value.toUpperCase() })}
                            placeholder="Nama lengkap"
                            className={cn(inputCls, 'text-xs')}
                          />
                        </Field>

                        <Field
                          label="Tanggal Approve"
                          required
                          error={levelError(idx, 'offline_date')}
                        >
                          <input
                            type="date"
                            value={level.offline_date}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => updateLevel(idx, { offline_date: e.target.value })}
                            className={cn(inputCls, 'text-xs')}
                          />
                        </Field>

                        <Field label="Bukti (attachment)" error={levelError(idx, 'evidence_file')}>
                          {level.evidence_file ? (
                            <div className="flex h-9 items-center gap-2 rounded-sm border border-[var(--color-border-strong)] bg-white px-3">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-danger" />
                              <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-primary)]">
                                {level.evidence_file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateLevel(idx, { evidence_file: null })}
                                className="shrink-0 text-[var(--color-text-secondary)] hover:text-danger"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-dashed border-[var(--color-border-strong)] px-3 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-brand hover:text-brand-ink">
                              <Upload className="h-3.5 w-3.5 shrink-0" />
                              <span>Upload bukti…</span>
                              <input
                                type="file"
                                accept="application/pdf,image/jpeg,image/png"
                                className="sr-only"
                                onChange={(e) => {
                                  const f = e.target.files?.[0] ?? null;
                                  updateLevel(idx, { evidence_file: f });
                                }}
                              />
                            </label>
                          )}
                        </Field>
                      </div>
                    )}

                    {/* Pending fields */}
                    {!isOffline && (
                      <div className="mt-4">
                        <Field
                          label="Approver (Pending Digital)"
                          required
                          error={levelError(idx, 'approver_id')}
                        >
                          <select
                            value={level.approver_id}
                            onChange={(e) => updateLevel(idx, { approver_id: e.target.value })}
                            className={inputCls}
                          >
                            <option value="">-- Pilih approver --</option>
                            {levelApprovers.map((u) => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ─── 4. Upload PDF ─── */}
        <Section step={4} title="Upload PDF (Partial-Signed)" done={pdfDone}>
          <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">
            PDF <span className="text-danger">*</span>
          </p>
          <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
            Upload PDF yang sudah punya tanda tangan offline. Kotak TTD digital yang masih kosong
            akan diisi sistem saat approver pending menyetujui.
          </p>

          {form.data.pdf_file ? (
            <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4">
              <FileText className="h-8 w-8 shrink-0 text-danger" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                  {form.data.pdf_file.name}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {(form.data.pdf_file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => form.setData('pdf_file', null)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-danger"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border-strong)] py-10 text-center transition-colors duration-[120ms] hover:border-brand hover:bg-brand-surface/20">
              <Upload className="mb-2 h-8 w-8 text-[var(--color-text-tertiary)]" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Upload PDF partial-signed
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">PDF · maks 20 MB</p>
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f?.type === 'application/pdf') form.setData('pdf_file', f);
                }}
              />
            </label>
          )}
          {form.errors.pdf_file && <p className={errorCls}>{form.errors.pdf_file}</p>}
        </Section>

        {/* ─── Actions ─── */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link
            href="/documents"
            className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={
              form.processing
              || !pdfDone
              || uniqueIdDup.duplicate || uniqueIdDup.checking
              || ptIndexDup.duplicate || ptIndexDup.checking
            }
            className="h-9 rounded-md bg-brand-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {form.processing ? 'Menyimpan…' : 'Submit Dokumen'}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
