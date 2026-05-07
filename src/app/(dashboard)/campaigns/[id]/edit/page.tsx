import { getCampaignById } from "@/features/campaigns/lib/queries";
import { notFound } from "next/navigation";
import CampaignEditorForm from "./campaign-editor-form";

export default async function EditCampaignPage({ params }: { params: { id: string } }) {
  const campaign = await getCampaignById(params.id);

  if (!campaign) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in pb-20">
      <CampaignEditorForm campaign={campaign} />
    </div>
  );
}
