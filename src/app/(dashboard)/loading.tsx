import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-2 border-primary-500/10 border-t-primary-500 animate-spin" />
        <Loader2 className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-primary-500/50" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-surface-200">Sincronizando dados...</p>
        <p className="text-[10px] uppercase tracking-widest text-surface-500">MailPulse Engine</p>
      </div>
      
      {/* Skeleton Mockup for Layout Stability */}
      <div className="mt-8 w-full max-w-2xl space-y-4 opacity-20 grayscale">
        <div className="h-8 w-1/3 rounded-lg bg-surface-800" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 rounded-xl bg-surface-800" />
          <div className="h-24 rounded-xl bg-surface-800" />
          <div className="h-24 rounded-xl bg-surface-800" />
        </div>
        <div className="h-64 rounded-2xl bg-surface-800" />
      </div>
    </div>
  );
}
