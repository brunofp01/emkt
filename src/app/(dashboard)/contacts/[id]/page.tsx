import { notFound } from "next/navigation";
import { getContactById } from "@/features/contacts/lib/queries";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, STEP_STATUS_LABELS } from "@/shared/lib/constants";
import { formatDate, formatRelativeDate } from "@/shared/lib/utils";
import { StatusBadge } from "@/shared/components/status-badge";
import { ArrowLeft, Mail, Clock, Globe, MousePointerClick, Monitor } from "lucide-react";
import Link from "next/link";

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params;
  
  let contact;
  try {
    contact = await getContactById(id);
  } catch {
    return (
      <div className="space-y-6 animate-fade-in">
        <Link href="/contacts" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="glass-card p-8 text-center">
          <p className="text-surface-400">Não foi possível carregar os dados do contato.</p>
          <Link href={`/contacts/${id}`} className="btn btn-primary mt-4 inline-flex text-sm">Tentar novamente</Link>
        </div>
      </div>
    );
  }
  if (!contact) notFound();

  const providerLabel = contact.provider;
  const providerColor = "#3b82f6";

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/contacts" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      {/* Contact Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-surface-50">{contact.name ?? contact.email}</h1>
            <p className="mt-1 text-sm text-surface-400">{contact.email}</p>
            {contact.company && <p className="text-sm text-surface-500">{contact.company}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-surface-800 px-3 py-1.5 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: providerColor }} />
              {providerLabel}
            </span>
            <StatusBadge status={contact.status} label={contact.status} size="md" dot />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Campaign Status */}
        <div className="glass-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-surface-400">Campanhas</h2>
          {contact.campaignContacts.length === 0 ? (
            <p className="text-sm text-surface-500">Nenhuma campanha associada.</p>
          ) : (
            <div className="space-y-3">
              {(contact.campaignContacts || []).map((cc: any) => (
                <div key={cc.id} className="rounded-lg border border-surface-800/50 bg-surface-900/30 p-3">
                  <p className="font-medium text-surface-200">{cc.campaign.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-surface-500">
                    <span>Etapa {cc.currentStep?.stepOrder ?? "—"}</span>
                    <span>•</span>
                    <StatusBadge status={cc.stepStatus} label={STEP_STATUS_LABELS[cc.stepStatus as keyof typeof STEP_STATUS_LABELS] ?? cc.stepStatus} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Event Timeline */}
        <div className="glass-card p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-surface-400">
            <Clock className="mr-2 inline h-4 w-4" /> Timeline de Eventos
          </h2>
          {contact.emailEvents.length === 0 ? (
            <p className="text-sm text-surface-500">Nenhum evento registrado.</p>
          ) : (
            <div className="relative space-y-0">
              <div className="absolute left-3 top-0 h-full w-px bg-surface-800" />
              {(contact.emailEvents || []).map((event: any) => {
                const color = EVENT_TYPE_COLORS[event.eventType as keyof typeof EVENT_TYPE_COLORS] ?? "#6b7280";
                const label = EVENT_TYPE_LABELS[event.eventType as keyof typeof EVENT_TYPE_LABELS] ?? event.eventType;
                return (
                  <div key={event.id} className="relative flex gap-4 py-3 pl-8">
                    <div className="absolute left-1.5 top-4 h-3 w-3 rounded-full border-2 border-surface-950" style={{ backgroundColor: color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color }}>{label}</span>
                        <span className="text-xs text-surface-600">{formatRelativeDate(event.timestamp)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-surface-500">
                        {event.ip && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{event.ip}</span>}
                        {event.userAgent && <span className="flex items-center gap-1"><Monitor className="h-3 w-3" />{event.userAgent.substring(0, 40)}...</span>}
                        {event.clickedUrl && <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{event.clickedUrl}</span>}
                        {event.bounceReason && <span className="text-red-400">{event.bounceReason}</span>}
                      </div>
                      <p className="mt-0.5 text-[10px] text-surface-600">{formatDate(event.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
