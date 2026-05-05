/**
 * Server Actions — CRUD de contatos.
 * 
 * Inclui a lógica de vínculo automático de provedor no cadastro.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/shared/lib/prisma";
import { selectProviderForNewContact } from "@/features/email/lib/provider-selector";

/** Schema de validação para criação de contato */
const createContactSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/** Schema de validação para atualização de contato */
const updateContactSchema = z.object({
  id: z.string().cuid(),
  name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "BOUNCED", "UNSUBSCRIBED", "COMPLAINED"]).optional(),
});

export type CreateContactState = {
  success?: boolean;
  error?: string;
  contactId?: string;
};

/**
 * Cria um novo contato e vincula automaticamente um provedor de email.
 * 
 * Fluxo:
 * 1. Valida os dados de entrada com Zod
 * 2. Verifica se o email já existe
 * 3. Seleciona o provedor via weighted round-robin
 * 4. Cria o contato com provedor permanentemente vinculado
 */
export async function createContact(
  _prevState: CreateContactState,
  formData: FormData
): Promise<CreateContactState> {
  try {
    const rawData = {
      email: formData.get("email") as string,
      name: (formData.get("name") as string) || undefined,
      company: (formData.get("company") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      tags: formData.get("tags")
        ? (formData.get("tags") as string).split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    };

    // 1. Validação
    const validated = createContactSchema.parse(rawData);

    // 2. Verificar duplicidade
    const existing = await prisma.contact.findUnique({
      where: { email: validated.email },
    });
    if (existing) {
      return { error: "Este email já está cadastrado." };
    }

    // 3. Selecionar provedor (CHAVE do sistema)
    const selectedProvider = await selectProviderForNewContact();

    // 4. Criar contato com provedor vinculado
    const contact = await prisma.contact.create({
      data: {
        email: validated.email,
        name: validated.name,
        company: validated.company,
        phone: validated.phone,
        tags: validated.tags ?? [],
        provider: selectedProvider,
      },
    });

    revalidatePath("/contacts");
    revalidatePath("/");

    return { success: true, contactId: contact.id };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: (err as any).errors[0]?.message ?? "Dados inválidos." };
    }
    const message = err instanceof Error ? err.message : "Erro ao criar contato.";
    return { error: message };
  }
}

/**
 * Atualiza um contato existente.
 * O provedor NÃO pode ser alterado (regra de negócio).
 */
export async function updateContact(
  _prevState: CreateContactState,
  formData: FormData
): Promise<CreateContactState> {
  try {
    const rawData = {
      id: formData.get("id") as string,
      name: (formData.get("name") as string) || undefined,
      company: (formData.get("company") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      status: (formData.get("status") as string) || undefined,
      tags: formData.get("tags")
        ? (formData.get("tags") as string).split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    };

    const validated = updateContactSchema.parse(rawData);

    await prisma.contact.update({
      where: { id: validated.id },
      data: {
        name: validated.name,
        company: validated.company,
        phone: validated.phone,
        status: validated.status,
        tags: validated.tags,
      },
    });

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${validated.id}`);

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: (err as any).errors[0]?.message ?? "Dados inválidos." };
    }
    const message = err instanceof Error ? err.message : "Erro ao atualizar contato.";
    return { error: message };
  }
}

/**
 * Remove um contato e todos os seus dados relacionados.
 */
export async function deleteContact(contactId: string): Promise<CreateContactState> {
  try {
    await prisma.contact.delete({
      where: { id: contactId },
    });

    revalidatePath("/contacts");
    revalidatePath("/");

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao deletar contato.";
    return { error: message };
  }
}
