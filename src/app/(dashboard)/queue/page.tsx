/**
 * Fila Global de Envios — Visão de todas as saídas de email da plataforma.
 * Mostra todos os CampaignContacts de todas as campanhas com status, provedor e timing.
 */
import { supabaseAdmin } from "@/shared/lib/supabase";
import Link from "next/link";
import { Mail, ArrowLeft, RefreshCw, Filter, SendHorizonal, Clock, CheckCircle2, XCircle, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
  });
}

interface QueuePageProps {
  searchParams: Promise<{ status?: string; campaign?: string; page?: string }>;
}

export default async function QueuePage({ searchParams }: QueuePageProps) {
  const params = await searchParams;
  const statusFilter = params.status || "ALL";
  const campaignFilter = params.campaign || "ALL";
  const page = parseInt(params.page || "1", 10);
  const perPage = 50;

  // Buscar campanhas ativas para o filtro
  const { data: campaigns } = await supabaseAdmin
    .from('Campaign')
    .select('id, name, status')
    .in('status', ['ACTIVE', 'PAUSED', 'DRAFT'])
    .order('createdAt', { ascending: false });

  // Query principal: todos os CampaignContacts
  let query = supabaseAdmin
    .from('CampaignContact')
    .select(`
      id,
      stepStatus,
      usedProvider,
      lastSentAt,
      lastOpenedAt,
      createdAt,
      currentStepId,
      campaignId,
      contactId,
      contact:Contact(id, email, name),
      campaign:Campaign(id, name),
      currentStep:CampaignStep(stepOrder, subject)
    `, { count: 'exact' })
    .order('createdAt', { ascending: false });

  // Filtros
  if (statusFilter !== "ALL") {
    if (statusFilter === "QUEUE") {
      query = query.in('stepStatus', ['PENDING', 'QUEUED']);
    } else if (statusFilter === "SENT_OK") {
      query = query.in('stepStatus', ['SENT', 'DELIVERED', 'OPENED', 'CLICKED']);
    } else if (statusFilter === "FAILED") {
      query = query.in('stepStatus', ['BOUNCED', 'FAILED']);
    } else {
      query = query.eq('stepStatus', statusFilter);
    }
  }

  if (campaignFilter !== "ALL") {
    query = query.eq('campaignId', campaignFilter);
  }

  // Paginação
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data: queueItems, count: totalCount } = await query;

  // Contagens globais por status (sem filtros, para os KPIs)
  const { data: allItems } = await supabaseAdmin
    .from('CampaignContact')
    .select('stepStatus');

  const counts = {
    queued: 0, sending: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0, total: 0
  };
  if (allItems) {
    allItems.forEach((item: any) => {
      counts.total++;
      switch (item.stepStatus) {
        case 'PENDING': case 'QUEUED': counts.queued++; break;
        case 'SENDING': counts.sending++; break;
        case 'SENT': counts.sent++; break;
        case 'DELIVERED': counts.delivered++; break;
        case 'OPENED': counts.opened++; break;
        case 'CLICKED': counts.clicked++; break;
        case 'BOUNCED': case 'FAILED': counts.failed++; break;
      }
    });
  }

  const totalPages = Math.ceil((totalCount || 0) / perPage);

  const statusConfig: Record<string, { color: string; label: string; dot: string }> = {
    'PENDING': { color: 'text-surface-500', label: 'Pendente', dot: 'bg-surface-500' },
    'QUEUED': { color: 'text-amber-400', label: 'Na Fila', dot: 'bg-amber-500' },
    'SENDING': { color: 'text-blue-400', label: 'Enviando', dot: 'bg-blue-500' },
    'SENT': { color: 'text-sky-400', label: 'Enviado', dot: 'bg-sky-500' },
    'DELIVERED': { color: 'text-emerald-400', label: 'Entregue', dot: 'bg-emerald-500' },
    'OPENED': { color: 'text-cyan-400', label: 'Aberto', dot: 'bg-cyan-500' },
    'CLICKED': { color: 'text-violet-400', label: 'Clicou', dot: 'bg-violet-500' },
    'BOUNCED': { color: 'text-red-400', label: 'Bounce', dot: 'bg-red-500' },
    'FAILED': { color: 'text-red-400', label: 'Falhou', dot: 'bg-red-500' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-surface-50 tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary-500/10 border border-primary-500/20">
            <SendHorizonal className="h-5 w-5 text-primary-400" />
          </div>
          Fila de Envio
        </h1>
        <p className="mt-1 text-sm text-surface-500">
          Porta de saída — todos os emails de todas as campanhas em tempo real.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {[
          { label: "Na Fila", value: counts.queued, color: "amber", filter: "QUEUE" },
          { label: "Enviando", value: counts.sending, color: "blue", filter: "SENDING" },
          { label: "Enviados", value: counts.sent, color: "sky", filter: "SENT" },
          { label: "Entregues", value: counts.delivered, color: "emerald", filter: "DELIVERED" },
          { label: "Abertos", value: counts.opened, color: "cyan", filter: "OPENED" },
          { label: "Clicaram", value: counts.clicked, color: "violet", filter: "CLICKED" },
          { label: "Falha", value: counts.failed, color: "red", filter: "FAILED" },
        ].map(kpi => (
          <Link
            key={kpi.label}
            href={`/queue?status=${statusFilter === kpi.filter ? 'ALL' : kpi.filter}${campaignFilter !== 'ALL' ? `&campaign=${campaignFilter}` : ''}`}
            className={`p-3 rounded-xl border transition-all hover:scale-[1.02] ${
              statusFilter === kpi.filter
                ? `bg-${kpi.color}-500/10 border-${kpi.color}-500/30`
                : 'bg-surface-900/30 border-surface-800/30 hover:border-surface-700/50'
            }`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-[0.15em] text-${kpi.color}-400`}>{kpi.label}</p>
            <p className={`text-xl font-black mt-1 tabular-nums text-${kpi.color}-400`}>{kpi.value}</p>
          </Link>
        ))}
      </div>

      {/* Filtros */}
      <div className="glass-card !p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-surface-500" />
            <Link
              href={`/queue?status=ALL${campaignFilter !== 'ALL' ? `&campaign=${campaignFilter}` : ''}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'ALL' ? 'bg-primary-500/10 text-primary-400 border border-primary-500/30' : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              Todos ({counts.total})
            </Link>
            <Link
              href={`/queue?status=QUEUE${campaignFilter !== 'ALL' ? `&campaign=${campaignFilter}` : ''}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'QUEUE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              Na Fila
            </Link>
            <Link
              href={`/queue?status=SENT_OK${campaignFilter !== 'ALL' ? `&campaign=${campaignFilter}` : ''}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'SENT_OK' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              Enviados
            </Link>
            <Link
              href={`/queue?status=FAILED${campaignFilter !== 'ALL' ? `&campaign=${campaignFilter}` : ''}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              Falha
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro por campanha */}
            <select
              defaultValue={campaignFilter}
              onChange={() => {}}
              className="bg-surface-900 border border-surface-800 rounded-lg px-3 py-1.5 text-xs text-surface-300 focus:border-primary-500 outline-none"
            >
              <option value="ALL">Todas as campanhas</option>
              {(campaigns || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <Link href="/queue" className="btn btn-secondary text-xs !py-1.5">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Link>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="mobile-table-wrapper">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-800/40 text-[10px] font-bold uppercase tracking-[0.15em] text-surface-600 bg-surface-900/30">
                <th className="py-3 px-4">Contato</th>
                <th className="py-3 px-4">Campanha</th>
                <th className="py-3 px-4 hidden md:table-cell">Etapa</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Provedor</th>
                <th className="py-3 px-4 hidden sm:table-cell">Enviado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/20">
              {(!queueItems || queueItems.length === 0) ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-surface-900 flex items-center justify-center border border-surface-800">
                        <Mail className="h-6 w-6 text-surface-700" />
                      </div>
                      <p className="text-sm text-surface-500">Nenhum email na fila{statusFilter !== 'ALL' ? ` com este filtro` : ''}.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                queueItems.map((item: any) => {
                  const st = statusConfig[item.stepStatus] || statusConfig['PENDING'];
                  const isPulsing = ['QUEUED', 'SENDING', 'PENDING'].includes(item.stepStatus);

                  return (
                    <tr key={item.id} className="group hover:bg-surface-800/15 transition-colors">
                      <td className="py-2.5 px-4">
                        <div>
                          <span className="text-sm font-semibold text-surface-200">{item.contact?.email || "—"}</span>
                          {item.contact?.name && <p className="text-[10px] text-surface-500">{item.contact.name}</p>}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <Link href={`/campaigns/${item.campaign?.id}`} className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors">
                          {item.campaign?.name || "—"}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 hidden md:table-cell">
                        {item.currentStep ? (
                          <div>
                            <span className="text-xs font-medium text-surface-300">#{item.currentStep.stepOrder}</span>
                            <p className="text-[10px] text-surface-600 truncate max-w-[150px]">{item.currentStep.subject}</p>
                          </div>
                        ) : <span className="text-xs text-surface-600">—</span>}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${st.dot} ${isPulsing ? 'animate-dot-pulse' : ''}`} />
                          <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        {item.usedProvider ? (
                          <span className="text-[10px] font-bold text-surface-300 uppercase tracking-wider bg-surface-800/50 px-2 py-0.5 rounded">
                            {item.usedProvider}
                          </span>
                        ) : (
                          <span className="text-[10px] text-surface-600 italic">Aguardando roleta</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 hidden sm:table-cell">
                        <span className="text-[11px] text-surface-500">
                          {item.lastSentAt ? formatDate(item.lastSentAt) : (
                            isPulsing ? (
                              <span className="text-amber-400/70 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Aguardando
                              </span>
                            ) : "—"
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800/30">
            <span className="text-[11px] text-surface-500">
              Mostrando {from + 1}–{Math.min(from + perPage, totalCount || 0)} de {totalCount}
            </span>
            <div className="flex items-center gap-1">
              {page > 1 && (
                <Link href={`/queue?page=${page - 1}&status=${statusFilter}&campaign=${campaignFilter}`} className="btn btn-secondary text-xs !py-1 !px-2">
                  ← Anterior
                </Link>
              )}
              <span className="text-xs text-surface-400 px-2">{page}/{totalPages}</span>
              {page < totalPages && (
                <Link href={`/queue?page=${page + 1}&status=${statusFilter}&campaign=${campaignFilter}`} className="btn btn-secondary text-xs !py-1 !px-2">
                  Próxima →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
