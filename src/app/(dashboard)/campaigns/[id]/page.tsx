export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Pause, RotateCcw, Users, Mail, BarChart3, Clock, Send, CheckCircle2, Eye, MousePointerClick, Edit2 } from "lucide-react";
import { getCampaignById } from "@/features/campaigns/lib/queries";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { CAMPAIGN_STATUS_LABELS, STEP_STATUS_LABELS } from "@/shared/lib/constants";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDate } from "@/shared/lib/utils";
import { activateCampaign, pauseCampaign } from "@/features/campaigns/actions/create-campaign";

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Calcula métricas de envio/entrega/abertura por etapa da campanha.
 * Usa SQL COUNT em vez de baixar todos os registros — performance instantânea.
 */
async function getStepMetrics(campaignId: string, steps: any[], totalContacts: number) {
  if (totalContacts === 0 || steps.length === 0) return [];

  const statusHierarchy: Record<string, number> = {
    'QUEUED': 0, 'SENDING': 1, 'SENT': 2, 'DELIVERED': 3, 'OPENED': 4, 'CLICKED': 5,
    'BOUNCED': -1, 'FAILED': -1,
  };

  const sortedSteps = [...steps].sort((a: any, b: any) => a.stepOrder - b.stepOrder);

  // Para cada etapa, buscar contagens dos contatos naquela etapa via COUNT
  const metricsPromises = sortedSteps.map(async (step: any) => {
    // Buscar contatos que estão NESTA etapa especificamente
    const [
      { count: stepTotal },
      { count: stepSent },
      { count: stepDelivered },
      { count: stepOpened },
      { count: stepClicked },
    ] = await Promise.all([
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true })
        .eq('campaignId', campaignId).eq('currentStepId', step.id),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true })
        .eq('campaignId', campaignId).eq('currentStepId', step.id)
        .in('stepStatus', ['SENT', 'DELIVERED', 'OPENED', 'CLICKED']),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true })
        .eq('campaignId', campaignId).eq('currentStepId', step.id)
        .in('stepStatus', ['DELIVERED', 'OPENED', 'CLICKED']),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true })
        .eq('campaignId', campaignId).eq('currentStepId', step.id)
        .in('stepStatus', ['OPENED', 'CLICKED']),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true })
        .eq('campaignId', campaignId).eq('currentStepId', step.id)
        .eq('stepStatus', 'CLICKED'),
    ]);

    return {
      stepId: step.id,
      stepOrder: step.stepOrder,
      subject: step.subject,
      subjectB: step.subjectB,
      isABTest: step.isABTest,
      delayHours: step.delayHours,
      total: totalContacts,
      sent: stepSent || 0,
      delivered: stepDelivered || 0,
      opened: stepOpened || 0,
      clicked: stepClicked || 0,
      variantA: { sent: stepSent || 0, delivered: stepDelivered || 0, opened: stepOpened || 0, clicked: stepClicked || 0, total: stepTotal || 0 },
      variantB: { sent: 0, delivered: 0, opened: 0, clicked: 0, total: 0 },
    };
  });

  return Promise.all(metricsPromises);
}


