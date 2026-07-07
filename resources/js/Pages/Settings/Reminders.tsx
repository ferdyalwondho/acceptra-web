import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import { Bell, Info, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReminderSetting {
  id: string;
  level_order: number | null;
  interval_days: number;
  is_weekday_only: boolean;
  label: string;
  [key: string]: string | number | boolean | null;
}

interface Props {
  settings: ReminderSetting[];
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-[120ms]',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        checked ? 'bg-brand-ink' : 'bg-[var(--color-border-strong)]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-[120ms]',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}

export default function SettingsReminders({ settings: initialSettings }: Props) {
  const { t } = useTranslation();
  const { props } = usePage<{ flash?: { success?: string } }>();
  const flash = props.flash;

  const [settings, setSettings] = useState<ReminderSetting[]>(initialSettings);
  const [processing, setProcessing] = useState(false);

  function updateSetting<K extends keyof ReminderSetting>(
    index: number,
    key: K,
    value: ReminderSetting[K],
  ) {
    setSettings((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  }

  function handleSave() {
    setProcessing(true);
    router.put(
      '/settings/reminders',
      { settings },
      {
        onFinish: () => setProcessing(false),
      },
    );
  }

  return (
    <AppShell>
      <Head title={t('settings_reminders.page_title')} />

      <PageHeader
        title={t('settings_reminders.heading')}
        description={t('settings_reminders.description')}
      />

      <div className="max-w-2xl space-y-5">
        {/* Flash message */}
        {flash?.success && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 text-sm text-success">
            <Bell className="h-4 w-4 shrink-0" />
            {flash.success}
          </div>
        )}

        {/* Settings table card */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-6 py-4">
            <Bell className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <h2 className="font-semibold text-[var(--color-text-primary)]">{t('settings_reminders.card_title')}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                  <th className="px-6 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('settings_reminders.col_level')}</th>
                  <th className="px-6 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('settings_reminders.col_interval')}</th>
                  <th className="px-6 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('settings_reminders.col_weekday_only')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {settings.map((setting, index) => (
                  <tr key={setting.id} className="hover:bg-[var(--color-bg-subtle)]">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--color-text-primary)]">{setting.label}</div>
                      {setting.level_order === null && (
                        <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                          {t('settings_reminders.fallback_hint')}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={setting.interval_days}
                          onChange={(e) =>
                            updateSetting(index, 'interval_days', Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className={cn(
                            'w-20 rounded-md border border-[var(--color-border-strong)] bg-white px-3 py-1.5 text-sm',
                            'focus:border-brand-ink focus:outline-none focus:ring-[3px] focus:ring-ring/40',
                          )}
                        />
                        <span className="text-[var(--color-text-secondary)]">{t('settings_reminders.unit_days')}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Toggle
                        checked={setting.is_weekday_only}
                        onChange={(v) => updateSetting(index, 'is_weekday_only', v)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info box */}
        <div className="flex gap-3 rounded-lg bg-[var(--color-bg-subtle)] p-4 text-xs text-[var(--color-text-secondary)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>{t('settings_reminders.info_text')}</p>
        </div>

        {/* Save button */}
        <div className="flex justify-end pb-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={processing}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-md bg-brand-ink px-5 text-sm font-semibold text-white transition-colors',
              'hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
              processing && 'cursor-not-allowed opacity-60',
            )}
          >
            <Save className="h-4 w-4" />
            {processing ? t('settings_reminders.btn_saving') : t('settings_reminders.btn_save')}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
