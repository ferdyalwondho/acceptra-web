import { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowLeft, Check, FileSpreadsheet, FileText, Info, X } from 'lucide-react';
import type { PageProps, PartnerOption, TemplateOption, TemplateLevelOption, ClusterOption } from '@/types';

interface ResolvedApprover {
  level_order: number;
  role: string;
  role_label: string;
  approver: { id: string; name: string } | null;
}

interface Props extends PageProps {
  templates: TemplateOption[];
  clusters: ClusterOption[];
  partner?: { id: string; name: string };
  partners?: PartnerOption[];
  defaults: { vendor_contractor: string };
  is_admin_submit: boolean;
}

const inputCls =
  'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[120ms] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40';

const errorCls = 'mt-1 text-xs text-danger';

function Section({
  step, title, done, children,
}: {
  step: number; title: string; done?: boolean; children: React.ReactNode;
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
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
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

export default function DocumentCreate({ templates, clusters, partner, partners, defaults, is_admin_submit }: Props) {
  const { t } = useTranslation();
  const [levels, setLevels]       = useState<TemplateLevelOption[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [resolvedApprovers, setResolvedApprovers] = useState<ResolvedApprover[]>([]);
  const [resolving, setResolving] = useState(false);

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
    excel_file: File | null;
    _draft: boolean;
  }>({
    unique_id: '',
    vendor_contractor: defaults.vendor_contractor,
    pt_index: '',
    project_code: '',
    link_id: '',
    link_name: '',
    cluster_zone: '',
    template_id: '',
    partner_id: partner?.id ?? '',
    pdf_file: null,
    excel_file: null,
    _draft: false,
  });

  // Fetch template levels when template changes
  useEffect(() => {
    if (!form.data.template_id) {
      setLevels([]);
      return;
    }

    setLoadingLevels(true);
    axios
      .get<{ data: TemplateLevelOption[] }>(`/api/templates/${form.data.template_id}/levels`)
      .then(({ data }) => setLevels(data.data))
      .catch(() => setLevels([]))
      .finally(() => setLoadingLevels(false));
  }, [form.data.template_id]);

  // Once both a template and a cluster are picked, resolve L2-L4 approvers from the
  // cluster mapping (read-only preview — admin no longer picks PICs manually).
  useEffect(() => {
    if (!is_admin_submit || !form.data.template_id || !form.data.cluster_zone) {
      setResolvedApprovers([]);
      return;
    }

    setResolving(true);
    axios
      .get<{ data: ResolvedApprover[] }>('/api/clusters/resolve', {
        params: { cluster: form.data.cluster_zone, template_id: form.data.template_id },
      })
      .then(({ data }) => setResolvedApprovers(data.data))
      .catch(() => setResolvedApprovers([]))
      .finally(() => setResolving(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.data.template_id, form.data.cluster_zone, is_admin_submit]);

  function handleTemplateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    form.setData('template_id', e.target.value);
  }

  function handlePdfChange(file: File | null) {
    form.setData('pdf_file', file);
  }

  function handleExcelChange(file: File | null) {
    form.setData('excel_file', file);
  }

  function submit(draft: boolean) {
    form.transform((data) => ({ ...data, _draft: draft }));
    form.post('/documents', { forceFormData: true });
  }

  const allPicsFilled = resolvedApprovers.length > 0 && resolvedApprovers.every((r) => r.approver);
  const pdfReady      = !!form.data.pdf_file;

  return (
    <AppShell>
      <Head title={t('documents_create.page_title')} />

      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link href="/documents" className="flex items-center gap-1 transition-colors hover:text-ming">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('documents_create.breadcrumb_back')}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{t('documents_create.breadcrumb_current')}</span>
      </div>

      <PageHeader title={t('documents_create.heading')} description={t('documents_create.description')} />

      {is_admin_submit && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-brand/20 bg-brand-surface/40 p-4 text-sm text-brand-ink">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: t('documents_create.admin_notice') }} />
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); submit(false); }}
        encType="multipart/form-data"
        className="max-w-3xl space-y-5"
      >
        {/* ─── 1. Metadata ─── */}
        <Section step={1} title={t('documents_create.section_metadata')}>
          <div className="grid gap-4 sm:grid-cols-2">
            {is_admin_submit && (
              <div className="sm:col-span-2">
                <Field label={t('documents_create.field_partner')} required error={form.errors.partner_id}>
                  <select
                    value={form.data.partner_id}
                    onChange={(e) => form.setData('partner_id', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">{t('documents_create.placeholder_partner')}</option>
                    {(partners ?? []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            <div className="sm:col-span-2">
              <Field label={t('documents_create.field_unique_id')} required error={form.errors.unique_id}>
                <input
                  type="text"
                  placeholder={t('documents_create.placeholder_unique_id')}
                  value={form.data.unique_id}
                  onChange={(e) => form.setData('unique_id', e.target.value.toUpperCase())}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label={t('documents_create.field_vendor')} required error={form.errors.vendor_contractor}>
                <input
                  type="text"
                  value={form.data.vendor_contractor}
                  onChange={(e) => form.setData('vendor_contractor', e.target.value.toUpperCase())}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label={t('documents_create.field_pt_index')} required error={form.errors.pt_index}>
                <input
                  type="text"
                  placeholder={t('documents_create.placeholder_pt_index')}
                  value={form.data.pt_index}
                  onChange={(e) => form.setData('pt_index', e.target.value.toUpperCase())}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label={t('documents_create.field_project_code')} error={form.errors.project_code}>
              <input
                type="text"
                placeholder="MW-BKS-2406"
                value={form.data.project_code}
                onChange={(e) => form.setData('project_code', e.target.value.toUpperCase())}
                className={inputCls}
              />
            </Field>
            <Field label={t('documents_create.field_link_id')} error={form.errors.link_id}>
              <input
                type="text"
                placeholder="LNK-001"
                value={form.data.link_id}
                onChange={(e) => form.setData('link_id', e.target.value.toUpperCase())}
                className={inputCls}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('documents_create.field_link_name')} error={form.errors.link_name}>
                <input
                  type="text"
                  placeholder="Microwave Link – Bekasi Sektor 4"
                  value={form.data.link_name}
                  onChange={(e) => form.setData('link_name', e.target.value.toUpperCase())}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label={t('documents_create.field_cluster_zone')} required error={form.errors.cluster_zone}>
                <select
                  value={form.data.cluster_zone}
                  onChange={(e) => form.setData('cluster_zone', e.target.value)}
                  className={inputCls}
                >
                  <option value="">{t('documents_create.placeholder_cluster_zone')}</option>
                  {clusters.map((c) => (
                    <option key={c.id} value={c.display_name}>{c.display_name}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </Section>

        {/* ─── 2. SOW Template ─── */}
        <Section step={2} title={t('documents_create.section_sow')} done={!!form.data.template_id}>
          <Field label={t('documents_create.field_template')} required error={form.errors.template_id}>
            <select
              value={form.data.template_id}
              onChange={handleTemplateChange}
              className={inputCls}
              disabled={loadingLevels}
            >
              <option value="">{t('documents_create.placeholder_template')}</option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}{tmpl.sow_code ? ` (${tmpl.sow_code})` : ''}
                </option>
              ))}
            </select>
          </Field>

          {levels.length > 0 && (
            <div className="mt-4 rounded-lg border border-brand/20 bg-brand-surface/40 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-ink">
                {t('documents_create.approval_structure')}
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-text-secondary)] text-[10px] font-bold text-white">1</span>
                  <span className="text-[var(--color-text-secondary)]">{t('documents_create.l1_auto_label')}</span>
                </div>
                {levels.map((l) => (
                  <div key={l.level_order} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-ink text-[10px] font-bold text-white">
                      {l.level_order}
                    </span>
                    <span className="text-[var(--color-text-primary)]">
                      L{l.level_order} — {l.role_label}
                      {!l.requires_signature && (
                        <span className="ml-2 text-[10px] text-[var(--color-text-tertiary)]">
                          {t('documents_create.approve_only_hint')}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ─── 3. Approver Preview (read-only — resolved automatically from cluster) ─── */}
        {/* Routing (L2-L4 PIC selection) is Admin-only: for Partner submissions, an Admin
            approves L1 first and PICs are auto-resolved from the cluster at that point
            (see Show.tsx's RoutingPanel). */}
        {is_admin_submit && levels.length > 0 && (
          <Section step={3} title={t('documents_create.section_resolved_approvers')} done={allPicsFilled}>
            {!form.data.cluster_zone ? (
              <p className="text-sm text-[var(--color-text-secondary)]">{t('documents_create.select_cluster_first')}</p>
            ) : resolving ? (
              <p className="text-sm text-[var(--color-text-secondary)]">{t('documents_create.resolving_approvers')}</p>
            ) : (
              <div className="space-y-2">
                {resolvedApprovers.map((r) => (
                  <div key={r.level_order} className="flex items-center gap-3 text-sm">
                    <span className="w-44 shrink-0 font-medium text-[var(--color-text-secondary)]">
                      L{r.level_order} — {r.role_label}
                    </span>
                    {r.approver ? (
                      <span className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                        <Check className="h-4 w-4 text-brand-ink" /> {r.approver.name}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-danger">
                        <AlertTriangle className="h-4 w-4" /> {t('documents_create.resolved_approver_missing')}
                      </span>
                    )}
                  </div>
                ))}
                {!allPicsFilled && resolvedApprovers.length > 0 && (
                  <p className="mt-2 text-xs text-danger">{t('documents_create.resolved_approver_missing_hint')}</p>
                )}
              </div>
            )}
          </Section>
        )}

        {/* ─── 4. Upload File ─── */}
        <Section step={4} title={t('documents_create.section_upload')} done={pdfReady}>
          <div className="space-y-4">
            {/* PDF — required */}
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">
                {t('documents_create.pdf_label')} <span className="text-danger">*</span>
                <span className="ml-1 text-[var(--color-text-tertiary)]">{t('documents_create.pdf_hint')}</span>
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
                    onClick={() => handlePdfChange(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-bg-subtle)]"
                  >
                    <X className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  </button>
                </div>
              ) : (
                <DropZone
                  accept="application/pdf"
                  dragText={t('documents_create.dropzone_drag')}
                  browseText={t('documents_create.dropzone_browse')}
                  hint="PDF · max 20 MB"
                  onFile={handlePdfChange}
                />
              )}
              {form.errors.pdf_file && <p className={errorCls}>{form.errors.pdf_file}</p>}
            </div>

            {/* Excel — optional */}
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">
                {t('documents_create.excel_label')}
                <span className="ml-1 text-[var(--color-text-tertiary)]">{t('documents_create.excel_hint')}</span>
              </p>
              {form.data.excel_file ? (
                <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4">
                  <FileSpreadsheet className="h-8 w-8 shrink-0 text-brand-ink" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                      {form.data.excel_file.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {(form.data.excel_file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExcelChange(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-bg-subtle)]"
                  >
                    <X className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  </button>
                </div>
              ) : (
                <DropZone
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  dragText={t('documents_create.dropzone_drag')}
                  browseText={t('documents_create.dropzone_browse')}
                  hint=".xlsx / .xls · max 10 MB"
                  onFile={handleExcelChange}
                />
              )}
              {form.errors.excel_file && <p className={errorCls}>{form.errors.excel_file}</p>}
            </div>
          </div>
        </Section>

        {/* ─── 5. Posisi TTD ─── */}
        <Section step={5} title={t('documents_create.section_signature')}>
          <div className="flex items-start gap-3 rounded-lg bg-info-surface p-4 text-sm text-info">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-info text-[10px] font-bold text-white">
              i
            </div>
            <div>
              <p className="font-medium">{t('documents_create.signature_info_title')}</p>
              <p className="mt-0.5 text-xs opacity-80">
                {t(is_admin_submit ? 'documents_create.signature_info_body' : 'documents_create.signature_info_body_partner')}
              </p>
            </div>
          </div>
        </Section>

        {/* ─── Actions ─── */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link
            href="/documents"
            className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            {t('documents_create.btn_cancel')}
          </Link>
          <button
            type="button"
            disabled={form.processing}
            onClick={() => submit(true)}
            className="h-9 rounded-md border border-[var(--color-border-strong)] bg-white px-5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
          >
            {t('documents_create.btn_save_draft')}
          </button>
          <button
            type="submit"
            disabled={form.processing || (is_admin_submit && levels.length > 0 && !allPicsFilled)}
            className="h-9 rounded-md bg-brand-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50"
          >
            {form.processing ? t('documents_create.btn_processing') : t('documents_create.btn_submit')}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

// ── DropZone ──────────────────────────────────────────────────────────────────

function DropZone({
  accept,
  dragText,
  browseText,
  hint,
  onFile,
}: {
  accept: string;
  dragText: string;
  browseText: string;
  hint: string;
  onFile: (file: File | null) => void;
}) {
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 text-center transition-colors duration-[120ms]',
        dragging
          ? 'border-brand bg-brand-surface/50'
          : 'border-[var(--color-border-strong)] hover:border-brand hover:bg-brand-surface/20',
      )}
    >
      <p className="text-sm font-medium text-[var(--color-text-primary)]">{dragText}</p>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
        atau <span className="text-ming">{browseText}</span> · {hint}
      </p>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
