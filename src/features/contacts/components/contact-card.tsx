"use client";
import { useState } from "react";
import { Mail, Calendar, Activity, MoreVertical, Edit2, Trash2, Building2, MousePointerClick, Eye, Zap, MessageSquare } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDate } from "@/shared/lib/utils";
import { EVENT_TYPE_LABELS } from "@/shared/lib/constants";
import { createPortal } from "react-dom";
import { ContactForm } from "./contact-form";
import { deleteContact } from "@/features/contacts/actions/create-contact";

interface ContactCardProps {
  contact: any;
  campaigns: any[];
  activeProviders: any[];
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 55%)`;
}

export function ContactCard({ contact, campaigns, activeProviders }: ContactCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const initials = getInitials(contact.name, contact.email);
  const avatarBg = hashColor(contact.email);
  const health = contact.emailEvents.length > 3 ? 'HOT' : (contact.emailEvents.length > 0 ? 'WARM' : 'COLD');
  const lastEvent = contact.emailEvents[0];
  const activeCampaign = contact.campaignContacts[0];

  const handleDelete = async () => {
    if (!confirm(`Deseja excluir ${contact.email}?`)) return;
    setIsDeleting(true);
    try {
      await deleteContact(contact.id);
    } catch {
      alert("Erro ao excluir.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="group relative glass-card !p-0 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary-500/10 hover:border-primary-500/30">
      {/* Top Gradient Health Bar */}
      <div className={`h-1 w-full ${
        health === 'HOT' ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 
        health === 'WARM' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 
        'bg-surface-800'
      }`} />

      <div className="p-5 space-y-4">
        {/* Header: Avatar + Actions */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="relative h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-black text-white/90 shadow-lg"
              style={{ backgroundColor: avatarBg }}
            >
              {initials}
              {/* Pulse indicator for hot leads */}
              {health === 'HOT' && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
              )}
            </div>
            <div className="min-w-0">
              <Link href={`/contacts/${contact.id}`} className="block text-sm font-bold text-surface-50 hover:text-primary-400 transition-colors truncate">
                {contact.email}
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                <Building2 className="h-3 w-3 text-surface-600" />
                <span className="text-[10px] font-medium text-surface-500 truncate">{contact.company || "Pessoa Física"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setShowEditForm(true)}
              className="p-1.5 rounded-lg text-surface-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Campaign Info - Visual Step Progress */}
        {activeCampaign ? (
          <div className="p-3 rounded-xl bg-surface-900/50 border border-surface-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-primary-400 uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="h-3 w-3" /> Campanha Ativa
              </span>
              <span className="text-[9px] font-mono text-surface-600">Etapa {activeCampaign.currentStep?.stepOrder || 1}</span>
            </div>
            <p className="text-[11px] font-semibold text-surface-200 truncate">{activeCampaign.campaign.name}</p>
            {/* Step progress bar */}
            <div className="h-1 w-full bg-surface-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 rounded-full" 
                style={{ width: `${((activeCampaign.currentStep?.stepOrder || 1) / 5) * 100}%` }} 
              />
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl border border-dashed border-surface-800/60 flex items-center justify-center">
            <p className="text-[10px] text-surface-600 font-medium">Fora de campanhas</p>
          </div>
        )}

        {/* Metrics/Events Mini Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Eye className="h-3 w-3" />
            </div>
            <div>
              <p className="text-[9px] text-surface-600 font-bold uppercase">Aberturas</p>
              <p className="text-xs font-bold text-surface-300">{contact.emailEvents.filter((e: any) => e.eventType === 'OPENED').length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
              <MousePointerClick className="h-3 w-3" />
            </div>
            <div>
              <p className="text-[9px] text-surface-600 font-bold uppercase">Cliques</p>
              <p className="text-xs font-bold text-surface-300">{contact.emailEvents.filter((e: any) => e.eventType === 'CLICKED').length}</p>
            </div>
          </div>
        </div>

        {/* Footer: Tags & Last Activity */}
        <div className="pt-4 border-t border-surface-800/40 flex items-center justify-between">
          <div className="flex -space-x-1">
            {contact.tags.slice(0, 3).map((tag: string) => (
              <div key={tag} className="px-1.5 py-0.5 rounded-md bg-surface-800 border border-surface-700 text-[8px] font-black uppercase text-surface-400 tracking-tighter">
                {tag}
              </div>
            ))}
            {contact.tags.length > 3 && (
              <div className="px-1.5 py-0.5 rounded-md bg-surface-900 text-[8px] font-bold text-surface-600">
                +{contact.tags.length - 3}
              </div>
            )}
          </div>
          
          <div className="text-right">
            <p className="text-[8px] font-bold text-surface-600 uppercase">Última Atividade</p>
            <p className="text-[10px] text-surface-400 font-medium">{lastEvent ? formatDate(lastEvent.timestamp) : "Sem dados"}</p>
          </div>
        </div>
      </div>

      {showEditForm && typeof document !== 'undefined' && createPortal(
        <ContactForm 
          onClose={() => setShowEditForm(false)} 
          campaigns={campaigns} 
          activeProviders={activeProviders}
          initialData={{
            id: contact.id,
            email: contact.email,
            name: contact.name,
            company: contact.company,
            phone: contact.phone ?? null,
            tags: contact.tags,
            status: contact.status,
            provider: contact.provider
          }}
        />,
        document.body
      )}
    </div>
  );
}
