import { Zap } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[500px] w-full flex-col items-center justify-center space-y-6 animate-fade-in">
      {/* Branded loader */}
      <div className="relative">
        <div className="h-14 w-14 rounded-2xl border-2 border-primary-500/20 border-t-primary-500 animate-spin-slow" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-400" />
          </div>
        </div>
      </div>
      
      <div className="space-y-1.5 text-center">
        <p className="text-sm font-semibold text-surface-200">Carregando dados...</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-surface-600">MailPulse Engine</p>
      </div>
      
      {/* Skeleton that mimics real layout */}
      <div className="mt-6 w-full max-w-3xl space-y-5 opacity-[0.15]">
        <div className="h-7 w-48 rounded-lg skeleton" />
        <div className="dashboard-grid">
          <div className="h-28 rounded-2xl skeleton" />
          <div className="h-28 rounded-2xl skeleton" />
          <div className="h-28 rounded-2xl skeleton" />
          <div className="h-28 rounded-2xl skeleton" />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="h-64 rounded-2xl skeleton" />
          <div className="h-64 rounded-2xl skeleton" />
        </div>
      </div>
    </div>
  );
}
