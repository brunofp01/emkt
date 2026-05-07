"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createCampaign, type CampaignActionState } from "@/features/campaigns/actions/create-campaign";
import { Plus, Trash2, Mail, Loader2, ArrowLeft, Layout, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { EmailVisualEditor } from "@/features/campaigns/components/email-visual-editor";

interface StepData {
  stepOrder: number;
  subject: string;
  htmlBody: string;
  textBody: string;
  design: any;
  conditions: any;
  delayHours: number;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<StepData[]>([
    { stepOrder: 1, subject: "", htmlBody: "", textBody: "", design: null, delayHours: 0 },
  ]);

  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  const [state, formAction, isPending] = useActionState<CampaignActionState, FormData>(
    createCampaign, {}
  );

  if (state.success) {
    router.push(`/campaigns/${state.campaignId}`);
  }

  const addStep = () => {
    setSteps((prev) => [...prev, {
      stepOrder: prev.length + 1, subject: "", htmlBody: "", textBody: "", design: null, delayHours: 0,
    }]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 })));
  };

  const updateStep = (index: number, field: keyof StepData, value: any) => {
    setSteps((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleSaveDesign = (html: string, design: any) => {
    if (editingStepIndex !== null) {
      updateStep(editingStepIndex, "htmlBody", html);
      updateStep(editingStepIndex, "design", design);
      setEditingStepIndex(null);
    }
  };

  const inputClass = "h-10 w-full rounded-lg border border-surface-800 bg-surface-900/50 px-4 text-sm text-surface-200 placeholder:text-surface-600 focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/20";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-surface-400";

  // Se estiver editando visualmente, mostra apenas o editor
  if (editingStepIndex !== null) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-950 p-4 md:p-8 animate-in fade-in zoom-in duration-300">
        <EmailVisualEditor
          initialDesign={steps[editingStepIndex].design}
          onSave={handleSaveDesign}
          onCancel={() => setEditingStepIndex(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in pb-20">
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-50">Nova Campanha</h1>
          <p className="mt-1 text-sm text-surface-500">
            Arquitete sua régua de prospecção com design de nível mundial.
          </p>
        </div>
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <form action={(fd) => {
        fd.set("steps", JSON.stringify(steps));
        formAction(fd);
      }} className="space-y-8">
        {/* Basic Info */}
        <div className="glass-card p-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className={labelClass}>Nome da Campanha *</label>
              <input 
                name="name" 
                required 
                placeholder="Ex: Prospecção Imobiliária 2026" 
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass}>Descrição</label>
              <input 
                name="description" 
                placeholder="Breve descrição interna" 
                className={inputClass} 
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-400">
              Fluxo de Emails
            </h2>
          </div>

          {steps.map((step, idx) => (
            <div key={idx} className="glass-card relative overflow-hidden group">
              {/* Progress Line */}
              <div className="absolute left-0 top-0 h-full w-1 bg-primary-500/30 group-hover:bg-primary-500 transition-colors" />
              
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/10 text-sm font-bold text-primary-400 border border-primary-500/20">
                      {step.stepOrder}
                    </div>
                    <span className="text-base font-semibold text-surface-100">Etapa {step.stepOrder}</span>
                  </div>
                  {steps.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeStep(idx)} 
                      className="rounded-lg p-2 text-surface-600 hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-8">
                    <label className={labelClass}>Assunto do Email *</label>
                    <input 
                      required 
                      value={step.subject} 
                      onChange={(e) => updateStep(idx, "subject", e.target.value)} 
                      placeholder="Use {{contactName}} para personalizar" 
                      className={inputClass} 
                    />
                  </div>
                  <div className="lg:col-span-4">
                    <label className={labelClass}>Aguardar (Horas)</label>
                    <input 
                      type="number" 
                      min={0} 
                      value={step.delayHours} 
                      disabled={idx === 0}
                      onChange={(e) => updateStep(idx, "delayHours", parseInt(e.target.value) || 0)} 
                      className={`${inputClass} disabled:opacity-30`} 
                    />
                  </div>
                </div>

                {/* Intelligent Branching Logic */}
                <div className="rounded-xl bg-surface-900/50 border border-surface-800 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-surface-400">Lógica de Automação</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-surface-300">
                    <span>Se o contato</span>
                    <div className="px-3 py-1 bg-surface-800 rounded border border-surface-700 text-primary-400 font-bold text-xs uppercase">Clicar em um link</div>
                    <span>pular para a etapa</span>
                    <select
                      value={step.conditions?.[0]?.nextStepOrder || ""}
                      onChange={(e) => {
                        const nextOrder = parseInt(e.target.value);
                        const newConditions: any[] | null = nextOrder ? [{ on: "CLICKED", nextStepOrder: nextOrder }] : null;
                        updateStep(idx, "conditions", newConditions);
                      }}
                      className="bg-surface-800 border border-surface-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-primary-500"
                    >
                      <option value="">Próxima Etapa (Padrão)</option>
                      {steps.map((_, sIdx) => sIdx + 1 > step.stepOrder && (
                        <option key={sIdx} value={sIdx + 1}>Etapa {sIdx + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Email Design Action */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingStepIndex(idx)}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-surface-800 border border-surface-700 px-6 py-3 text-sm font-bold text-surface-100 hover:bg-surface-700 hover:border-primary-500/50 transition-all active:scale-[0.98]"
                  >
                    <Layout className="h-4 w-4 text-primary-400" />
                    {step.design ? 'Editar Design Visual' : 'Abrir Editor Visual'}
                  </button>
                  
                  {step.design ? (
                    <span className="flex items-center gap-2 text-xs font-medium text-success-400">
                      <CheckCircle2 className="h-4 w-4" /> Design Concluído
                    </span>
                  ) : (
                    <span className="text-xs text-surface-500 italic">
                      Nenhum design criado para esta etapa ainda.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button 
            type="button" 
            onClick={addStep} 
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-surface-800 py-6 text-sm font-medium text-surface-500 hover:border-primary-500/30 hover:bg-primary-500/5 hover:text-primary-400 transition-all group"
          >
            <div className="rounded-full bg-surface-800 p-1 group-hover:bg-primary-500/20 transition-all">
              <Plus className="h-5 w-5" />
            </div>
            Adicionar Próxima Etapa à Régua
          </button>
        </div>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-950/80 backdrop-blur-md border-t border-surface-800 py-4 px-6">
          <div className="mx-auto max-w-4xl flex justify-end">
            <button 
              type="submit" 
              disabled={isPending || steps.some(s => !s.design || !s.subject)} 
              className="flex items-center justify-center gap-3 rounded-lg bg-primary-600 px-8 py-3 text-base font-bold text-white shadow-xl shadow-primary-600/20 hover:bg-primary-500 active:scale-[0.98] disabled:opacity-50 disabled:grayscale transition-all"
            >
              {isPending ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Salvando...</>
              ) : (
                <><Mail className="h-5 w-5" /> Salvar Campanha Profissional</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
