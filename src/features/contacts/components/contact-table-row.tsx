"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { STEP_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/shared/lib/constants";
import { formatDate } from "@/shared/lib/utils";
import { StatusBadge } from "@/shared/components/status-badge";
import { Building2, Activity, Calendar, Square, CheckSquare, Edit2 } from "lucide-react";
import { ContactForm } from "./contact-form";

interface ContactTableRowProps {
  contact: any;
  campaigns: any[];
  activeProviders: any[];
  isSelected: boolean;
  onSelect: () => void;
}

export function ContactTableRow({ contact, campaigns, activeProviders, isSelected, onSelect }: ContactTableRowProps) {
  const [showEditForm, setShowEditForm] = useState(false);

  const campaign = contact.campaignContacts[0];
  const lastEvent = contact.emailEvents[0];
  const health = contact.emailEvents.length > 2 ? 'ACTIVE' : (contact.emailEvents.length > 0 ? 'PAUSED' : 'PENDING');

  return (
    <>
      <tr className={`group transition-colors ${isSelected ? 'bg-primary-500/5' : 'hover:bg-surface-800/20'}`}>
        {/* Selection Checkbox */}
        <td className="pl-4 pr-2 py-3">
          <button onClick={onSelect} className="text-surface-600 hover:text-primary-500 transition-colors">
            {isSelected ? <CheckSquare className="h-4 w-4 text-primary-500" /> : <Square className="h-4 w-4" />}
          </button>
        </td>

        {/* Contact info */}
        <td className="px-4 py-3">
          <div className="flex flex-col min-w-0">
            <Link href={`/contacts/${contact.id}`} className="text-sm font-bold text-surface-100 hover:text-primary-400 transition-colors truncate">
              {contact.email}
            </Link>
            {contact.tags?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {contact.tags.map((tag: string) => (
                  <span key={tag} className="px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-surface-800/80 text-surface-500 border border-surface-800/40">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </td>
        
        {/* Company */}
        <td className="hidden md:table-cell px-4 py-3">
          <div className="flex flex-col min-w-0">
            <p className="text-xs font-semibold text-surface-300 truncate">{contact.name || "—"}</p>
            <p className="text-[10px] text-surface-600 truncate">{contact.company || "—"}</p>
          </div>
        </td>

        {/* Provider */}
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-900/60 border border-surface-800/30 text-[9px] font-black text-surface-500 uppercase tracking-widest">
            {contact.provider}
          </span>
        </td>

        {/* Campaign engagement */}
        <td className="hidden lg:table-cell px-4 py-3">
          {campaign ? (
            <div className="flex items-center gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-surface-200 truncate uppercase">{campaign.campaign.name}</p>
                <p className="text-[9px] text-surface-600">
                  Etapa {campaign.currentStep?.stepOrder ?? "?"} • {STEP_STATUS_LABELS[campaign.stepStatus as keyof typeof STEP_STATUS_LABELS] ?? campaign.stepStatus}
                </p>
              </div>
            </div>
          ) : (
            <span className="text-[10px] text-surface-700 italic">Nenhuma</span>
          )}
        </td>

        {/* Status / Health */}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <StatusBadge status={health} label={health === 'ACTIVE' ? 'Quente' : (health === 'PAUSED' ? 'Morno' : 'Frio')} size="sm" dot />
            {lastEvent && (
              <span className="text-[9px] text-surface-600 flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" /> {formatDate(lastEvent.timestamp)}
              </span>
            )}
          </div>
        </td>

        {/* Direct Action Button */}
        <td className="px-4 py-3 text-right">
          <button 
            onClick={() => setShowEditForm(true)}
            className="btn btn-secondary !py-1.5 !px-3 text-[10px] font-bold uppercase tracking-widest hover:bg-primary-500/10 hover:text-primary-400 border-surface-800/60 transition-all"
          >
            <Edit2 className="h-3 w-3 mr-1.5" /> Editar
          </button>
        </td>
      </tr>

      {showEditForm && typeof document !== 'undefined' && createPortal(
        <ContactForm 
          onClose={() => { setShowEditForm(false); }} 
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
    </>
  );
}
