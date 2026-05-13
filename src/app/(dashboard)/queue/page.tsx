/**
 * Fila Global de Envios — Visão de todas as saídas de email da plataforma.
 * Mostra todos os CampaignContacts de todas as campanhas com status, provedor e timing.
 */
import { supabaseAdmin } from "@/shared/lib/supabase";
import Link from "next/link";
import { Mail, RefreshCw, Filter, SendHorizonal, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
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

  try {
    // Buscar campanhas para filtro
    const { data: campaigns } = await supabaseAdmin
      .from('Campaign')
      .select('id, name, status')
      .in('status', ['ACTIVE', 'PAUSED', 'DRAFT'])
      .order('createdAt', { ascending: false });

    // Query principal — buscar CampaignContacts com joins
    let query = supabaseAdmin
      .from('CampaignContact')
      .select('*', { count: 'exact' })
      .order('createdAt', { ascending: false });

    // Filtros de status
    if (statusFilter === "QUEUE") {
      query = query.in('stepStatus', ['PENDING', 'QUEUED']);
    } else if (statusFilter === "SENT_OK") {
      query = query.in('stepStatus', ['SENT', 'DELIVERED', 'OPENED', 'CLICKED']);
    } else if (statusFilter === "FAILED") {
      query = query.in('stepStatus', ['BOUNCED', 'FAILED']);
    } else if (statusFilter !== "ALL") {
      query = query.eq('stepStatus', statusFilter);
    }

    if (campaignFilter !== "ALL") {
      query = query.eq('campaignId', campaignFilter);
    }

    // Paginação
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data: rawItems, count: totalCount, error: queryError } = await query;

    if (queryError) {
      console.error('[Queue] Query error:', queryError);
      throw queryError;
    }

    const queueItems = rawItems || [];

    // Enriquecer com dados de Contact, Campaign e CampaignStep
    const contactIds = [...new Set(queueItems.map(i => i.contactId).filter(Boolean))];
    const campaignIds = [...new Set(queueItems.map(i => i.campaignId).filter(Boolean))];
    const stepIds = [...new Set(queueItems.map(i => i.currentStepId).filter(Boolean))];

    const [contactsRes, campaignsRes, stepsRes] = await Promise.all([
      contactIds.length > 0
        ? supabaseAdmin.from('Contact').select('id, email, name').in('id', contactIds)
        : { data: [] },
      campaignIds.length > 0
        ? supabaseAdmin.from('Campaign').select('id, name').in('id', campaignIds)
        : { data: [] },
      stepIds.length > 0
        ? supabaseAdmin.from('CampaignStep').select('id, stepOrder, subject').in('id', stepIds)
        : { data: [] },
    ]);

    const contactMap = new Map((contactsRes.data || []).map((c: any) => [c.id, c]));
    const campaignMap = new Map((campaignsRes.data || []).map((c: any) => [c.id, c]));
    const stepMap = new Map((stepsRes.data || []).map((s: any) => [s.id, s]));

    // Enriched items
    const items = queueItems.map(item => ({
      ...item,
      contact: contactMap.get(item.contactId) || null,
      campaign: campaignMap.get(item.campaignId) || null,
      currentStep: stepMap.get(item.currentStepId) || null,
    }));

    // Contagens globais por status (via COUNT — sem limite de 1000)
    const [
      { count: cQueued },
      { count: cSending },
      { count: cSent },
      { count: cDelivered },
      { count: cOpened },
      { count: cClicked },
      { count: cFailed },
      { count: cTotal },
    ] = await Promise.all([
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).in('stepStatus', ['PENDING', 'QUEUED']),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('stepStatus', 'SENDING'),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('stepStatus', 'SENT'),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('stepStatus', 'DELIVERED'),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('stepStatus', 'OPENED'),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).eq('stepStatus', 'CLICKED'),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }).in('stepStatus', ['BOUNCED', 'FAILED']),
      supabaseAdmin.from('CampaignContact').select('*', { count: 'exact', head: true }),
    ]);

    const counts = {
      queued: cQueued || 0,
      sending: cSending || 0,
      sent: cSent || 0,
      delivered: cDelivered || 0,
      opened: cOpened || 0,
      clicked: cClicked || 0,
      failed: cFailed || 0,
      total: cTotal || 0,
    };

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

        {/* KPI Cards — classes estáticas para o Tailwind purge */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <Link href={`/queue?status=${statusFilter === 'QUEUE' ? 'ALL' : 'QUEUE'}`}
            className={`p-3 rounded-xl border transition-all hover:scale-[1.02] ${statusFilter === 'QUEUE' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-surface-900/30 border-surface-800/30 hover:border-surface-700/50'}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400">Na Fila</p>
            <p className="text-xl font-black mt-1 tabular-nums text-amber-400">{counts.queued}</p>
          </Link>
          <Link href={`/queue?status=${statusFilter === 'SENDING' ? 'ALL' : 'SENDING'}`}
            className={`p-3 rounded-xl border transition-all hover:scale-[1.02] ${statusFilter === 'SENDING' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-surface-900/30 border-surface-800/30 hover:border-surface-700/50'}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">Enviando</p>
            <p className="text-xl font-black mt-1 tabular-nums text-blue-400">{counts.sending}</p>
          </Link>
          <Link href={`/queue?status=${statusFilter === 'SENT' ? 'ALL' : 'SENT'}`}
            className={`p-3 rounded-xl border transition-all hover:scale-[1.02] ${statusFilter === 'SENT' ? 'bg-sky-500/10 border-sky-500/30' : 'bg-surface-900/30 border-surface-800/30 hover:border-surface-700/50'}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-400">Enviados</p>
            <p className="text-xl font-black mt-1 tabular-nums text-sky-400">{counts.sent}</p>
          </Link>
          <Link href={`/queue?status=${statusFilter === 'DELIVERED' ? 'ALL' : 'DELIVERED'}`}
            className={`p-3 rounded-xl border transition-all hover:scale-[1.02] ${statusFilter === 'DELIVERED' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-surface-900/30 border-surface-800/30 hover:border-surface-700/50'}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400">Entregues</p>
            <p className="text-xl font-black mt-1 tabular-nums text-emerald-400">{counts.delivered}</p>
          </Link>
          <Link href={`/queue?status=${statusFilter === 'OPENED' ? 'ALL' : 'OPENED'}`}
            className={`p-3 rounded-xl border transition-all hover:scale-[1.02] ${statusFilter === 'OPENED' ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-surface-900/30 border-surface-800/30 hover:border-surface-700/50'}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-400">Abertos</p>
            <p className="text-xl font-black mt-1 tabular-nums text-cyan-400">{counts.opened}</p>
          </Link>
          <Link href={`/queue?status=${statusFilter === 'CLICKED' ? 'ALL' : 'CLICKED'}`}
            className={`p-3 rounded-xl border transition-all hover:scale-[1.02] ${statusFilter === 'CLICKED' ? 'bg-violet-500/10 border-violet-500/30' : 'bg-surface-900/30 border-surface-800/30 hover:border-surface-700/50'}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-400">Clicaram</p>
            <p className="text-xl font-black mt-1 tabular-nums text-violet-400">{counts.clicked}</p>
          </Link>
          <Link href={`/queue?status=${statusFilter === 'FAILED' ? 'ALL' : 'FAILED'}`}
            className={`p-3 rounded-xl border transition-all hover:scale-[1.02] ${statusFilter === 'FAILED' ? 'bg-red-500/10 border-red-500/30' : 'bg-surface-900/30 border-surface-800/30 hover:border-surface-700/50'}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-400">Falha</p>
            <p className="text-xl font-black mt-1 tabular-nums text-red-400">{counts.failed}</p>
          </Link>
        </div>

        {/* Filtros */}
        <div className="glass-card !p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-surface-500" />
              <Link href="/queue?status=ALL"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === 'ALL' ? 'bg-primary-500/10 text-primary-400 border border-primary-500/30' : 'text-surface-500 hover:text-surface-300'}`}>
                Todos ({counts.total})
              </Link>
              <Link href="/queue?status=QUEUE"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === 'QUEUE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-surface-500 hover:text-surface-300'}`}>
                Na Fila
              </Link>
              <Link href="/queue?status=SENT_OK"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === 'SENT_OK' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-surface-500 hover:text-surface-300'}`}>
                Enviados
              </Link>
              <Link href="/queue?status=FAILED"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-surface-500 hover:text-surface-300'}`}>
                Falha
              </Link>

              {/* Filtro de Campanha */}
              {campaigns && campaigns.length > 0 && (
                <div className="ml-2 pl-2 border-l border-surface-800/50">
                  <select
                    defaultValue={campaignFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      window.location.href = `/queue?status=${statusFilter}&campaign=${val}`;
                    }}
                    className="bg-surface-900 border border-surface-800 rounded-lg px-2.5 py-1.5 text-xs text-surface-300 focus:border-primary-500 outline-none cursor-pointer"
                  >
                    <option value="ALL">Todas as campanhas</option>
                    {campaigns.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {counts.failed > 0 && (
                <form action={async () => {
                  "use server";
                  const { supabaseAdmin: sb } = await import("@/shared/lib/supabase");
                  await sb
                    .from('CampaignContact')
                    .update({ stepStatus: 'QUEUED', updatedAt: new Date().toISOString() })
                    .in('stepStatus', ['FAILED']);
                }}>
                  <button type="submit" className="btn btn-secondary text-xs !py-1.5 !text-red-400 hover:!bg-red-500/10">
                    <RefreshCw className="h-3 w-3" /> Retry Falhas ({counts.failed})
                  </button>
                </form>
              )}
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
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-surface-900 flex items-center justify-center border border-surface-800">
                          <Mail className="h-6 w-6 text-surface-700" />
                        </div>
                        <p className="text-sm text-surface-500">Nenhum email na fila{statusFilter !== 'ALL' ? ' com este filtro' : ''}.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item: any) => {
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
                          {item.campaign ? (
                            <Link href={`/campaigns/${item.campaign.id}`} className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors">
                              {item.campaign.name}
                            </Link>
                          ) : <span className="text-xs text-surface-600">—</span>}
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
                  <Link href={`/queue?page=${page - 1}&status=${statusFilter}`} className="btn btn-secondary text-xs !py-1 !px-2">
                    ← Anterior
                  </Link>
                )}
                <span className="text-xs text-surface-400 px-2">{page}/{totalPages}</span>
                {page < totalPages && (
                  <Link href={`/queue?page=${page + 1}&status=${statusFilter}`} className="btn btn-secondary text-xs !py-1 !px-2">
                    Próxima →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('[Queue] Page error:', error);
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-50 tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-500/10 border border-primary-500/20">
              <SendHorizonal className="h-5 w-5 text-primary-400" />
            </div>
            Fila de Envio
          </h1>
        </div>
        <div className="glass-card !p-8 text-center">
          <p className="text-surface-400">Não foi possível carregar a fila. Tente novamente em alguns instantes.</p>
          <Link href="/queue" className="btn btn-primary mt-4 inline-flex">
            <RefreshCw className="h-4 w-4" /> Tentar Novamente
          </Link>
        </div>
      </div>
    );
  }
}
