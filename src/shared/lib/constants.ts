/**
 * Constantes da aplicação.
 */

/** Mapeamento de provedores para labels amigáveis */
export const PROVIDER_LABELS = {
  RESEND: "Resend",
  USESEND: "useSend",
  BREVO: "Brevo",
  MAILGUN: "Mailgun",
  GMAIL: "Gmail",
} as const;

/** Cores associadas a cada provedor para o dashboard */
export const PROVIDER_COLORS = {
  RESEND: "#6366f1",   // Indigo
  USESEND: "#8b5cf6",  // Violet
  BREVO: "#06b6d4",    // Cyan
  MAILGUN: "#f43f5e",  // Rose
  GMAIL: "#ea4335",    // Google Red
} as const;

/** Mapeamento de status de contato para labels */
export const CONTACT_STATUS_LABELS = {
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  BOUNCED: "Bounced",
  UNSUBSCRIBED: "Descadastrado",
  COMPLAINED: "Spam",
} as const;

/** Mapeamento de status da régua para labels */
export const STEP_STATUS_LABELS = {
  PENDING: "Pendente",
  QUEUED: "Na fila",
  SENT: "Enviado",
  DELIVERED: "Entregue",
  OPENED: "Aberto",
  CLICKED: "Clicado",
  BOUNCED: "Rejeitado",
  FAILED: "Falhou",
} as const;

/** Mapeamento de tipo de evento para labels */
export const EVENT_TYPE_LABELS = {
  SENT: "Enviado",
  DELIVERED: "Entregue",
  DELIVERY_DELAYED: "Atrasado",
  OPENED: "Aberto",
  CLICKED: "Clicado",
  BOUNCED_SOFT: "Bounce Temp.",
  BOUNCED_HARD: "Bounce Perm.",
  COMPLAINED: "Spam",
  UNSUBSCRIBED: "Descadastrado",
  FAILED: "Falhou",
  REJECTED: "Rejeitado",
} as const;

/** Cores dos eventos para ícones na timeline */
export const EVENT_TYPE_COLORS = {
  SENT: "#3b82f6",
  DELIVERED: "#22c55e",
  DELIVERY_DELAYED: "#f59e0b",
  OPENED: "#8b5cf6",
  CLICKED: "#06b6d4",
  BOUNCED_SOFT: "#f97316",
  BOUNCED_HARD: "#ef4444",
  COMPLAINED: "#dc2626",
  UNSUBSCRIBED: "#6b7280",
  FAILED: "#ef4444",
  REJECTED: "#dc2626",
} as const;

/** Mapeamento de status de campanha */
export const CAMPAIGN_STATUS_LABELS = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  COMPLETED: "Concluída",
} as const;

export const CAMPAIGN_STATUS_COLORS = {
  DRAFT: "#6b7280",
  ACTIVE: "#22c55e",
  PAUSED: "#f59e0b",
  COMPLETED: "#3b82f6",
} as const;
