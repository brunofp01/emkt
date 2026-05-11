"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, FileText, Check, AlertCircle, Loader2, Table, ChevronRight, Tags, Activity, Mail, Users as UsersIcon } from "lucide-react";
import { bulkImportContacts } from "../actions/bulk-import";

interface CSVImporterProps {
  campaigns: Array<{ id: string; name: string }>;
  onCancel: () => void;
  onSuccess: () => void;
  initialCampaignId?: string;
}

interface Mapping {
  email: string;
  name: string;
  company: string;
  phone: string;
  tags: string;
}

export function CSVImporter({ onCancel, onSuccess, campaigns, initialCampaignId }: CSVImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string>(initialCampaignId || "");
    const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Mapping>({
    email: "",
    name: "",
    company: "",
    phone: "",
    tags: "",
  });
  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "done">("upload");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true,
      preview: 5,
      complete: (results) => {
        if (results.meta.fields) {
          setHeaders(results.meta.fields);
          setPreview(results.data);
          
          // Auto-mapping attempt
          const newMapping = { ...mapping };
          results.meta.fields.forEach(header => {
            const h = header.toLowerCase();
            if (h.includes("email")) newMapping.email = header;
            if (h.includes("nome") || h.includes("name")) newMapping.name = header;
            if (h.includes("empresa") || h.includes("company")) newMapping.company = header;
            if (h.includes("telefone") || h.includes("phone") || h.includes("tel")) newMapping.phone = header;
            if (h.includes("tags") || h.includes("categoria")) newMapping.tags = header;
          });
          setMapping(newMapping);
          setStep("mapping");
        }
      },
      error: (err) => {
        setError("Erro ao ler o arquivo CSV: " + err.message);
      }
    });
  };

  const handleStartImport = async () => {
    if (!mapping.email) {
      setError("O campo de Email é obrigatório.");
      return;
    }

    setStep("importing");
    setError(null);

    Papa.parse(file!, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const total = results.data.length;
        const batchSize = 100;
        const contacts = results.data.map((row: any) => ({
          email: row[mapping.email],
          name: row[mapping.name] || null,
          company: row[mapping.company] || null,
          phone: row[mapping.phone] || null,
          tags: mapping.tags && row[mapping.tags] ? row[mapping.tags].split(",").map((t: string) => t.trim()) : [],
        })).filter(c => c.email);

        try {
          for (let i = 0; i < contacts.length; i += batchSize) {
            const batch = contacts.slice(i, i + batchSize);
            const result = await bulkImportContacts(batch, selectedCampaign);
            if (result.error) throw new Error(result.error);
            setProgress(Math.round(((i + batch.length) / contacts.length) * 100));
          }
          setStep("done");
          setTimeout(onSuccess, 1500);
        } catch (err: any) {
          setError(err.message || "Erro durante a importação.");
          setStep("mapping");
        }
      }
    });
  };

  const selectClass = "h-10 w-full rounded-lg border border-surface-800 bg-surface-900 px-3 text-sm text-surface-200 focus:border-primary-500/50 focus:outline-none";

  if (step === "upload") {
    return (
      <div 
        className="group flex flex-col items-center justify-center border-2 border-dashed border-surface-800 rounded-3xl p-12 transition-all hover:border-primary-500/50 hover:bg-primary-500/5 cursor-pointer relative overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary-500/50', 'bg-primary-500/5'); }}
        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary-500/50', 'bg-primary-500/5'); }}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500 mb-6 group-hover:scale-110 transition-transform duration-500">
          <Upload className="h-10 w-10" />
        </div>
        
        <h3 className="text-xl font-bold text-surface-50 mb-2">Solte seu arquivo aqui</h3>
        <p className="text-surface-500 text-sm mb-8 text-center max-w-xs">
          Suporta arquivos .csv exportados do <span className="text-surface-300 font-semibold">Google Sheets</span> ou <span className="text-surface-300 font-semibold">Excel</span>.
        </p>
        
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-surface-950 bg-surface-900 flex items-center justify-center">
                <FileText className="h-4 w-4 text-surface-500" />
              </div>
            ))}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-surface-600">Arraste ou clique</span>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".csv" 
          className="hidden" 
        />
      </div>
    );
  }

  if (step === "mapping") {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-2 text-sm text-surface-400 mb-4">
          <FileText className="h-4 w-4" />
          <span>{file?.name}</span>
          <span className="text-surface-700">•</span>
          <span>{preview.length} linhas detectadas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-surface-500">Mapeamento de Colunas</h4>
            <div className="space-y-4">
              {Object.keys(mapping).map((field) => (
                <div key={field} className="group space-y-1.5 p-3 rounded-xl border border-surface-800/40 bg-surface-900/30 transition-all hover:border-primary-500/30">
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {field === "email" && <Mail className="h-3 w-3 text-primary-400" />}
                      {field === "name" && <UsersIcon className="h-3 w-3 text-primary-400" />}
                      {field === "company" && <Table className="h-3 w-3 text-primary-400" />}
                      {field === "phone" && <Activity className="h-3 w-3 text-primary-400" />}
                      {field === "tags" && <Tags className="h-3 w-3 text-primary-400" />}
                      {field}
                    </span>
                    {field === "email" && <span className="text-[9px] text-red-500 font-black">OBRIGATÓRIO</span>}
                  </label>
                  <select 
                    value={(mapping as any)[field]}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                    className="h-9 w-full rounded-lg border border-surface-800 bg-surface-950 px-3 text-xs text-surface-200 focus:border-primary-500/50 focus:outline-none transition-colors"
                  >
                    <option value="">Não importar</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-surface-800/40">
              <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500 flex items-center gap-2 mb-1.5">
                <Activity className="h-3 w-3 text-primary-500" />
                Adicionar à Campanha (Opcional)
              </label>
              <select 
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className={selectClass}
              >
                <option value="">Nenhuma (Apenas importar)</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="mt-1 text-[9px] text-surface-600">
                Todos os contatos importados serão vinculados a esta campanha.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-surface-500">Preview dos Dados</h4>
            <div className="rounded-xl border border-surface-800 bg-surface-900/50 overflow-hidden">
              <table className="w-full text-[10px] text-left">
                <thead>
                  <tr className="border-b border-surface-800 bg-surface-800/30">
                    <th className="px-3 py-2 text-surface-400">Linha</th>
                    <th className="px-3 py-2 text-surface-400">Email (Mapeado)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/40">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-surface-600">{i + 1}</td>
                      <td className="px-3 py-2 text-surface-200 truncate max-w-[150px]">
                        {row[mapping.email] || <span className="text-surface-700 italic">Vazio</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-800/60">
          <button onClick={onCancel} className="px-6 py-2 text-sm font-bold text-surface-400 hover:text-surface-200">Cancelar</button>
          <button 
            onClick={handleStartImport}
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-500 transition-all"
          >
            Iniciar Importação <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (step === "importing") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative h-24 w-24">
          <svg className="h-full w-full transform -rotate-90">
            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-surface-800" />
            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * progress) / 100} className="text-primary-500 transition-all duration-500" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-surface-50">
            {progress}%
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-surface-50">Processando contatos...</h3>
          <p className="text-sm text-surface-500">Estamos validando e distribuindo os leads entre seus provedores.</p>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in zoom-in duration-300">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
          <Check className="h-10 w-10" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-surface-50">Importação Concluída!</h3>
          <p className="text-sm text-surface-500">Seus contatos já estão disponíveis para campanhas.</p>
        </div>
      </div>
    );
  }

  return null;
}
