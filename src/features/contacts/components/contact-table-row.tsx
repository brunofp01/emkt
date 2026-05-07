import Link from "next/link";
import { PROVIDER_LABELS, PROVIDER_COLORS, STEP_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/shared/lib/constants";
import { formatDate } from "@/shared/lib/utils";
import { StatusBadge } from "@/shared/components/status-badge";
import { Tag } from "lucide-react";

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

  return (
    <tr className="group transition-colors hover:bg-surface-900/50">
      <td className="px-4 py-3 sm:px-6">
        <Link href={`/contacts/${contact.id}`} className="text-sm font-medium text-primary-400 hover:text-primary-300 hover:underline block truncate max-w-[120px] sm:max-w-none">
          {contact.email}
        </Link>
        <div className="mt-1 flex flex-wrap gap-1">
          {contact.tags?.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20 text-[9px] font-bold uppercase tracking-wider">
              <Tag className="h-2 w-2" />
              {tag}
            </span>
          ))}
        </div>
      </td>
      <td className="hidden px-6 py-3 md:table-cell">
        <div>
          <p className="text-sm text-surface-200">{contact.name ?? "—"}</p>
          {contact.company && <p className="text-xs text-surface-500">{contact.company}</p>}
        </div>
      </td>
      <td className="px-4 py-3 sm:px-6">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: providerColor }} />
          <span className="text-surface-300">{providerLabel}</span>
        </span>
      </td>
      <td className="hidden px-6 py-3 lg:table-cell text-sm text-surface-400">
        {campaign ? (
          <div>
            <p className="text-surface-300">{campaign.campaign.name}</p>
            <p className="text-xs text-surface-500">
              Etapa {campaign.currentStep?.stepOrder ?? "?"} — {STEP_STATUS_LABELS[campaign.stepStatus as keyof typeof STEP_STATUS_LABELS] ?? campaign.stepStatus}
            </p>
          </div>
        ) : "—"}
      </td>
      <td className="px-4 py-3 sm:px-6">
        {lastEvent ? (
          <StatusBadge status={lastEvent.eventType} label={EVENT_TYPE_LABELS[lastEvent.eventType as keyof typeof EVENT_TYPE_LABELS] ?? lastEvent.eventType} size="sm" dot />
        ) : <span className="text-sm text-surface-600">—</span>}
      </td>
      <td className="px-4 py-3 sm:px-6 text-center">
        <StatusBadge status={contact.status} label={contact.status} size="sm" dot />
      </td>
      <td className="hidden px-6 py-3 xl:table-cell text-xs text-surface-500">
        {formatDate(contact.createdAt)}
      </td>
    </tr>
  );
}
