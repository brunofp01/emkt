import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Mail, Eye, MousePointerClick, AlertTriangle } from "lucide-react";
import { getCampaignById, getCampaignAnalytics } from "@/features/campaigns/lib/queries";
import { EVENT_TYPE_LABELS, STEP_STATUS_LABELS } from "@/shared/lib/constants";
import { calcPercentage } from "@/shared/lib/utils";

interface CampaignAnalyticsPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignAnalyticsPage({ params }: CampaignAnalyticsPageProps) {
  const { id } = await params;
  const [campaign, analytics] = await Promise.all([
    getCampaignById(id),
    getCampaignAnalytics(id)
  ]);
  
  if (!campaign) notFound();

  const totalSent = (analytics.eventCounts["SENT"] ?? 0) + (analytics.eventCounts["DELIVERED"] ?? 0);
  const totalOpened = analytics.eventCounts["OPENED"] ?? 0;
  const totalClicked = analytics.eventCounts["CLICKED"] ?? 0;
  const totalBounced = (analytics.eventCounts["BOUNCED_HARD"] ?? 0) + (analytics.eventCounts["BOUNCED_SOFT"] ?? 0);

  const openRate = calcPercentage(totalOpened, totalSent);
  const clickRate = calcPercentage(totalClicked, totalOpened);
  const bounceRate = calcPercentage(totalBounced, totalSent);

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href={`/campaigns/${campaign.id}`} className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300">
        <ArrowLeft className="h-4 w-4" /> Voltar para Campanha
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-surface-50">Analytics: {campaign.name}</h1>
        <p className="mt-1 text-sm text-surface-500">Métricas de engajamento da régua.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-6 border-l-4 border-primary-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-surface-400">Contatos na Régua</h3>
            <Users className="h-5 w-5 text-primary-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-surface-50">{analytics.totalContacts}</p>
        </div>
        
        <div className="glass-card p-6 border-l-4 border-violet-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-surface-400">Taxa de Abertura</h3>
            <Eye className="h-5 w-5 text-violet-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-surface-50">{openRate}%</p>
          <p className="mt-1 text-xs text-surface-500">{totalOpened} aberturas</p>
        </div>

        <div className="glass-card p-6 border-l-4 border-cyan-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-surface-400">Taxa de Cliques (CTR)</h3>
            <MousePointerClick className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-surface-50">{clickRate}%</p>
          <p className="mt-1 text-xs text-surface-500">{totalClicked} cliques</p>
        </div>

        <div className="glass-card p-6 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-surface-400">Bounce Rate</h3>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-surface-50">{bounceRate}%</p>
          <p className="mt-1 text-xs text-surface-500">{totalBounced} rejeições</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-surface-400">
            Funil da Régua
          </h2>
          <div className="space-y-4">
            {Object.entries(analytics.statusCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => {
                const percentage = calcPercentage(count, analytics.totalContacts);
                return (
                  <div key={status}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-surface-300">{STEP_STATUS_LABELS[status as keyof typeof STEP_STATUS_LABELS] ?? status}</span>
                      <span className="text-surface-400">{count} contatos ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-800">
                      <div 
                        className="h-full rounded-full bg-primary-500" 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-surface-400">
            Eventos Totais
          </h2>
          <div className="space-y-3">
             {Object.entries(analytics.eventCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([event, count]) => (
                <div key={event} className="flex items-center justify-between rounded-lg border border-surface-800/50 bg-surface-900/30 p-3">
                  <span className="text-sm text-surface-300">{EVENT_TYPE_LABELS[event as keyof typeof EVENT_TYPE_LABELS] ?? event}</span>
                  <span className="font-semibold text-surface-100">{count}</span>
                </div>
              ))}
              {Object.keys(analytics.eventCounts).length === 0 && (
                <p className="text-center text-sm text-surface-500 py-4">Nenhum evento registrado ainda.</p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
