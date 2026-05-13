/**
 * Shared types da aplicação.
 * Tipos definidos manualmente — sem dependência do Prisma.
 */

/** Tipos de evento de email */
export type EmailEventType = 
  | "SENT" 
  | "DELIVERED" 
  | "OPENED" 
  | "CLICKED" 
  | "BOUNCED" 
  | "BOUNCED_SOFT"
  | "BOUNCED_HARD"
  | "COMPLAINED" 
  | "UNSUBSCRIBED"
  | "REJECTED"
  | "DELIVERY_DELAYED"
  | "FAILED";

/** Status do contato */
export type ContactStatus = "ACTIVE" | "UNSUBSCRIBED" | "BOUNCED" | "COMPLAINED";

/** Status da campanha */
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";

/** Status do contato na sequência */
export type SequenceStepStatus = 
  | "PENDING" 
  | "QUEUED" 
  | "SENDING" 
  | "SENT" 
  | "DELIVERED" 
  | "OPENED" 
  | "CLICKED" 
  | "BOUNCED" 
  | "FAILED"
  | "COMPLETED";

/** Resultado padronizado de envio de email por qualquer provedor */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Indica que a conta do provedor foi bloqueada (rate limit permanente) */
  accountBlocked?: boolean;
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
  /** URL de descadastro (List-Unsubscribe) — obrigatório para conformidade RFC 8058 */
  unsubscribeUrl?: string;
  /** ID do contato para gerar Message-ID único */
  contactId?: string;
}

/** Interface que todo provedor de email deve implementar */
export interface EmailProviderAdapter {
  readonly name: string;
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
  provider: string;
  contacts: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
}

/** Configuração de provedor (espelho da tabela ProviderConfig) */
export interface ProviderConfig {
  id: string;
  provider: string;
  providerType: "SMTP" | "API_BREVO" | "API_MAILRELAY" | "API_RESEND" | "API_MAILGUN";
  fromEmail: string;
  fromName: string;
  dailyLimit: number;
  sentToday: number;
  weight: number;
  isActive: boolean;
  accountTier: "NOVA" | "AQUECIDA" | "VETERANA";
  warmupStartedAt: string;
  lastResetAt: string;
  totalSent: number;
  totalBounces: number;
  totalComplaints: number;
}
