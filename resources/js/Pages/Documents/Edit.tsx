import { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import { cn } from '@/lib/utils';
import { ArrowLeft, Check, FileSpreadsheet, FileText, Info, X } from 'lucide-react';
import type { PageProps, PartnerOption, TemplateOption, TemplateLevelOption } from '@/types';

interface DraftDoc {
  id: string;
  unique_id: string;
  status_code: string;
  vendor_contractor: string;
  pt_index: string;
  project_code: string;
  link_id: string;
  link_name: string;
  tower_id_ne: string;
  site_name_ne: string;
  tower_id_fe: string;
  site_name_fe: string;
  template_id: string;
  has_pdf: boolean;
  partner_id: string;
  partner: { id: string; name: string } | null;
  pics: Record<string, string>;
}

interface Props extends PageProps {
  document: DraftDoc;
  templates: TemplateOption[];
  partners?: PartnerOption[];
  is_admin_submit: boolean;
  is_punchlist_revision?: boolean;
  is_rejected_revision?: boolean;
  atp_punchlist?: string | null;
  last_revision_filename?: string | null;
}

const inputCls =
  'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[120ms] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40';

const lockedInputCls =
  'h-9 w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 text-sm text-[var(--color-text-secondary)] disabled:cursor-not-allowed';

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

export default function DocumentEdit({
  document: doc,
  templates,
  partners,
  is_admin_submit,
  is_punchlist_revision = false,
  is_rejected_revision = false,
  atp_punchlist,
  last_revision_filename,
}: Props) {
  const [levels, setLevels]       = useState<TemplateLevelOption[]>([]);
  const [approvers, setApprovers] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [loadingLevels, setLoadingLevels] = useState(false);

  const form = useForm<{
    vendor_contractor: string;
    pt_index: string;
    project_code: string;
    link_id: string;
    link_name: string;
    tower_id_ne: string;
    site_name_ne: string;
    tower_id_fe: string;
    site_name_fe: string;
    template_id: string;
    partner_id: string;
    pics: Record<string, string>;
    pdf_file: File | null;
    excel_file: File | null;
    _draft: boolean;
  }>({
    vendor_contractor: doc.vendor_contractor,
    pt_index:          doc.pt_index,
    project_code:      doc.project_code,
    link_id:           doc.link_id,
    link_name:         doc.link_name,
    tower_id_ne:       doc.tower_id_ne,
    site_name_ne:      doc.site_name_ne,
    tower_id_fe:       doc.tower_id_fe,
    site_name_fe:      doc.site_name_fe,
    template_id:       doc.template_id,
    partner_id:        doc.partner_id,
    pics:              doc.pics ?? {},
    pdf_file:          null,
    excel_file:        null,
    _draft:            false,
  });

  // Fetch template levels whenever template changes
  useEffect(() => {
    if (!form.data.template_id) {
      setLevels([]);
      setApprovers({});
      return;
    }

    setLoadingLevels(true);
    axios
      .get<{ data: TemplateLevelOption[] }>(`/api/templates/${form.data.template_id}/levels`)
      .then(({ data }) => {
        setLevels(data.data);
        // Only reset pics if template actually changed from the draft's template
        if (form.data.template_id !== doc.template_id) {
          form.setData('pics', {});
        }
        const roleSet = new Set(data.data.map((l) => l.role));
        roleSet.forEach((role) => {
          axios
            .get<{ data: Array<{ id: string; name: string; role: string }> }>(`/api/users?role=${role}`)
            .then(({ data: ud }) => {
              setApprovers((prev) => ({ ...prev, [role]: ud.data }));
            })
            .catch(() => {});
        });
      })
      .catch(() => setLevels([]))
      .finally(() => setLoadingLevels(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.data.template_id]);

  function handleTemplateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    form.setData('template_id', e.target.value);
  }

  function handlePicChange(levelOrder: number, userId: string) {
    form.setData('pics', { ...form.data.pics, [String(levelOrder)]: userId });
  }

  function submit(draft: boolean) {
    form.transform((data) => ({ ...data, _draft: draft }));
    form.post(`/documents/${doc.id}/revise`, { forceFormData: true });
  }

  const allPicsFilled  = levels.length > 0 && levels.every((l) => form.data.pics[String(l.level_order)]);
  const pdfReady       = doc.has_pdf || !!form.data.pdf_file;
  const isDraftEditing = !is_rejected_revision && !is_punchlist_revision;

  // ── Punchlist Revision Upload Mode ───────────────────────────────────────────
  if (is_punchlist_revision) {
    return (
      <AppShell>
        <Head title={`Upload Revisi Punchlist — ${doc.unique_id}`} />

        <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <Link href={`/documents/${doc.id}`} className="flex items-center gap-1 transition-colors hover:text-ming">
            <ArrowLeft className="h-3.5 w-3.5" /> {doc.unique_id}
          </Link>
          <span>/</span>
          <span className="text-[var(--color-text-primary)]">Upload Revisi Punchlist</span>
        </div>

        <PageHeader
          title={`Upload PDF Revisi Punchlist — ${doc.unique_id}`}
          description="Upload PDF yang sudah direvisi sesuai catatan punchlist dari approver."
        />

        {atp_punchlist && (
          <div className="mb-4 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="mb-1 font-semibold text-amber-800">Catatan Punchlist dari Approver</p>
            <p className="whitespace-pre-wrap text-amber-700">{atp_punchlist}</p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.post(`/documents/${doc.id}/punchlist-revision`, { forceFormData: true });
          }}
          encType="multipart/form-data"
          className="max-w-3xl space-y-5"
        >
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-xs font-bold text-[var(--color-text-secondary)]">
                1
              </span>
              <h2 className="font-semibold text-[var(--color-text-primary)]">Upload PDF Revisi</h2>
            </div>
            <div className="p-6 space-y-4">
              {last_revision_filename && (
                <div className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-2.5">
                  <FileText className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--color-text-secondary)]">File PDF sebelumnya</p>
                    <p className="truncate text-sm text-[var(--color-text-primary)]">{last_revision_filename}</p>
                  </div>
                </div>
              )}

              {form.data.pdf_file ? (
                <div className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-2.5">
                  <FileText className="h-5 w-5 shrink-0 text-brand-ink" />
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
                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-bg-subtle)]"
                  >
                    <X className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  </button>
                </div>
              ) : (
                <DropZone
                  accept=".pdf,application/pdf"
                  hint=".pdf · maks 20 MB"
                  onFile={(f) => form.setData('pdf_file', f)}
                />
              )}
              {form.errors.pdf_file && <p className={errorCls}>{form.errors.pdf_file}</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pb-8">
            <Link
              href={`/documents/${doc.id}`}
              className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={form.processing || !form.data.pdf_file}
              className="h-9 rounded-md bg-brand-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50"
            >
              {form.processing ? 'Mengupload…' : 'Submit Punchlist Revision'}
            </button>
          </div>
        </form>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Head title={`Edit Draft — ${doc.unique_id}`} />

      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link href={`/documents/${doc.id}`} className="flex items-center gap-1 transition-colors hover:text-ming">
          <ArrowLeft className="h-3.5 w-3.5" /> {doc.unique_id}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">Edit Draft</span>
      </div>

      <PageHeader title={`Edit Draft — ${doc.unique_id}`} description="Lengkapi form lalu submit untuk memulai alur approval." />

      {is_admin_submit && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-brand/20 bg-brand-surface/40 p-4 text-sm text-brand-ink">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Direct submission oleh Admin — <strong>L1 akan di-approve otomatis</strong> dan dokumen langsung masuk review L2.
          </span>
        </div>
      )}

      {is_rejected_revision && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Dokumen ini ditolak approver. Hanya <strong>file PDF</strong> dan <strong>lampiran Excel</strong> yang bisa direvisi — metadata, template SOW, dan PIC lainnya terkunci.
          </span>
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); submit(false); }}
        encType="multipart/form-data"
        className="max-w-3xl space-y-5"
      >
        {/* ─── 1. Metadata ─── */}
        <Section step={1} title="Metadata Dokumen">
          <div className="grid gap-4 sm:grid-cols-2">
            {is_admin_submit && (
              <div className="sm:col-span-2">
                <Field label="Partner / Subkontraktor" required error={form.errors.partner_id}>
                  <select
                    value={form.data.partner_id}
                    onChange={(e) => form.setData('partner_id', e.target.value)}
                    className={is_rejected_revision ? lockedInputCls : inputCls}
                    disabled={is_rejected_revision}
                  >
                    <option value="">-- Pilih partner --</option>
                    {(partners ?? []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            <div className="sm:col-span-2">
              <Field label="Vendor / Contractor" required error={form.errors.vendor_contractor}>
                <input
                  type="text"
                  value={form.data.vendor_contractor}
                  onChange={(e) => form.setData('vendor_contractor', e.target.value)}
                  className={is_rejected_revision ? lockedInputCls : inputCls}
                  disabled={is_rejected_revision}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="PT Index" required error={form.errors.pt_index}>
                <input
                  type="text"
                  placeholder="mis. PT.2024.001"
                  value={form.data.pt_index}
                  onChange={(e) => form.setData('pt_index', e.target.value)}
                  className={is_rejected_revision ? lockedInputCls : inputCls}
                  disabled={is_rejected_revision}
                />
              </Field>
            </div>

            <Field label="Project Code" error={form.errors.project_code}>
              <input
                type="text"
                placeholder="MW-BKS-2406"
                value={form.data.project_code}
                onChange={(e) => form.setData('project_code', e.target.value)}
                className={is_rejected_revision ? lockedInputCls : inputCls}
                disabled={is_rejected_revision}
              />
            </Field>
            <Field label="Link ID" error={form.errors.link_id}>
              <input
                type="text"
                placeholder="LNK-001"
                value={form.data.link_id}
                onChange={(e) => form.setData('link_id', e.target.value)}
                className={is_rejected_revision ? lockedInputCls : inputCls}
                disabled={is_rejected_revision}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Link Name" error={form.errors.link_name}>
                <input
                  type="text"
                  placeholder="Microwave Link – Bekasi Sektor 4"
                  value={form.data.link_name}
                  onChange={(e) => form.setData('link_name', e.target.value)}
                  className={is_rejected_revision ? lockedInputCls : inputCls}
                  disabled={is_rejected_revision}
                />
              </Field>
            </div>

            <Field label="Tower ID Near End" error={form.errors.tower_id_ne}>
              <input
                type="text"
                placeholder="TWR-NE-001"
                value={form.data.tower_id_ne}
                onChange={(e) => form.setData('tower_id_ne', e.target.value)}
                className={is_rejected_revision ? lockedInputCls : inputCls}
                disabled={is_rejected_revision}
              />
            </Field>
            <Field label="Site Name Near End" error={form.errors.site_name_ne}>
              <input
                type="text"
                placeholder="Bekasi Industri"
                value={form.data.site_name_ne}
                onChange={(e) => form.setData('site_name_ne', e.target.value)}
                className={is_rejected_revision ? lockedInputCls : inputCls}
                disabled={is_rejected_revision}
              />
            </Field>
            <Field label="Tower ID Far End" error={form.errors.tower_id_fe}>
              <input
                type="text"
                placeholder="TWR-FE-001"
                value={form.data.tower_id_fe}
                onChange={(e) => form.setData('tower_id_fe', e.target.value)}
                className={is_rejected_revision ? lockedInputCls : inputCls}
                disabled={is_rejected_revision}
              />
            </Field>
            <Field label="Site Name Far End" error={form.errors.site_name_fe}>
              <input
                type="text"
                placeholder="Karawang Utara"
                value={form.data.site_name_fe}
                onChange={(e) => form.setData('site_name_fe', e.target.value)}
                className={is_rejected_revision ? lockedInputCls : inputCls}
                disabled={is_rejected_revision}
              />
            </Field>
          </div>
        </Section>

        {/* ─── 2. SOW Template ─── */}
        <Section step={2} title="SOW & Alur Approval" done={!!form.data.template_id}>
          <Field label="Template / SOW" required error={form.errors.template_id}>
            <select
              value={form.data.template_id}
              onChange={handleTemplateChange}
              className={is_rejected_revision ? lockedInputCls : inputCls}
              disabled={loadingLevels || is_rejected_revision}
            >
              <option value="">-- Pilih template SOW --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.sow_code ? ` (${t.sow_code})` : ''}
                </option>
              ))}
            </select>
          </Field>

          {levels.length > 0 && (
            <div className="mt-4 rounded-lg border border-brand/20 bg-brand-surface/40 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-ink">
                Struktur Approval
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-text-secondary)] text-[10px] font-bold text-white">1</span>
                  <span className="text-[var(--color-text-secondary)]">L1 — Admin Aviat (approve-only, auto)</span>
                </div>
                {levels.map((l) => (
                  <div key={l.level_order} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-ink text-[10px] font-bold text-white">
                      {l.level_order}
                    </span>
                    <span className="text-[var(--color-text-primary)]">
                      L{l.level_order} — {l.role_label}
                      {!l.requires_signature && (
                        <span className="ml-2 text-[10px] text-[var(--color-text-tertiary)]">(approve-only)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ─── 3. PIC per Level ─── */}
        {levels.length > 0 && (
          <Section step={3} title="Pilih PIC Tiap Level" done={allPicsFilled}>
            <div className="space-y-4">
              {levels.map((level) => {
                const roleApprovers = approvers[level.role] ?? [];
                const picError = (form.errors as Record<string, string>)[`pics.${level.level_order}`];
                return (
                  <div key={level.level_order}>
                    <div className="flex items-center gap-4">
                      <span className="w-44 shrink-0 text-sm font-medium text-[var(--color-text-secondary)]">
                        L{level.level_order} — {level.role_label}
                      </span>
                      <select
                        value={form.data.pics[String(level.level_order)] ?? ''}
                        onChange={(e) => handlePicChange(level.level_order, e.target.value)}
                        className={cn(is_rejected_revision ? lockedInputCls : inputCls, 'flex-1')}
                        disabled={is_rejected_revision}
                      >
                        <option value="">-- Pilih PIC --</option>
                        {roleApprovers.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      {form.data.pics[String(level.level_order)] && (
                        <Check className="h-4 w-4 shrink-0 text-brand-ink" />
                      )}
                    </div>
                    {picError && <p className={cn(errorCls, 'mt-1 pl-48')}>{picError}</p>}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ─── 4. Upload File ─── */}
        <Section step={4} title="Upload Dokumen" done={pdfReady}>
          <div className="space-y-4">
            {/* PDF — required */}
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">
                PDF ATP <span className="text-danger">*</span>
                <span className="ml-1 text-[var(--color-text-tertiary)]">(maks 20 MB)</span>
              </p>

              {/* Show existing PDF info if draft already has one */}
              {doc.has_pdf && !form.data.pdf_file && (
                <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3">
                  <FileText className="h-6 w-6 shrink-0 text-danger" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">PDF tersimpan di draft</p>
                    <p className="font-mono text-xs text-[var(--color-text-primary)]">{doc.unique_id}.pdf</p>
                  </div>
                  <span className="text-xs text-[var(--color-text-tertiary)]">Ganti jika perlu</span>
                </div>
              )}

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
                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-bg-subtle)]"
                  >
                    <X className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  </button>
                </div>
              ) : (
                <DropZone
                  accept="application/pdf"
                  hint="PDF saja · maks 20 MB"
                  onFile={(f) => form.setData('pdf_file', f)}
                />
              )}
              {form.errors.pdf_file && <p className={errorCls}>{form.errors.pdf_file}</p>}
            </div>

            {/* Excel — optional */}
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">
                Lampiran Excel
                <span className="ml-1 text-[var(--color-text-tertiary)]">(opsional · .xlsx/.xls · maks 10 MB)</span>
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
                    onClick={() => form.setData('excel_file', null)}
                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-bg-subtle)]"
                  >
                    <X className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  </button>
                </div>
              ) : (
                <DropZone
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  hint=".xlsx / .xls · maks 10 MB"
                  onFile={(f) => form.setData('excel_file', f)}
                />
              )}
              {form.errors.excel_file && <p className={errorCls}>{form.errors.excel_file}</p>}
            </div>
          </div>
        </Section>

        {/* ─── Actions ─── */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link
            href={`/documents/${doc.id}`}
            className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            Batal
          </Link>
          {isDraftEditing && (
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={form.processing}
              className="h-9 rounded-md border border-[var(--color-border-strong)] bg-white px-5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50"
            >
              {form.processing ? 'Memproses…' : 'Simpan Draft'}
            </button>
          )}
          <button
            type="submit"
            disabled={form.processing || !pdfReady || (is_rejected_revision && !form.data.pdf_file)}
            className="h-9 rounded-md bg-brand-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50"
          >
            {form.processing ? 'Memproses…' : is_rejected_revision ? 'Submit Revisi PDF' : 'Submit untuk Approval'}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

// ── DropZone ──────────────────────────────────────────────────────────────────

function DropZone({
  accept,
  hint,
  onFile,
}: {
  accept: string;
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
      <p className="text-sm font-medium text-[var(--color-text-primary)]">
        Drag &amp; drop file di sini
      </p>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
        atau <span className="text-ming">klik untuk browse</span> · {hint}
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
