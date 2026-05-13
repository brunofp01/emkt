"use client";

/**
 * CampaignFilterSelect — Dropdown client-side para filtrar por campanha na fila.
 */
export function CampaignFilterSelect({
  campaigns,
  currentStatus,
  currentCampaign,
}: {
  campaigns: { id: string; name: string }[];
  currentStatus: string;
  currentCampaign: string;
}) {
  return (
    <div className="ml-2 pl-2 border-l border-surface-800/50">
      <select
        defaultValue={currentCampaign}
        onChange={(e) => {
          window.location.href = `/queue?status=${currentStatus}&campaign=${e.target.value}`;
        }}
        className="bg-surface-900 border border-surface-800 rounded-lg px-2.5 py-1.5 text-xs text-surface-300 focus:border-primary-500 outline-none cursor-pointer"
      >
        <option value="ALL">Todas as campanhas</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
