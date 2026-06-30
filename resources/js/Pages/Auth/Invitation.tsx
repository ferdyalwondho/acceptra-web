import { useForm, Head } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Loader2, UserCheck, AlertCircle } from 'lucide-react';

interface Props {
  token: string;
  name: string;
  email: string;
  expired?: boolean;
  errors?: Record<string, string>;
}

export default function Invitation({ token, name, email, expired = false, errors = {} }: Props) {
  const { data, setData, post, processing } = useForm({
    token,
    password: '',
    password_confirmation: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post('/invitation/' + token);
  }

  const inputClass = (field: string) =>
    cn(
      'h-9 w-full rounded-sm border bg-white px-3 text-sm',
      'placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[120ms]',
      'focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40',
      errors[field] ? 'border-danger' : 'border-[var(--color-border-strong)]',
    );

  return (
    <>
      <Head title={expired ? 'Link Kedaluwarsa' : 'Aktivasi Akun'} />

      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-canvas)] p-4">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 shadow-sm">
            <div className="mb-7 flex justify-center">
              <img src="/images/logo.png" alt="Acceptra" className="h-8 w-auto" />
            </div>

            {expired ? (
              /* ── Link Kedaluwarsa ── */
              <div>
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-danger/20 bg-danger-surface p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                  <div>
                    <p className="text-sm font-semibold text-danger">Link Kedaluwarsa</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                      Link undangan ini tidak valid atau sudah kedaluwarsa (berlaku 72 jam).
                    </p>
                  </div>
                </div>

                <h1 className="mb-2 text-base font-semibold text-[var(--color-text-primary)]">
                  Apa yang harus dilakukan?
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Hubungi Admin Aviat untuk meminta link undangan baru. Admin dapat mengirim ulang
                  undangan melalui halaman manajemen pengguna.
                </p>

                <div className="mt-6 text-center">
                  <a
                    href="/login"
                    className="text-xs text-ming hover:underline"
                  >
                    Sudah punya akun? Masuk di sini
                  </a>
                </div>
              </div>
            ) : (
              /* ── Form Aktivasi ── */
              <>
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-[var(--color-brand-surface)] bg-[var(--color-brand-surface)] p-4">
                  <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-ink" />
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">Halo, {name}!</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                      Anda diundang ke Acceptra. Buat password untuk mengaktifkan akun{' '}
                      <span className="font-mono font-medium">{email}</span>.
                    </p>
                  </div>
                </div>

                {errors.token && (
                  <div className="mb-4 rounded-md bg-danger-surface px-3 py-2.5 text-sm text-danger">
                    {errors.token}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                      Password
                    </label>
                    <input
                      type="password"
                      value={data.password}
                      onChange={(e) => setData('password', e.target.value)}
                      placeholder="Min. 8 karakter"
                      className={inputClass('password')}
                    />
                    {errors.password && <p className="mt-1.5 text-xs text-danger">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                      Konfirmasi Password
                    </label>
                    <input
                      type="password"
                      value={data.password_confirmation}
                      onChange={(e) => setData('password_confirmation', e.target.value)}
                      placeholder="Ulangi password"
                      className={inputClass('password_confirmation')}
                    />
                    {errors.password_confirmation && (
                      <p className="mt-1.5 text-xs text-danger">{errors.password_confirmation}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className={cn(
                      'flex h-9 w-full items-center justify-center gap-2 rounded-md bg-brand-ink text-sm font-semibold text-white',
                      'transition-colors duration-[120ms] hover:bg-brand-hover',
                      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                      'disabled:opacity-50 disabled:pointer-events-none',
                    )}
                  >
                    {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Aktifkan Akun
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
