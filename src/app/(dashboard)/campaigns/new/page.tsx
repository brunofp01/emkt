"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createCampaign, type CampaignActionState } from "@/features/campaigns/actions/create-campaign";
import { Plus, Trash2, Mail, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface StepData {
  stepOrder: number;
  subject: string;
  htmlBody: string;
  textBody: string;
  delayHours: number;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<StepData[]>([
    { stepOrder: 1, subject: "", htmlBody: "", textBody: "", delayHours: 0 },
  ]);

  const [state, formAction, isPending] = useActionState<CampaignActionState, FormData>(
    createCampaign, {}
  );

  if (state.success) {
    router.push(`/campaigns/${state.campaignId}`);
  }

  const addStep = () => {
    setSteps((prev) => [...prev, {
      stepOrder: prev.length + 1, subject: "", htmlBody: "", textBody: "", delayHours: 0,
    }]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 })));
  };

  const updateStep = (index: number, field: keyof StepData, value: string | number) => {
    setSteps((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const inputClass = "h-10 w-full rounded-lg border border-surface-800 bg-surface-900/50 px-4 text-sm text-surface-200 placeholder:text-surface-600 focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/20";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-surface-400";

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-surface-50">Nova Campanha</h1>
        <p className="mt-1 text-sm text-surface-500">Defina a sequência de emails da régua de prospecção.</p>
      </div>

      {state.error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{state.error}</div>}

      <form action={(fd) => {
        fd.set("steps", JSON.stringify(steps));
        formAction(fd);
      }} className="space-y-6">
        <div className="glass-card p-6 space-y-4">
          <div><label className={labelClass}>Nome da Campanha *</label><input name="name" required placeholder="Prospecção Q1 2026" className={inputClass} /></div>
          <div><label className={labelClass}>Descrição</label><input name="description" placeholder="Campanha de prospecção fria para leads tech" className={inputClass} /></div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-400">Etapas da Sequência</h2>
          {steps.map((step, idx) => (
            <div key={idx} className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/10 text-xs font-bold text-primary-400">{step.stepOrder}</div>
                  <span className="text-sm font-medium text-surface-300">Email {step.stepOrder}</span>
                </div>
                {steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(idx)} className="rounded-lg p-1.5 text-surface-600 hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div><label className={labelClass}>Assunto *</label><input required value={step.subject} onChange={(e) => updateStep(idx, "subject", e.target.value)} placeholder="Olá {{contactName}}, temos algo para você" className={inputClass} /></div>
              <div><label className={labelClass}>Corpo HTML *</label><textarea required value={step.htmlBody} onChange={(e) => updateStep(idx, "htmlBody", e.target.value)} placeholder="<h1>Olá {{contactName}}</h1><p>Texto do email...</p>" rows={5} className="w-full rounded-lg border border-surface-800 bg-surface-900/50 px-4 py-3 text-sm text-surface-200 placeholder:text-surface-600 focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/20 font-mono" /></div>
              {idx > 0 && (
                <div><label className={labelClass}>Delay após abertura (horas)</label><input type="number" min={0} value={step.delayHours} onChange={(e) => updateStep(idx, "delayHours", parseInt(e.target.value) || 0)} className={inputClass} /></div>
              )}
            </div>
          ))}
          <button type="button" onClick={addStep} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-surface-700 py-3 text-sm text-surface-500 hover:border-primary-500/50 hover:text-primary-400 transition-colors">
            <Plus className="h-4 w-4" /> Adicionar Etapa
          </button>
        </div>

        <button type="submit" disabled={isPending} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 text-base font-medium text-white shadow-lg shadow-primary-500/20 hover:bg-primary-500 active:scale-[0.98] disabled:opacity-50">
          {isPending ? <><Loader2 className="h-5 w-5 animate-spin" />Criando...</> : <><Mail className="h-5 w-5" />Criar Campanha</>}
        </button>
      </form>
    </div>
  );
}
