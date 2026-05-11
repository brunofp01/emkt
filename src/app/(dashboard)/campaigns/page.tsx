export const dynamic = "force-dynamic";

import { getCampaigns } from "@/features/campaigns/lib/queries";
import { CAMPAIGN_STATUS_LABELS } from "@/shared/lib/constants";
import { formatDate } from "@/shared/lib/utils";
import { StatusBadge } from "@/shared/components/status-badge";
import { CampaignActions } from "@/features/campaigns/components/campaign-actions";
import { Mail, Users, Plus } from "lucide-react";
import Link from "next/link";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-50 tracking-tight">Campanhas</h1>
          <p className="mt-1 text-sm text-surface-500">Gerencie suas réguas de prospecção.</p>
        </div>
        <Link href="/campaigns/new" className="btn btn-primary self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Nova Campanha
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <div className="h-14 w-14 rounded-2xl bg-surface-900 flex items-center justify-center border border-surface-800/40 mb-4">
            <Mail className="h-6 w-6 text-surface-600" />
          </div>
          <p className="text-surface-400 font-medium">Nenhuma campanha criada.</p>
          <Link href="/campaigns/new" className="btn btn-primary mt-4 text-xs">
            Criar primeira campanha
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="relative group">
              <Link href={`/campaigns/${campaign.id}`} className="block glass-card !p-5 transition-all hover:border-primary-500/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2 min-w-0">
                    <h3 className="font-semibold text-surface-100 group-hover:text-primary-400 transition-colors truncate">{campaign.name}</h3>
                    {campaign.description && <p className="mt-1 text-xs text-surface-500 line-clamp-1">{campaign.description}</p>}
                  </div>
                  <CampaignActions campaignId={campaign.id} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2.5 text-[10px] text-surface-500">
                  <StatusBadge status={campaign.status} label={CAMPAIGN_STATUS_LABELS[campaign.status as keyof typeof CAMPAIGN_STATUS_LABELS] ?? campaign.status} size="sm" dot />
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{campaign.steps.length} etapas</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{campaign._count.sent} / {campaign._count.campaignContacts} enviados</span>
                </div>
                <p className="mt-3 text-[10px] text-surface-600">{formatDate(campaign.createdAt)}</p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
