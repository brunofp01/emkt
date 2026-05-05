export const dynamic = "force-dynamic";

import { getCampaigns } from "@/features/campaigns/lib/queries";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS } from "@/shared/lib/constants";
import { formatDate } from "@/shared/lib/utils";
import { StatusBadge } from "@/shared/components/status-badge";
import { Mail, Users, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Campanhas</h1>
          <p className="mt-1 text-sm text-surface-500">Gerencie suas réguas de prospecção.</p>
        </div>
        <Link href="/campaigns/new" className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-500/20 hover:bg-primary-500 active:scale-[0.97]">
          <Plus className="h-4 w-4" /> Nova Campanha
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <Mail className="h-12 w-12 text-surface-700" />
          <p className="mt-4 text-surface-500">Nenhuma campanha criada ainda.</p>
          <Link href="/campaigns/new" className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500">
            Criar primeira campanha
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="glass-card group p-5 transition-all hover:scale-[1.01]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-surface-100 group-hover:text-primary-400 transition-colors">{campaign.name}</h3>
                  {campaign.description && <p className="mt-1 text-xs text-surface-500 line-clamp-2">{campaign.description}</p>}
                </div>
                <ChevronRight className="h-5 w-5 text-surface-600 group-hover:text-primary-400 transition-colors" />
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs text-surface-500">
                <StatusBadge status={campaign.status} label={CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status} size="sm" dot />
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{campaign.steps.length} etapas</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{campaign._count.campaignContacts} contatos</span>
              </div>
              <p className="mt-3 text-[10px] text-surface-600">Criada em {formatDate(campaign.createdAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
