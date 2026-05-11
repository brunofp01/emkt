"use client";

import { useState } from "react";
import { X, FileUp, Globe, Database, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { CSVImporter } from "./csv-importer";
import { PlatformImporter } from "./platform-importer";

interface ImportModalProps {
  campaigns: Array<{ id: string; name: string }>;
  onClose: () => void;
  defaultMethod?: ImportMethod;
  initialCampaignId?: string;
}

type ImportMethod = "selection" | "csv" | "platforms";

export function ImportModal({ onClose, campaigns, defaultMethod = "selection", initialCampaignId }: ImportModalProps) {
  const [method, setMethod] = useState<ImportMethod>(defaultMethod);

  const renderSelection = () => (
    <div className="space-y-4 py-4">
      <button
        onClick={() => setMethod("csv")}
        className="group relative flex w-full items-center gap-4 rounded-2xl border border-surface-800 bg-surface-900/50 p-5 transition-all hover:border-primary-500/50 hover:bg-surface-800/80"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-110">
          <FileUp className="h-7 w-7" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-bold text-surface-50">Arquivo CSV</h3>
          <p className="text-sm text-surface-500">Importe contatos de planilhas Excel ou Google Sheets.</p>
        </div>
        <ArrowRight className="h-5 w-5 text-surface-700 transition-transform group-hover:translate-x-1 group-hover:text-primary-500" />
      </button>

      <button
        onClick={() => setMethod("platforms")}
        className="group relative flex w-full items-center gap-4 rounded-2xl border border-surface-800 bg-surface-900/50 p-5 transition-all hover:border-primary-500/50 hover:bg-surface-800/80"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-110">
          <Globe className="h-7 w-7" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-bold text-surface-50">Plataformas Externas</h3>
          <p className="text-sm text-surface-500">HubSpot, Salesforce, Pipedrive e muito mais.</p>
        </div>
        <ArrowRight className="h-5 w-5 text-surface-700 transition-transform group-hover:translate-x-1 group-hover:text-primary-500" />
      </button>

      <div className="rounded-xl border border-primary-500/20 bg-primary-500/5 p-4">
        <div className="flex gap-3">
          <Database className="h-5 w-5 text-primary-500 shrink-0" />
          <p className="text-xs leading-relaxed text-surface-400">
            <strong>Dica:</strong> Todos os contatos importados serão distribuídos automaticamente entre seus provedores ativos para garantir a melhor entregabilidade.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-800/60 px-6 py-4 bg-surface-900/20">
          <div className="flex items-center gap-3">
            {method !== "selection" && (
              <button 
                onClick={() => setMethod("selection")}
                className="mr-2 text-xs font-bold uppercase tracking-widest text-primary-500 hover:text-primary-400"
              >
                Voltar
              </button>
            )}
            <h2 className="text-lg font-bold text-surface-50">
              {method === "selection" && "Como deseja importar?"}
              {method === "csv" && "Importar de CSV"}
              {method === "platforms" && "Conectar Plataforma"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-surface-500 hover:bg-surface-800 hover:text-surface-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {method === "selection" && renderSelection()}
          {method === "csv" && (
            <CSVImporter 
              campaigns={campaigns} 
              onCancel={() => setMethod("selection")} 
              onSuccess={onClose} 
              initialCampaignId={initialCampaignId}
            />
          )}
          {method === "platforms" && <PlatformImporter />}
        </div>
      </div>
    </div>
  );
}
