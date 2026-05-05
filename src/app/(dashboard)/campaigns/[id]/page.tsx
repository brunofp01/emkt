import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Pause, Users, Mail, BarChart3, Clock } from "lucide-react";
import { getCampaignById } from "@/features/campaigns/lib/queries";
import { CAMPAIGN_STATUS_LABELS, STEP_STATUS_LABELS } from "@/shared/lib/constants";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDate } from "@/shared/lib/utils";
import { activateCampaign } from "@/features/campaigns/actions/create-campaign";

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  
  if (!campaign) notFound();

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-50">{campaign.name}</h1>
            {campaign.description && <p className="mt-1 text-sm text-surface-400">{campaign.description}</p>}
            <div className="mt-4 flex items-center gap-4 text-sm text-surface-500">
              <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {campaign.steps.length} emails</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {campaign.campaignContacts.length} contatos</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Criada em {formatDate(campaign.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={campaign.status} label={CAMPAIGN_STATUS_LABELS[campaign.status]} size="md" dot />
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
              <button className="flex items-center gap-2 rounded-lg bg-warning px-4 py-2 text-sm font-medium text-white shadow-lg shadow-warning/20 hover:bg-warning/90 active:scale-[0.97]">
                <Pause className="h-4 w-4" /> Pausar
              </button>
            )}
            <Link href={`/campaigns/${campaign.id}/analytics`} className="flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2 text-sm font-medium text-surface-200 hover:bg-surface-700 active:scale-[0.97]">
              <BarChart3 className="h-4 w-4" /> Ver Analytics
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sequence Steps */}
        <div className="glass-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-surface-400">Sequência</h2>
          <div className="relative space-y-0 pl-4">
            <div className="absolute left-[27px] top-4 h-[calc(100%-2rem)] w-px bg-surface-800" />
            {campaign.steps.map((step, idx) => (
              <div key={step.id} className="relative flex gap-4 py-3">
                <div className="relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-900 border-4 border-surface-950 text-xs font-bold text-primary-400">
                  {step.stepOrder}
                </div>
                <div className="flex-1 rounded-lg border border-surface-800/50 bg-surface-900/30 p-3">
                  <h3 className="font-medium text-surface-200">{step.subject}</h3>
                  {idx > 0 && <p className="mt-1 text-xs text-surface-500">Delay: {step.delayHours}h após abertura</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enrolled Contacts */}
        <div className="glass-card p-6 lg:col-span-2">
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
                {campaign.campaignContacts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-surface-500">
                      Nenhum contato adicionado a esta campanha.
                    </td>
                  </tr>
                ) : (
                  campaign.campaignContacts.map((cc) => (
                    <tr key={cc.id} className="group hover:bg-surface-900/30">
                      <td className="py-3">
                        <Link href={`/contacts/${cc.contact.id}`} className="font-medium text-primary-400 hover:underline">
                          {cc.contact.email}
                        </Link>
                        {cc.contact.name && <p className="text-xs text-surface-500">{cc.contact.name}</p>}
                      </td>
                      <td className="py-3">
                        {cc.currentStep ? (
                          <span>Email {cc.currentStep.stepOrder}</span>
                        ) : "Concluído"}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={cc.stepStatus} label={STEP_STATUS_LABELS[cc.stepStatus as keyof typeof STEP_STATUS_LABELS] ?? cc.stepStatus} dot />
                      </td>
                      <td className="py-3 text-xs text-surface-500">
                        {formatDate(cc.updatedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
