import { useState } from 'react';
import { useForm, Head } from '@inertiajs/react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  errors?: Record<string, string>;
  status?: string;
}

export default function Login({ errors = {}, status }: Props) {
  const { data, setData, post, processing } = useForm({
    email: '',
    password: '',
    remember: false,
  });

  const [showPassword, setShowPassword] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post('/login');
  }

  return (
    <>
      <Head title="Sign In — Acceptra" />

      <div
        className="relative flex min-h-screen items-stretch"
        style={{
          backgroundImage: "url('/images/login-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 z-0 bg-black/40" />

        {/* Left column: tagline at bottom — desktop only */}
        <div className="relative z-10 hidden lg:flex flex-1 flex-col justify-end p-12 pb-28">
          <p className="max-w-md text-4xl font-bold italic leading-snug text-white">
            "Manage your data, monitor performance, and stay in control - securely."
          </p>
        </div>

        {/* Right column: form + tagline stacked, slightly above center on mobile */}
        <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 py-10 sm:px-8 lg:w-1/2 lg:py-0">

          {/* Login card */}
          <div className="w-full max-w-md rounded-2xl bg-white p-8 sm:p-10 shadow-xl">
            {/* Logo */}
            <div className="mb-7 flex justify-center">
              <img src="/images/logo.png" alt="Acceptra" className="h-14 w-auto sm:h-16" />
            </div>

            <h1 className="mb-1 text-xl font-semibold text-[var(--color-text-primary)]">
              Selamat datang
            </h1>
            <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
              Masuk ke akun Acceptra Anda.
            </p>

            {status && (
              <div className="mb-4 rounded-md bg-success-surface px-3 py-2.5 text-sm text-success">
                {status}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {/* Email */}
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
                    'h-10 w-full rounded-sm border bg-white px-3 text-sm',
                    'placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[120ms]',
                    'focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40',
                    errors.email ? 'border-danger' : 'border-[var(--color-border-strong)]',
                  )}
                />
                {errors.email && <p className="mt-1.5 text-xs text-danger">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Password
                  </label>
                  <a href="/forgot-password" className="text-xs text-ming hover:underline">
                    Lupa password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-invalid={!!errors.password}
                    className={cn(
                      'h-10 w-full rounded-sm border bg-white px-3 pr-10 text-sm',
                      'placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[120ms]',
                      'focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40',
                      errors.password ? 'border-danger' : 'border-[var(--color-border-strong)]',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-danger">{errors.password}</p>
                )}
              </div>

              {/* Remember */}
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={data.remember}
                  onChange={(e) => setData('remember', e.target.checked)}
                  className="h-4 w-4 rounded-[4px] border-[var(--color-border-strong)] accent-brand-ink"
                />
                Ingat saya
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={processing}
                className={cn(
                  'flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand-ink text-sm font-semibold text-white',
                  'transition-colors duration-[120ms] hover:bg-brand-hover',
                  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign In
              </button>
            </form>
          </div>

          {/* Tagline — mobile only, below card */}
          <p className="mt-6 max-w-xs px-2 text-center text-xs italic font-medium leading-relaxed text-white/80 lg:hidden">
            "Manage your data, monitor performance, and stay in control - securely."
          </p>
        </div>
      </div>
    </>
  );
}
