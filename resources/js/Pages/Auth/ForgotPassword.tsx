import { useForm, Head, Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Loader2, ArrowLeft } from 'lucide-react';

interface Props {
  errors?: Record<string, string>;
  status?: string;
}

export default function ForgotPassword({ errors = {}, status }: Props) {
  const { data, setData, post, processing } = useForm({ email: '' });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post('/forgot-password');
  }

  return (
    <>
      <Head title="Lupa Password" />

      <div
        className="relative flex min-h-screen items-center justify-center p-6"
        style={{
          backgroundImage: "url('/images/login-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 z-0 bg-black/40" />
        <div className="relative z-10 w-full max-w-sm">
          <div className="rounded-2xl bg-white p-8 shadow-xl">
            <div className="mb-7 flex justify-center">
              <img src="/images/logo.png" alt="Acceptra" className="h-8 w-auto" />
            </div>

            <h1 className="mb-1 text-xl font-semibold text-[var(--color-text-primary)]">Lupa password?</h1>
            <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
              Masukkan email Anda dan kami akan mengirimkan link untuk reset password.
            </p>

            {status && (
              <div className="mb-4 rounded-md bg-success-surface px-3 py-2.5 text-sm text-success">
                {status}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Email
                </label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  autoComplete="email"
                  placeholder="nama@perusahaan.com"
                  aria-invalid={!!errors.email}
                  className={cn(
                    'h-9 w-full rounded-sm border bg-white px-3 text-sm',
                    'placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[120ms]',
                    'focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40',
                    errors.email ? 'border-danger' : 'border-[var(--color-border-strong)]',
                  )}
                />
                {errors.email && <p className="mt-1.5 text-xs text-danger">{errors.email}</p>}
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
                Kirim Link Reset
              </button>
            </form>

            <div className="mt-5 text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-ming hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali ke Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
