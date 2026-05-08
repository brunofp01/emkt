"use server";

import { supabaseAdmin } from "@/shared/lib/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const providerSchema = z.object({
  id: z.string().optional(),
  provider: z.string().min(1, "O ID do provedor é obrigatório (ex: GMAIL_ATENDIMENTO)"),
  providerType: z.enum(["API_BREVO", "SMTP"]),
  fromEmail: z.string().email("Email de remetente inválido"),
  fromName: z.string().min(1, "Nome do remetente é obrigatório"),
  dailyLimit: z.coerce.number().min(1).default(500),
  weight: z.coerce.number().min(1).default(25),
  accountTier: z.enum(["NOVA", "AQUECIDA", "VETERANA"]).default("NOVA"),
  smtpHost: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpPort: z.coerce.number().optional().default(587),
});

export type ProviderActionState = {
  success?: boolean;
  error?: string;
};

export async function saveProvider(prevState: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  try {
    const rawData = Object.fromEntries(formData.entries());
    const data = providerSchema.parse(rawData);

    if (data.providerType === "SMTP") {
      // Se for novo, senha é obrigatória. Se for edição, pode ser vazia.
      const isNew = !data.id;
      if (!data.smtpHost || !data.smtpUser || (isNew && !data.smtpPass)) {
        throw new Error("Para novos provedores SMTP, Host, Usuário e Senha são obrigatórios.");
      }
    }

    const now = new Date().toISOString();
    const payload: any = {
      provider: data.provider,
      providerType: data.providerType,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
      dailyLimit: data.dailyLimit,
      weight: data.weight,
      accountTier: data.accountTier,
      smtpHost: data.smtpHost || null,
      smtpUser: data.smtpUser || null,
      smtpPort: data.smtpPort || null,
      updatedAt: now,
    };

    // Só atualiza a senha se ela tiver sido informada
    if (data.smtpPass) {
      payload.smtpPass = data.smtpPass;
    }

    if (data.id) {
      // Atualiza
      const { error } = await supabaseAdmin
        .from('ProviderConfig')
        .update(payload)
        .eq('id', data.id);
      
      if (error) throw error;
    } else {
      // Cria novo
      payload.id = crypto.randomUUID();
      const { error } = await supabaseAdmin
        .from('ProviderConfig')
        .insert(payload);
        
      if (error) throw error;
    }

    revalidatePath("/settings/providers");
    revalidatePath("/contacts");
    return { success: true };
  } catch (err) {
    console.error('[saveProvider Error]:', err);
    
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0]?.message || "Dados inválidos.";
      return { error: firstError };
    }
    
    // Erros de banco de dados (ex: Unique constraint)
    if (typeof err === 'object' && err !== null && 'code' in err) {
      if ((err as any).code === '23505') {
        return { error: "Este ID de provedor já está em uso. Por favor, use um nome diferente." };
      }
    }

    return { error: err instanceof Error ? err.message : "Erro ao salvar provedor." };
  }
}

export async function toggleProviderStatus(id: string, currentStatus: boolean): Promise<ProviderActionState> {
  try {
    const { error } = await supabaseAdmin
      .from('ProviderConfig')
      .update({ isActive: !currentStatus, updatedAt: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    revalidatePath("/settings/providers");
    revalidatePath("/contacts");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao alterar status." };
  }
}

export async function deleteProvider(id: string): Promise<ProviderActionState> {
  try {
    const { error } = await supabaseAdmin
      .from('ProviderConfig')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath("/settings/providers");
    revalidatePath("/contacts");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao excluir provedor." };
  }
}
