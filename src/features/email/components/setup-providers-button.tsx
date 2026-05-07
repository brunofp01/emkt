
"use client";

import { useState } from "react";
import { setupDefaultProviders } from "@/features/email/actions/setup-providers";
import { Loader2, CheckCircle2 } from "lucide-react";

export function SetupProvidersButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    const result = await setupDefaultProviders();
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert("Erro ao configurar: " + result.error);
    }
  };

  return (
    <button 
      onClick={handleSetup}
      disabled={loading || success}
      className="text-sm font-medium text-primary-400 hover:text-primary-300 flex items-center gap-2 disabled:opacity-50"
    >
      {loading ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> Configurando...</>
      ) : success ? (
        <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Configurado!</>
      ) : (
        "Configurar Conexões Iniciais →"
      )}
    </button>
  );
}
