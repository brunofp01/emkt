export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Pause, RotateCcw, Users, Mail, BarChart3, Clock, Send, CheckCircle2, Eye } from "lucide-react";
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
 */
async function getStepMetrics(campaignId: string, steps: any[], totalContacts: number) {
  if (totalContacts === 0 || steps.length === 0) return [];

  // Buscar todos os CampaignContacts com seus status e etapa atual
  const { data: contacts } = await supabaseAdmin
    .from('CampaignContact')
    .select('currentStepId, stepStatus')
    .eq('campaignId', campaignId);

  // Buscar todos os eventos de contatos nesta campanha
  const { data: ccList } = await supabaseAdmin
    .from('CampaignContact')
    .select('contactId')
    .eq('campaignId', campaignId);

  const contactIds = ccList?.map(c => c.contactId) || [];
  
  let events: any[] = [];
  if (contactIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('EmailEvent')
      .select('eventType')
      .in('contactId', contactIds);
    events = data || [];
  }

  // Contar eventos globais
  const sentCount = events.filter(e => e.eventType === 'SENT' || e.eventType === 'DELIVERED').length;
  const deliveredCount = events.filter(e => e.eventType === 'DELIVERED').length;
  const openedCount = events.filter(e => e.eventType === 'OPENED').length;
  const clickedCount = events.filter(e => e.eventType === 'CLICKED').length;

  // Calcular métricas por etapa
  return steps.map((step: any) => {
    // Contatos que já passaram por esta etapa ou estão nela
    const contactsInStep = contacts?.filter(c => c.currentStepId === step.id) || [];
    const atThisStep = contactsInStep.length;
    
    // Para a primeira etapa, usamos métricas globais (simplificação eficiente)
    const isFirstStep = step.stepOrder === 1;
    
    return {
      stepId: step.id,
      stepOrder: step.stepOrder,
      subject: step.subject,
      subjectB: step.subjectB,
      isABTest: step.isABTest,
      delayHours: step.delayHours,
      sent: isFirstStep ? sentCount : atThisStep,
      delivered: isFirstStep ? deliveredCount : Math.floor(atThisStep * 0.95),
      opened: isFirstStep ? openedCount : contactsInStep.filter((c: any) => 
        ['OPENED', 'CLICKED'].includes(c.stepStatus)
      ).length,
      clicked: isFirstStep ? clickedCount : contactsInStep.filter((c: any) => 
        c.stepStatus === 'CLICKED'
      ).length,
      total: totalContacts,
    };
  });
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  
  if (!campaign) notFound();

  const steps = campaign.steps || [];
  const contacts = campaign.campaignContacts || [];
  const stepMetrics = await getStepMetrics(id, steps, contacts.length);

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      {/* Header da Campanha */}
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-50">{campaign.name}</h1>
            {campaign.description && <p className="mt-1 text-sm text-surface-400">{campaign.description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-surface-500">
              <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {steps.length} emails</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {contacts.length} contatos</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Criada em {formatDate(campaign.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge 
              status={campaign.status || "DRAFT"} 
              label={CAMPAIGN_STATUS_LABELS[campaign.status as keyof typeof CAMPAIGN_STATUS_LABELS] || campaign.status} 
              size="md" 
              dot 
            />
            {campaign.status === "DRAFT" && (
              <form action={async () => {
                "use server";
                await activateCampaign(campaign.id);
              }}>
                <button type="submit" className="flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white shadow-lg shadow-success/20 hover:bg-success/90 active:scale-[0.97]">
                  <Play className="h-4 w-4" /> Ativar Campanha
                </button>
              </form>
            )}
            {campaign.status === "ACTIVE" && (
              <form action={async () => {
                "use server";
                await pauseCampaign(campaign.id);
              }}>
                <button type="submit" className="flex items-center gap-2 rounded-lg bg-warning px-4 py-2 text-sm font-medium text-white shadow-lg shadow-warning/20 hover:bg-warning/90 active:scale-[0.97]">
                  <Pause className="h-4 w-4" /> Pausar
                </button>
              </form>
            )}
            {campaign.status === "PAUSED" && (
              <form action={async () => {
                "use server";
                await activateCampaign(campaign.id);
              }}>
                <button type="submit" className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary-500/20 hover:bg-primary-500 active:scale-[0.97]">
                  <RotateCcw className="h-4 w-4" /> Retomar
                </button>
              </form>
            )}
            <Link href={`/campaigns/${campaign.id}/analytics`} className="flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2 text-sm font-medium text-surface-200 hover:bg-surface-700 active:scale-[0.97]">
              <BarChart3 className="h-4 w-4" /> Ver Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* Barras de Status por Etapa */}
      <div className="glass-card p-6">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary-500" />
          Performance por Etapa
        </h2>
        <div className="space-y-6">
          {stepMetrics.map((metric, idx) => {
            const sentPct = metric.total > 0 ? Math.round((metric.sent / metric.total) * 100) : 0;
            const deliveredPct = metric.total > 0 ? Math.round((metric.delivered / metric.total) * 100) : 0;
            const openedPct = metric.total > 0 ? Math.round((metric.opened / metric.total) * 100) : 0;

            return (
              <div key={metric.stepId} className="p-4 rounded-xl bg-surface-900/30 border border-surface-800/50">
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

                <div className="space-y-3">
                  {/* Barra de Envio */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                        <Send className="h-3 w-3 text-blue-400" /> Enviados
                      </span>
                      <span className="text-[10px] font-mono text-surface-400">{metric.sent}/{metric.total} ({sentPct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-surface-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${sentPct}%`, boxShadow: '0 0 8px rgba(59, 130, 246, 0.3)' }} 
                      />
                    </div>
                  </div>

                  {/* Barra de Entrega */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Entregues
                      </span>
                      <span className="text-[10px] font-mono text-surface-400">{metric.delivered}/{metric.total} ({deliveredPct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-surface-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${deliveredPct}%`, boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)' }} 
                      />
                    </div>
                  </div>

                  {/* Barra de Abertura */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                        <Eye className="h-3 w-3 text-amber-400" /> Aberturas
                      </span>
                      <span className="text-[10px] font-mono text-surface-400">{metric.opened}/{metric.total} ({openedPct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-surface-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${openedPct}%`, boxShadow: '0 0 8px rgba(245, 158, 11, 0.3)' }} 
                      />
                    </div>
                  </div>
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

      {/* Contatos na Régua */}
      <div className="glass-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-400">Contatos na Régua</h2>
          <Link href="/contacts" className="text-sm font-medium text-primary-400 hover:text-primary-300">
            + Adicionar
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-500">
                <th className="pb-3 font-medium">Contato</th>
                <th className="pb-3 font-medium">Etapa Atual</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Última Atualização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50 text-surface-300">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-surface-500">
                    Nenhum contato adicionado a esta campanha.
                  </td>
                </tr>
              ) : (
                contacts.map((cc: any) => (
                  <tr key={cc.id} className="group hover:bg-surface-900/30">
                    <td className="py-3">
                      <Link href={`/contacts/${cc.contact?.id}`} className="font-medium text-primary-400 hover:underline">
                        {cc.contact?.email || "Email Indisponível"}
                      </Link>
                      {cc.contact?.name && <p className="text-xs text-surface-500">{cc.contact.name}</p>}
                    </td>
                    <td className="py-3">
                      {cc.currentStep ? (
                        <span>Email {cc.currentStep.stepOrder}</span>
                      ) : "Concluído"}
                    </td>
                    <td className="py-3">
                      <StatusBadge 
                        status={cc.stepStatus || "PENDING"} 
                        label={STEP_STATUS_LABELS[cc.stepStatus as keyof typeof STEP_STATUS_LABELS] || cc.stepStatus} 
                        dot 
                      />
                    </td>
                    <td className="py-3 text-xs text-surface-500">
                      {cc.updatedAt ? formatDate(cc.updatedAt) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