export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  
  if (!campaign) notFound();

  const steps = campaign.steps || [];
  
  // 1. Buscar contadores ultra-rápidos (sem baixar os dados)
  const [
    { count: totalCount },
    { count: queuedCount },
    { count: sendingCount },
    { count: sentCount },
    { count: failedCount }
  ] = await Promise.all([
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', id),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', id).in('stepStatus', ['QUEUED', 'PENDING']),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', id).eq('stepStatus', 'SENDING'),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', id).in('stepStatus', ['SENT', 'DELIVERED', 'OPENED', 'CLICKED']),
    supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('campaignId', id).in('stepStatus', ['BOUNCED', 'FAILED']),
  ]);

  // 2. Buscar apenas os 50 contatos mais recentes para a tabela (Paginação visual)
  const { data: recentContacts } = await supabaseAdmin
    .from('CampaignContact')
    .select(`
      *,
      contact:Contact(id, email, name, provider, status),
      currentStep:CampaignStep(stepOrder, subject)
    `)
    .eq('campaignId', id)
    .order('updatedAt', { ascending: false })
    .limit(50);

  // 3. Métricas das etapas (ainda usa fetchAll para precisão nos gráficos, mas limitado a campos leves)
  const stepMetrics = await getStepMetrics(id, steps, totalCount || 0);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      {/* Header */}
      <div className="glass-card !p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-surface-50 tracking-tight">{campaign.name}</h1>
            {campaign.description && <p className="mt-1 text-sm text-surface-500">{campaign.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-surface-500">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {steps.length} etapas</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {totalCount} contatos</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {formatDate(campaign.createdAt)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge 
              status={campaign.status || "DRAFT"} 
              label={CAMPAIGN_STATUS_LABELS[campaign.status as keyof typeof CAMPAIGN_STATUS_LABELS] || campaign.status} 
              size="md" 
              dot 
            />
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {campaign.status === "DRAFT" && (
                <form action={async () => {
                  "use server";
                  await activateCampaign(campaign.id);
                }} className="flex-1 sm:flex-none">
                  <button type="submit" className="btn w-full !bg-emerald-600 !text-white !shadow-emerald-600/20 hover:!bg-emerald-500 text-xs">
                    <Play className="h-3.5 w-3.5" /> Ativar
                  </button>
                </form>
              )}
              {campaign.status === "ACTIVE" && (
                <form action={async () => {
                  "use server";
                  await pauseCampaign(campaign.id);
                }} className="flex-1 sm:flex-none">
                  <button type="submit" className="btn w-full !bg-amber-600 !text-white !shadow-amber-600/20 hover:!bg-amber-500 text-xs">
                    <Pause className="h-3.5 w-3.5" /> Pausar
                  </button>
                </form>
              )}
              {campaign.status === "PAUSED" && (
                <form action={async () => {
                  "use server";
                  await activateCampaign(campaign.id);
                }} className="flex-1 sm:flex-none">
                  <button type="submit" className="btn btn-primary w-full text-xs">
                    <RotateCcw className="h-3.5 w-3.5" /> Retomar
                  </button>
                </form>
              )}
              <Link href={`/?campaign=${campaign.id}`} className="btn btn-secondary text-xs flex-1 sm:flex-none">
                <BarChart3 className="h-3.5 w-3.5" /> Analytics
              </Link>
              <Link href={`/campaigns/${campaign.id}/edit`} className="btn btn-primary !bg-surface-800 !text-surface-100 hover:!bg-surface-700 !border-surface-700 text-xs flex-1 sm:flex-none">
                <Edit2 className="h-3.5 w-3.5" /> Editar
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Barras de Status por Etapa */}
      <div className="glass-card !p-6">
        <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-primary-400" />
          Performance por Etapa
        </h2>
        <div className="space-y-6">
          {stepMetrics.map((metric, idx) => {
            const sentPct = metric.total > 0 ? Math.round((metric.sent / metric.total) * 100) : 0;
            const deliveredPct = metric.total > 0 ? Math.round((metric.delivered / metric.total) * 100) : 0;
            const openedPct = metric.total > 0 ? Math.round((metric.opened / metric.total) * 100) : 0;
            const clickedPct = metric.total > 0 ? Math.round((metric.clicked / metric.total) * 100) : 0;

            return (
              <div key={metric.stepId} className="p-4 rounded-xl bg-surface-900/30 border border-surface-800/30 hover:border-surface-700/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 text-xs font-black">
                    {metric.stepOrder}
                  </div>
                  <div className="flex-1 min-w-0">
                    {metric.isABTest ? (
                      <div className="space-y-1">
                        <h3 className="text-[11px] font-bold text-surface-300 truncate uppercase tracking-widest"><span className="text-primary-500">Var A:</span> {metric.subject || "(Sem Assunto)"}</h3>
                        <h3 className="text-[11px] font-bold text-surface-300 truncate uppercase tracking-widest"><span className="text-emerald-500">Var B:</span> {metric.subjectB || "(Sem Assunto)"}</h3>
                      </div>
                    ) : (
                      <h3 className="text-sm font-bold text-surface-200 truncate">{metric.subject || "(Sem Assunto)"}</h3>
                    )}
                    {idx > 0 && <p className="text-[10px] text-surface-600 mt-1">Delay: {metric.delayHours}h após abertura</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  {!metric.isABTest ? (
                    <>
                      {/* Barra de Envio (Simples) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                            <Send className="h-3 w-3 text-blue-400" /> Enviados
                          </span>
                          <span className="text-[10px] font-mono text-surface-400">{metric.sent}/{metric.total} ({sentPct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-surface-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${sentPct}%`, boxShadow: '0 0 8px rgba(59, 130, 246, 0.3)' }} />
                        </div>
                      </div>

                      {/* Barra de Entrega (Simples) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Entregues
                          </span>
                          <span className="text-[10px] font-mono text-surface-400">{metric.delivered}/{metric.total} ({deliveredPct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-surface-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${deliveredPct}%`, boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)' }} />
                        </div>
                      </div>

                      {/* Barra de Abertura (Simples) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                            <Eye className="h-3 w-3 text-amber-400" /> Aberturas
                          </span>
                          <span className="text-[10px] font-mono text-surface-400">{metric.opened}/{metric.total} ({openedPct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-surface-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${openedPct}%`, boxShadow: '0 0 8px rgba(245, 158, 11, 0.3)' }} />
                        </div>
                      </div>

                      {/* Barra de Cliques (Simples) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                            <MousePointerClick className="h-3 w-3 text-violet-400" /> Cliques
                          </span>
                          <span className="text-[10px] font-mono text-surface-400">{metric.clicked}/{metric.total} ({clickedPct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-surface-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full transition-all duration-1000" style={{ width: `${clickedPct}%`, boxShadow: '0 0 8px rgba(139, 92, 246, 0.3)' }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-6 pt-2 border-t border-surface-800/50 mt-4">
                      {/* Variante A */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-500 mb-2">Métricas Variante A</h4>
                        {(() => {
                          const vSentPct = metric.variantA.total > 0 ? Math.round((metric.variantA.sent / metric.variantA.total) * 100) : 0;
                          const vDelPct = metric.variantA.total > 0 ? Math.round((metric.variantA.delivered / metric.variantA.total) * 100) : 0;
                          const vOpnPct = metric.variantA.total > 0 ? Math.round((metric.variantA.opened / metric.variantA.total) * 100) : 0;
                          return (
                            <>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] uppercase text-surface-500">Enviados</span>
                                  <span className="text-[9px] font-mono text-surface-400">{metric.variantA.sent}/{metric.variantA.total} ({vSentPct}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-800 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${vSentPct}%` }} /></div>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] uppercase text-surface-500">Entregues</span>
                                  <span className="text-[9px] font-mono text-surface-400">{metric.variantA.delivered}/{metric.variantA.total} ({vDelPct}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-800 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${vDelPct}%` }} /></div>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] uppercase text-surface-500">Aberturas</span>
                                  <span className="text-[9px] font-mono text-surface-400">{metric.variantA.opened}/{metric.variantA.total} ({vOpnPct}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-800 rounded-full"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${vOpnPct}%` }} /></div>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Variante B */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Métricas Variante B</h4>
                        {(() => {
                          const vSentPct = metric.variantB.total > 0 ? Math.round((metric.variantB.sent / metric.variantB.total) * 100) : 0;
                          const vDelPct = metric.variantB.total > 0 ? Math.round((metric.variantB.delivered / metric.variantB.total) * 100) : 0;
                          const vOpnPct = metric.variantB.total > 0 ? Math.round((metric.variantB.opened / metric.variantB.total) * 100) : 0;
                          return (
                            <>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] uppercase text-surface-500">Enviados</span>
                                  <span className="text-[9px] font-mono text-surface-400">{metric.variantB.sent}/{metric.variantB.total} ({vSentPct}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-800 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${vSentPct}%` }} /></div>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] uppercase text-surface-500">Entregues</span>
                                  <span className="text-[9px] font-mono text-surface-400">{metric.variantB.delivered}/{metric.variantB.total} ({vDelPct}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-800 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${vDelPct}%` }} /></div>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] uppercase text-surface-500">Aberturas</span>
                                  <span className="text-[9px] font-mono text-surface-400">{metric.variantB.opened}/{metric.variantB.total} ({vOpnPct}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-800 rounded-full"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${vOpnPct}%` }} /></div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {stepMetrics.length === 0 && (
            <div className="py-10 text-center border-2 border-dashed border-surface-800 rounded-2xl">
              <p className="text-xs text-surface-600 uppercase tracking-widest">Sem etapas configuradas</p>
            </div>
          )}
        </div>
      </div>

      {/* Gestão da Fila de Envio */}
      <div className="glass-card !p-6">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-surface-500 flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary-400" />
              Fila de Envio
            </h2>
            <p className="text-[11px] text-surface-600 mt-1">
              Status de cada contato na campanha.
            </p>
          </div>
          <Link href="/contacts" className="btn btn-secondary text-xs self-start sm:self-auto">
            + Adicionar Contatos
          </Link>
        </div>

        {/* Cards de Status da Fila */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400">Na Fila</p>
            <p className="text-2xl font-black text-amber-400 mt-1 tabular-nums">{queuedCount}</p>
            {(queuedCount || 0) > 0 && (
              <p className="text-[9px] text-surface-500 mt-0.5">≈ {Math.ceil((queuedCount || 0) * 1.5) < 60 ? `${Math.ceil((queuedCount || 0) * 1.5)}min` : `${Math.ceil((queuedCount || 0) * 1.5 / 60)}h`}</p>
            )}
          </div>
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">Enviando</p>
            <p className="text-2xl font-black text-blue-400 mt-1 tabular-nums">{sendingCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400">Enviados</p>
            <p className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">{sentCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-400">Falha</p>
            <p className="text-2xl font-black text-red-400 mt-1 tabular-nums">{failedCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-800/30 border border-surface-800/40 col-span-2 lg:col-span-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-surface-400">Total</p>
            <p className="text-2xl font-black text-surface-200 mt-1 tabular-nums">{totalCount}</p>
          </div>
        </div>

        {/* Info do Warmup */}
        {(queuedCount || 0) > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
            <Clock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-400">Sistema de Warmup Ativo</p>
              <p className="text-[11px] text-surface-400 mt-1">
                Para proteger a reputação das suas contas Gmail, os emails são enviados com intervalo de 30 a 120 segundos entre si. 
                Contas novas (🌱) enviam até 20 emails/dia, crescendo progressivamente. Este é o comportamento esperado para evitar spam.
              </p>
            </div>
          </div>
        )}
        
        <div className="mobile-table-wrapper">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-800/40 text-[10px] font-bold uppercase tracking-[0.15em] text-surface-600">
                <th className="pb-3 px-1">Contato</th>
                <th className="pb-3 px-1">Etapa</th>
                <th className="pb-3 px-1">Status</th>
                <th className="pb-3 px-1 hidden sm:table-cell">Provedor</th>
                <th className="pb-3 px-1 hidden sm:table-cell">Enviado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/30 text-surface-300">
              {!recentContacts || recentContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-surface-900 flex items-center justify-center border border-surface-800">
                        <Users className="h-6 w-6 text-surface-700" />
                      </div>
                      <p className="text-sm text-surface-500">Nenhum contato adicionado a esta campanha.</p>
                      <Link href="/contacts" className="text-xs font-bold text-primary-400 hover:text-primary-300">
                        + Adicionar contatos
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                recentContacts.map((cc: any) => {
                  const statusConfig: Record<string, { color: string; label: string; pulse: boolean }> = {
                    'PENDING': { color: 'bg-surface-500', label: 'Pendente', pulse: false },
                    'QUEUED': { color: 'bg-amber-500', label: 'Na Fila', pulse: true },
                    'SENDING': { color: 'bg-blue-500', label: 'Enviando...', pulse: true },
                    'SENT': { color: 'bg-emerald-500', label: 'Enviado', pulse: false },
                    'DELIVERED': { color: 'bg-emerald-500', label: 'Entregue', pulse: false },
                    'OPENED': { color: 'bg-cyan-500', label: 'Aberto', pulse: false },
                    'CLICKED': { color: 'bg-violet-500', label: 'Clicou', pulse: false },
                    'BOUNCED': { color: 'bg-red-500', label: 'Bounce', pulse: false },
                    'FAILED': { color: 'bg-red-500', label: 'Falhou', pulse: false },
                  };
                  const status = statusConfig[cc.stepStatus] || statusConfig['PENDING'];
                  
                  return (
                    <tr key={cc.id} className="group hover:bg-surface-800/20 transition-colors">
                      <td className="py-2.5 px-1">
                        <Link href={`/contacts/${cc.contact?.id}`} className="text-sm font-semibold text-primary-400 hover:text-primary-300 transition-colors">
                          {cc.contact?.email || "—"}
                        </Link>
                        {cc.contact?.name && <p className="text-[10px] text-surface-500">{cc.contact.name}</p>}
                      </td>
                      <td className="py-2.5 px-1">
                        {cc.currentStep ? (
                          <span className="text-xs font-medium">#{cc.currentStep.stepOrder}</span>
                        ) : <span className="text-xs text-surface-600">—</span>}
                      </td>
                      <td className="py-2.5 px-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${status.color} ${status.pulse ? 'animate-dot-pulse' : ''}`} />
                          <span className="text-xs font-semibold">{status.label}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-1 hidden sm:table-cell">
                        <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
                          {cc.contact?.provider || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-1 text-[11px] text-surface-500 hidden sm:table-cell">
                        {cc.lastSentAt ? formatDate(cc.lastSentAt) : (
                          cc.stepStatus === 'QUEUED' ? (
                            <span className="text-amber-400/70 text-[10px]">Warmup...</span>
                          ) : "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
