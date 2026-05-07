"use client";

import { Trash2, Edit2, Loader2 } from "lucide-react";
import { deleteCampaign } from "@/features/campaigns/actions/create-campaign";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CampaignActions({ campaignId }: { campaignId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("Tem certeza que deseja excluir esta campanha? Esta ação é irreversível.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteCampaign(campaignId);
      if (result.error) {
        alert(result.error);
      }
    } catch (err) {
      alert("Erro ao excluir campanha.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/campaigns/${campaignId}/edit`);
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={handleEdit}
        className="p-2 rounded-lg bg-surface-800 text-surface-400 hover:text-primary-400 hover:bg-surface-700 transition-all active:scale-95"
        title="Editar Campanha"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button 
        onClick={handleDelete}
        disabled={isDeleting}
        className="p-2 rounded-lg bg-surface-800 text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95 disabled:opacity-50"
        title="Excluir Campanha"
      >
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
