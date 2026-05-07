import Link from "next/link";
import { PROVIDER_LABELS, PROVIDER_COLORS, STEP_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/shared/lib/constants";
import { formatDate } from "@/shared/lib/utils";
import { StatusBadge } from "@/shared/components/status-badge";
import { Tag, Building2, User, ChevronRight, Activity, Calendar } from "lucide-react";

interface ContactTableRowProps {
  contact: {
    id: string;
    email: string;
    name: string | null;
    company: string | null;
    provider: string;
    status: string;
    tags: string[];
    createdAt: Date;
    campaignContacts: Array<{
      campaign: { name: string };
      currentStep: { stepOrder: number } | null;
      stepStatus: string;
    }>;
    emailEvents: Array<{ eventType: string; timestamp: Date }>;
  };
}

export function ContactTableRow({ contact }: ContactTableRowProps) {
  const providerLabel = PROVIDER_LABELS[contact.provider as keyof typeof PROVIDER_LABELS] ?? contact.provider;
  const providerColor = PROVIDER_COLORS[contact.provider as keyof typeof PROVIDER_COLORS] ?? "#6b7280";
  const campaign = contact.campaignContacts[0];
  const lastEvent = contact.emailEvents[0];

  // Calcular "Saúde" do Lead baseada em eventos (exemplo simples)
  const health = contact.emailEvents.length > 2 ? 'ACTIVE' : (contact.emailEvents.length > 0 ? 'PAUSED' : 'PENDING');

  return (
    <tr className="group transition-all hover:bg-surface-800/30">
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-800 border border-surface-700 text-surface-500 group-hover:border-primary-500/30 group-hover:bg-primary-500/5 group-hover:text-primary-500 transition-all">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <Link href={`/contacts/${contact.id}`} className="text-sm font-bold text-surface-50 hover:text-primary-400 transition-colors block truncate">
              {contact.email}
            </Link>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {contact.tags?.slice(0, 3).map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-800 text-surface-400 border border-surface-700 text-[9px] font-black uppercase tracking-widest">
                  {tag}
                </span>
              ))}
              {contact.tags?.length > 3 && (
                <span className="text-[9px] font-black text-surface-600">+{contact.tags.length - 3}</span>
              )}
            </div>
          </div>
        </div>
      </td>
      
      <td className="hidden px-6 py-4 md:table-cell">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-surface-600" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-surface-300 truncate">{contact.name ?? "Sem Nome"}</p>
            <p className="text-[10px] text-surface-500 truncate uppercase tracking-wider">{contact.company ?? "—"}</p>
          </div>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-900 border border-surface-800/60">
          <span className="h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: providerColor }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">{providerLabel}</span>
        </div>
      </td>

      <td className="hidden px-6 py-4 lg:table-cell">
        {campaign ? (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-surface-200">{campaign.campaign.name}</p>
              <p className="text-[10px] text-surface-500 uppercase tracking-tighter">
                Etapa {campaign.currentStep?.stepOrder ?? "?"} • {STEP_STATUS_LABELS[campaign.stepStatus as keyof typeof STEP_STATUS_LABELS] ?? campaign.stepStatus}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-surface-700 uppercase tracking-widest italic">Fora de régua</span>
        )}
      </td>

      <td className="px-6 py-4">
        {lastEvent ? (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={lastEvent.eventType} label={EVENT_TYPE_LABELS[lastEvent.eventType as keyof typeof EVENT_TYPE_LABELS] ?? lastEvent.eventType} size="sm" dot />
            <span className="text-[9px] text-surface-600 flex items-center gap-1 ml-1">
              <Calendar className="h-2 w-2" /> {formatDate(lastEvent.timestamp)}
            </span>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-surface-600 uppercase tracking-widest">Nenhuma ação</span>
        )}
      </td>

      <td className="px-6 py-4 text-center">
        <div className="flex justify-center">
          <StatusBadge status={health} label={health === 'ACTIVE' ? 'Quente' : (health === 'PAUSED' ? 'Morno' : 'Frio')} size="sm" dot />
        </div>
      </td>

      <td className="px-6 py-4 text-right">
        <button className="p-2 text-surface-600 hover:text-surface-200 transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </td>
    </tr>
  );
}
