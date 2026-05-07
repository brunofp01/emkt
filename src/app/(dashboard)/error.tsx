"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log do erro para nosso logger (no lado do cliente)
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 text-center animate-in fade-in duration-500">
      <div className="rounded-full bg-red-500/10 p-4 border border-red-500/20">
        <AlertCircle className="h-10 w-10 text-red-500" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-surface-50">Algo deu errado no Dashboard</h2>
        <p className="mx-auto max-w-md text-surface-400">
          Não conseguimos carregar estas informações agora. Isso pode ser uma falha temporária de conexão.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-surface-600">ID do Erro: {error.digest}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 rounded-lg bg-surface-800 px-6 py-2.5 text-sm font-bold text-surface-100 hover:bg-surface-700 border border-surface-700 transition-all active:scale-95"
        >
          <RefreshCcw className="h-4 w-4" /> Tentar Novamente
        </button>
        
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-500 shadow-lg shadow-primary-600/20 transition-all active:scale-95"
        >
          <Home className="h-4 w-4" /> Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
