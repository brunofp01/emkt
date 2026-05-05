/**
 * Shared types da aplicação.
 * Tipos inferidos do Prisma + tipos auxiliares.
 */
import type { EmailProvider, EmailEventType, ContactStatus, CampaignStatus, SequenceStepStatus } from "@prisma/client";

export type { EmailProvider, EmailEventType, ContactStatus, CampaignStatus, SequenceStepStatus };

/** Resultado padronizado de envio de email por qualquer provedor */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/** Parâmetros para envio de email (comum a todos os provedores) */
export interface SendEmailParams {
  to: string;
  from: string;
  fromName: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

/** Interface que todo provedor de email deve implementar */
export interface EmailProviderAdapter {
  readonly name: EmailProvider;
  send(params: SendEmailParams): Promise<SendEmailResult>;
}

/** Evento de webhook normalizado (comum a todos os provedores) */
export interface NormalizedWebhookEvent {
  externalId: string;
  messageId: string;
  eventType: EmailEventType;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  clickedUrl?: string;
  bounceReason?: string;
  rawPayload: unknown;
}

/** Dados para criação de contato */
export interface CreateContactInput {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  tags?: string[];
}

/** Dados para criação de campanha */
export interface CreateCampaignInput {
  name: string;
  description?: string;
  steps: CreateCampaignStepInput[];
}

/** Dados para criação de uma etapa da campanha */
export interface CreateCampaignStepInput {
  stepOrder: number;
  subject: string;
  htmlBody: string;
  textBody?: string;
  delayHours?: number;
}

/** Estatísticas do dashboard */
export interface DashboardStats {
  totalContacts: number;
  activeCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplaints: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

/** Estatísticas por provedor */
export interface ProviderStats {
  provider: EmailProvider;
  contacts: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
}
