import { supabaseAdmin } from "@/shared/lib/supabase";
import { ProviderList } from "@/features/settings/components/providers/provider-list";

export default async function ProvidersPage() {
  const { data: providers, error } = await supabaseAdmin
    .from('ProviderConfig')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error("Error fetching providers:", error);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ProviderList providers={providers || []} />
    </div>
  );
}
