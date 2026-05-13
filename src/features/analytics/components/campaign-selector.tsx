"use client";

/**
 * CampaignSelector — Dropdown para filtrar o dashboard por campanha.
 */
import { Filter } from "lucide-react";

export function CampaignSelector({
  campaigns,
  currentCampaignId,
}: {
  campaigns: { id: string; name: string; status: string }[];
  currentCampaignId?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Filter className="h-3.5 w-3.5 text-surface-500" />
      <select
        defaultValue={currentCampaignId || "ALL"}
        onChange={(e) => {
          const val = e.target.value;
          window.location.href = val === "ALL" ? "/" : `/?campaign=${val}`;
        }}
        className="bg-surface-900 border border-surface-800 rounded-lg px-3 py-2 text-sm text-surface-300 focus:border-primary-500 outline-none cursor-pointer min-w-[200px]"
      >
        <option value="ALL">📊 Todas as campanhas</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.status === "ACTIVE" ? "🟢" : c.status === "PAUSED" ? "⏸️" : "📝"} {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
