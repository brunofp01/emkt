import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { STEP_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/shared/lib/constants";
import { formatDate } from "@/shared/lib/utils";
import { StatusBadge } from "@/shared/components/status-badge";
import { Building2, Activity, Calendar, MoreHorizontal, Trash2, Edit2, Loader2 } from "lucide-react";
import { deleteContact } from "@/features/contacts/actions/create-contact";
import { ContactForm } from "./contact-form";

interface ContactTableRowProps {
  contact: {
    id: string;
    email: string;
    name: string | null;
    company: string | null;
    phone?: string | null;
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
  campaigns: Array<{ id: string; name: string }>;
  activeProviders: Array<{ id: string; type: string }>;
}

// Generate a consistent color from a string hash
function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 50%, 60%)`;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

export function ContactTableRow({ contact, campaigns, activeProviders }: ContactTableRowProps) {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const campaign = contact.campaignContacts[0];
  const lastEvent = contact.emailEvents[0];
  const avatarColor = hashColor(contact.email);
  const initials = getInitials(contact.name, contact.email);

  const handleDelete = async () => {
    if (!confirm(`Excluir ${contact.email}?`)) return;
    setIsDeleting(true);
    try {
      await deleteContact(contact.id);
    } catch {
      alert("Erro ao excluir contato.");
      setIsDeleting(false);
    }
  };

  const toggleMenu = () => {
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right - 144 + window.scrollX, // 144 is the menu width (w-36)
      });
    }
    setShowMenu(!showMenu);
  };

  const health = contact.emailEvents.length > 2 ? 'ACTIVE' : (contact.emailEvents.length > 0 ? 'PAUSED' : 'PENDING');

  return (
    <>
      <tr className="group transition-colors hover:bg-surface-800/20">
        {/* Contact: Avatar + Email + Tags */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div 
              className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white/90 transition-transform group-hover:scale-105"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <Link href={`/contacts/${contact.id}`} className="text-sm font-semibold text-surface-100 hover:text-primary-400 transition-colors block truncate">
                {contact.email}
              </Link>
              {contact.tags?.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {contact.tags.slice(0, 2).map(tag => (
                    <span 
                      key={tag} 
                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-surface-800/80 text-surface-400 border border-surface-800/40"
                    >
                      {tag}
                    </span>
                  ))}
                  {contact.tags.length > 2 && (
                    <span className="text-[9px] font-semibold text-surface-600">+{contact.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </td>
        
        {/* Company */}
        <td className="hidden md:table-cell px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-3 w-3 text-surface-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-surface-300 truncate">{contact.name ?? "—"}</p>
              <p className="text-[10px] text-surface-500 truncate">{contact.company ?? "—"}</p>
            </div>
          </div>
        </td>

        {/* Provider */}
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-900/60 border border-surface-800/30 text-[10px] font-semibold text-surface-400 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-surface-500" />
            {contact.provider}
          </span>
        </td>

        {/* Campaign engagement */}
        <td className="hidden lg:table-cell px-4 py-3">
          {campaign ? (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/10 text-primary-400">
                <Activity className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-surface-200 truncate">{campaign.campaign.name}</p>
                <p className="text-[10px] text-surface-500">
                  Etapa {campaign.currentStep?.stepOrder ?? "?"} • {STEP_STATUS_LABELS[campaign.stepStatus as keyof typeof STEP_STATUS_LABELS] ?? campaign.stepStatus}
                </p>
              </div>
            </div>
          ) : (
            <span className="text-[10px] text-surface-600 italic">Sem campanha</span>
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          {lastEvent ? (
            <div className="flex flex-col items-start gap-1">
              <StatusBadge status={lastEvent.eventType} label={EVENT_TYPE_LABELS[lastEvent.eventType as keyof typeof EVENT_TYPE_LABELS] ?? lastEvent.eventType} size="sm" dot />
              <span className="text-[9px] text-surface-600 flex items-center gap-1 ml-0.5">
                <Calendar className="h-2.5 w-2.5" /> {formatDate(lastEvent.timestamp)}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-surface-600">—</span>
          )}
        </td>

        {/* Health */}
        <td className="px-4 py-3 text-center">
          <StatusBadge status={health} label={health === 'ACTIVE' ? 'Quente' : (health === 'PAUSED' ? 'Morno' : 'Frio')} size="sm" dot />
        </td>

        {/* Actions menu */}
        <td className="px-4 py-3">
          <div className="relative">
            <button 
              ref={buttonRef}
              onClick={toggleMenu}
              className="p-1.5 rounded-lg text-surface-600 hover:text-surface-300 hover:bg-surface-800/50 transition-all"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            
            {showMenu && typeof document !== 'undefined' && createPortal(
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div 
                  className="fixed z-50 w-36 rounded-xl border border-surface-800/40 bg-surface-900/95 backdrop-blur-xl shadow-2xl py-1 animate-in fade-in zoom-in duration-150"
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  <button 
                    onClick={() => { setShowMenu(false); setShowEditForm(true); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-surface-300 hover:bg-surface-800/60 hover:text-surface-100 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button 
                    onClick={() => { setShowMenu(false); handleDelete(); }}
                    disabled={isDeleting}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                  >
                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Excluir
                  </button>
                </div>
              </>,
              document.body
            )}
          </div>
        </td>
      </tr>
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
    </>
  );
}
