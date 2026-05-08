"use client";

import { useState } from "react";
import { Server, Plus, Edit2, Trash2, Power, PowerOff, Mail, Key, Hash, X } from "lucide-react";
import { saveProvider, toggleProviderStatus, deleteProvider, type ProviderActionState } from "../../actions/providers";
import { createPortal } from "react-dom";

export function ProviderList({ providers }: { providers: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [providerType, setProviderType] = useState<"API_BREVO" | "SMTP">("SMTP");
  const [accountTier, setAccountTier] = useState<string>("NOVA");

  const openNew = () => {
    setEditingProvider(null);
    setProviderType("SMTP");
    setAccountTier("NOVA");
    setIsModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingProvider(p);
    setProviderType(p.providerType);
    setAccountTier(p.accountTier || "NOVA");
    setIsModalOpen(true);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await saveProvider({}, formData);
    if (res.error) {
      alert(res.error);
    } else {
      setIsModalOpen(false);
    }
    setIsLoading(false);
  }

  async function handleToggle(id: string, current: boolean) {
    if (!confirm(`Deseja ${current ? 'desativar' : 'ativar'} este provedor? ele deixará de receber contatos.`)) return;
    await toggleProviderStatus(id, current);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este provedor? Isso não pode ser desfeito.")) return;
    await deleteProvider(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-surface-50">Contas de Envio</h2>
          <p className="text-surface-400 text-sm">Gerencie suas contas SMTP (Gmail, etc) e integrações de API.</p>
        </div>
        <button onClick={openNew} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Novo Provedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((p) => {
          const tierColors: Record<string, string> = {
            NOVA: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            AQUECIDA: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            VETERANA: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          };
          const tierLabels: Record<string, string> = {
            NOVA: '🌱 Nova',
            AQUECIDA: '🔥 Aquecida',
            VETERANA: '⭐ Veterana',
          };
          const tier = p.accountTier || 'NOVA';
          const bounceRate = p.totalSent > 0 ? ((p.totalBounces || 0) / p.totalSent * 100).toFixed(1) : '0.0';

          return (
          <div key={p.id} className="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-full h-1 ${p.isActive ? 'bg-primary-500' : 'bg-surface-600'}`} />
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${p.isActive ? 'bg-primary-500/20 text-primary-400' : 'bg-surface-800 text-surface-500'}`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-surface-50">{p.provider}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-surface-400 px-2 py-0.5 rounded bg-surface-800">
                      {p.providerType === 'SMTP' ? 'SMTP' : 'API Brevo'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${tierColors[tier] || tierColors.NOVA}`}>
                      {tierLabels[tier] || tierLabels.NOVA}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleToggle(p.id, p.isActive)} className="text-surface-400 hover:text-white p-1" title="Alternar Status">
                  {p.isActive ? <Power className="w-4 h-4 text-green-400" /> : <PowerOff className="w-4 h-4 text-red-400" />}
                </button>
                <button onClick={() => openEdit(p)} className="text-surface-400 hover:text-white p-1" title="Editar">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-surface-400 hover:text-red-400 p-1" title="Excluir">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Remetente:</span>
                <span className="text-surface-100 font-medium truncate ml-2">{p.fromEmail}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Envios Hoje:</span>
                <span className="text-surface-100 font-medium">{p.sentToday} / {p.dailyLimit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Total Enviados:</span>
                <span className="text-surface-100 font-medium">{p.totalSent || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Reputação:</span>
                <span className={`font-medium ${Number(bounceRate) > 5 ? 'text-red-400' : Number(bounceRate) > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {bounceRate}% bounce{(p.totalComplaints || 0) > 0 && ` · ${p.totalComplaints} complaints`}
                </span>
              </div>
              {p.providerType === 'SMTP' && (
                <div className="flex justify-between text-sm">
                  <span className="text-surface-400">Host:</span>
                  <span className="text-surface-100 font-medium">{p.smtpHost}:{p.smtpPort}</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-surface-800">
              <div className="w-full bg-surface-800 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${p.sentToday >= p.dailyLimit ? 'bg-red-500' : 'bg-primary-500'}`} 
                  style={{ width: `${Math.min((p.sentToday / p.dailyLimit) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
          );
        })}
        {providers.length === 0 && (
          <div className="col-span-full py-12 text-center text-surface-400 glass-panel rounded-2xl">
            Nenhum provedor configurado. Clique em &quot;Novo Provedor&quot; para começar.
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-surface-800 sticky top-0 bg-surface-900/90 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold text-surface-50">
                {editingProvider ? "Editar Provedor" : "Novo Provedor"}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {editingProvider && <input type="hidden" name="id" value={editingProvider.id} />}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">ID do Provedor</label>
                  <input 
                    name="provider" 
                    required 
                    defaultValue={editingProvider?.provider || ""} 
                    placeholder="Ex: GMAIL_ATENDIMENTO" 
                    className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-3 text-surface-50 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none"
                  />
                  <p className="text-xs text-surface-500 mt-1">Nome único para identificar internamente.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Tipo de Conexão</label>
                  <select 
                    name="providerType" 
                    value={providerType}
                    onChange={(e) => setProviderType(e.target.value as "API_BREVO" | "SMTP")}
                    className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-3 text-surface-50 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none"
                  >
                    <option value="SMTP">SMTP Genérico (Gmail, Hostinger, etc)</option>
                    <option value="API_BREVO">API Brevo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Email Remetente</label>
                  <input name="fromEmail" type="email" required defaultValue={editingProvider?.fromEmail || ""} placeholder="vendas@empresa.com" className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-3 text-surface-50 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Nome Remetente</label>
                  <input name="fromName" required defaultValue={editingProvider?.fromName || ""} placeholder="João da Empresa" className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-3 text-surface-50 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Limite Diário de Envios</label>
                  <input name="dailyLimit" type="number" min="1" required defaultValue={editingProvider?.dailyLimit || 500} className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-3 text-surface-50 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none" />
                  <p className="text-xs text-surface-500 mt-1">Limite máximo. O sistema de warmup aplica limites menores para contas novas.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Peso (Prioridade na fila)</label>
                  <input name="weight" type="number" min="1" required defaultValue={editingProvider?.weight || 25} className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-3 text-surface-50 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Classificação da Conta</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "NOVA", label: "🌱 Nova", desc: "Conta recém-criada — warmup ativo", color: "border-amber-500/50 bg-amber-500/10" },
                    { value: "AQUECIDA", label: "🔥 Aquecida", desc: "Conta com 2+ semanas de uso", color: "border-blue-500/50 bg-blue-500/10" },
                    { value: "VETERANA", label: "⭐ Veterana", desc: "Conta estabelecida — sem limites de warmup", color: "border-emerald-500/50 bg-emerald-500/10" },
                  ].map(tier => (
                    <button
                      key={tier.value}
                      type="button"
                      onClick={() => setAccountTier(tier.value)}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                        accountTier === tier.value ? tier.color : 'border-surface-800 bg-surface-950'
                      }`}
                    >
                      <span className="text-sm font-bold text-surface-50">{tier.label}</span>
                      <span className="text-[10px] text-surface-400 text-center mt-1">{tier.desc}</span>
                    </button>
                  ))}
                </div>
                <input type="hidden" name="accountTier" value={accountTier} />
              </div>

              {providerType === "SMTP" && (
                <div className="p-4 border border-primary-500/30 bg-primary-500/5 rounded-xl space-y-4">
                  <h3 className="font-medium text-primary-400">Credenciais SMTP</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-surface-400 mb-1">Host SMTP</label>
                      <input name="smtpHost" required={providerType === "SMTP"} defaultValue={editingProvider?.smtpHost || "smtp.gmail.com"} className="w-full bg-surface-950 border border-surface-800 rounded-lg px-3 py-2 text-surface-50 text-sm focus:border-primary-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">Porta</label>
                      <input name="smtpPort" type="number" required={providerType === "SMTP"} defaultValue={editingProvider?.smtpPort || 587} className="w-full bg-surface-950 border border-surface-800 rounded-lg px-3 py-2 text-surface-50 text-sm focus:border-primary-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Usuário SMTP (Geralmente o email)</label>
                    <input name="smtpUser" required={providerType === "SMTP"} defaultValue={editingProvider?.smtpUser || ""} className="w-full bg-surface-950 border border-surface-800 rounded-lg px-3 py-2 text-surface-50 text-sm focus:border-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Senha (Senha de App para Gmail)</label>
                    <input name="smtpPass" type="password" required={providerType === "SMTP" && !editingProvider} defaultValue={editingProvider?.smtpPass || ""} className="w-full bg-surface-950 border border-surface-800 rounded-lg px-3 py-2 text-surface-50 text-sm focus:border-primary-500 outline-none" placeholder={editingProvider ? "Deixe em branco para manter a senha atual" : "Senha"} />
                  </div>
                </div>
              )}

              {providerType === "API_BREVO" && (
                <div className="p-4 border border-surface-700 bg-surface-800/50 rounded-xl">
                  <p className="text-sm text-surface-300">
                    Provedores API usam as chaves definidas nas variáveis de ambiente do Vercel (ex: BREVO_API_KEY).
                    Você só precisa configurar as informações de remetente acima.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-surface-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={isLoading} className="btn btn-primary min-w-[120px]">
                  {isLoading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
