import { Settings, Shield, Bell, Database, Mail } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Configurações</h1>
        <p className="mt-1 text-sm text-surface-500">Gerencie sua conta e preferências da plataforma.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 text-primary-400">
            <Mail className="h-5 w-5" />
            <h2 className="font-semibold text-surface-100">Provedores de Email</h2>
          </div>
          <p className="text-sm text-surface-400">Configure suas chaves de API do Resend, Brevo ou Mailgun.</p>
          <div className="pt-2">
            <button className="text-sm font-medium text-primary-400 hover:text-primary-300">Configurar Conexões →</button>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 text-primary-400">
            <Shield className="h-5 w-5" />
            <h2 className="font-semibold text-surface-100">Segurança</h2>
          </div>
          <p className="text-sm text-surface-400">Altere sua senha e gerencie sessões ativas.</p>
          <div className="pt-2">
            <button className="text-sm font-medium text-primary-400 hover:text-primary-300">Acessar Segurança →</button>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 text-primary-400">
            <Bell className="h-5 w-5" />
            <h2 className="font-semibold text-surface-100">Notificações</h2>
          </div>
          <p className="text-sm text-surface-400">Escolha quais alertas você deseja receber por email.</p>
          <div className="pt-2">
            <button className="text-sm font-medium text-primary-400 hover:text-primary-300">Preferências →</button>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 text-primary-400">
            <Database className="h-5 w-5" />
            <h2 className="font-semibold text-surface-100">Plano e Faturamento</h2>
          </div>
          <p className="text-sm text-surface-400">Gerencie sua assinatura e veja seu histórico de faturas.</p>
          <div className="pt-2">
            <button className="text-sm font-medium text-primary-400 hover:text-primary-300">Ver Assinatura →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
