import { useForm, Head } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Props {
  token: string;
  email: string;
  errors?: Record<string, string>;
}

export default function ResetPassword({ token, email, errors = {} }: Props) {
  const { data, setData, post, processing } = useForm({
    token,
    email,
    password: '',
    password_confirmation: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post('/reset-password');
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
      <Head title="Set Password Baru" />

      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-canvas)] p-4">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 shadow-sm">
            <div className="mb-7 flex justify-center">
              <img src="/images/logo.png" alt="Acceptra" className="h-8 w-auto" />
            </div>

            <h1 className="mb-1 text-xl font-semibold text-[var(--color-text-primary)]">Set Password Baru</h1>
            <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
              Buat password baru untuk akun <span className="font-medium">{email}</span>.
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Password Baru
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
                Simpan Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
