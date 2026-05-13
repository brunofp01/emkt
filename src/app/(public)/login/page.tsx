/**
 * Login Page — Autenticação com email/senha via Supabase Auth.
 * Design premium com glassmorphism seguindo o padrão visual do dashboard.
 */
"use client";

import { Suspense, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, Zap, ArrowRight, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("Email ou senha incorretos.");
        } else {
          setError(authError.message);
        }
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in slide-in-from-top-2 duration-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-surface-500">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-600" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="input-base h-11 pl-10 w-full"
              autoComplete="email"
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-surface-500">
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-600" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-base h-11 pl-10 w-full"
              autoComplete="current-password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="btn btn-primary w-full !py-3 !text-sm font-bold"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            <>
              Entrar
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-surface-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md mx-4 relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-surface-950 animate-dot-pulse" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-black text-surface-50 tracking-tight">MailPulse</h1>
              <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-[0.2em]">Email Marketing</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card !p-8 !border-surface-800/60">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-surface-50">Entrar na plataforma</h2>
            <p className="text-sm text-surface-500 mt-1">Insira suas credenciais para acessar o dashboard.</p>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-[10px] text-surface-600 uppercase tracking-widest">
          Plataforma protegida por autenticação segura
        </p>
      </div>
    </div>
  );
}
