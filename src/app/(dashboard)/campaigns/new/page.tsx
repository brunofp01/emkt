"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCampaign, type CampaignActionState } from "@/features/campaigns/actions/create-campaign";
import { Plus, Trash2, Mail, Loader2, ArrowLeft, Layout, CheckCircle2, Split, Info } from "lucide-react";
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
  // A/B Testing Fields
  isABTest: boolean;
  subjectB: string;
  htmlBodyB: string;
  designB: any;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<StepData[]>([
    { 
      stepOrder: 1, subject: "", htmlBody: "", textBody: "", design: null, conditions: null, delayHours: 0,
      isABTest: false, subjectB: "", htmlBodyB: "", designB: null
    },
  ]);

  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editingVariant, setEditingVariant] = useState<"A" | "B">("A");

  const [state, formAction, isPending] = useActionState<CampaignActionState, FormData>(
    createCampaign, {}
  );

  useEffect(() => {
    if (state.success) {
      router.push(`/campaigns/${state.campaignId}`);
    }
  }, [state.success, state.campaignId, router]);

  const addStep = () => {
    setSteps((prev) => [...prev, {
      stepOrder: prev.length + 1, subject: "", htmlBody: "", textBody: "", design: null, conditions: null, delayHours: 0,
      isABTest: false, subjectB: "", htmlBodyB: "", designB: null
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
      if (editingVariant === "A") {
        updateStep(editingStepIndex, "htmlBody", html);
        updateStep(editingStepIndex, "design", design);
      } else {
        updateStep(editingStepIndex, "htmlBodyB", html);
        updateStep(editingStepIndex, "designB", design);
      }
      setEditingStepIndex(null);
    }
  };

  const inputClass = "h-10 w-full rounded-lg border border-surface-800 bg-surface-900/50 px-4 text-sm text-surface-200 placeholder:text-surface-600 focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/20";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-surface-400";

  if (editingStepIndex !== null) {
    const currentStep = steps[editingStepIndex];
    return (
      <div className="fixed inset-0 z-50 bg-surface-950 p-4 md:p-8 animate-in fade-in zoom-in duration-300">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-surface-50">
            Editando Design: {editingVariant === "A" ? "Versão A" : "Versão B"} (Etapa {currentStep.stepOrder})
          </h2>
        </div>
        <EmailVisualEditor
          initialDesign={editingVariant === "A" ? currentStep.design : currentStep.designB}
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
          <p className="mt-1 text-sm text-surface-500">Arquitete sua régua de prospecção com design de nível mundial.</p>
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
        <div className="glass-card p-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className={labelClass}>Nome da Campanha *</label>
              <input name="name" required placeholder="Ex: Prospecção Imobiliária 2026" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Descrição</label>
              <input name="description" placeholder="Breve descrição interna" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-400">Fluxo de Emails</h2>

          {steps.map((step, idx) => (
            <div key={idx} className="glass-card relative overflow-hidden group">
              <div className="absolute left-0 top-0 h-full w-1 bg-primary-500/30 group-hover:bg-primary-500 transition-colors" />
              
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/10 text-sm font-bold text-primary-400 border border-primary-500/20">{step.stepOrder}</div>
                    <span className="text-base font-semibold text-surface-100">Etapa {step.stepOrder}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateStep(idx, "isABTest", !step.isABTest)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${step.isABTest ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-surface-800 border-surface-700 text-surface-500 hover:text-surface-300'}`}
                    >
                      <Split className="h-3 w-3" /> {step.isABTest ? "A/B Ativo" : "Ativar Teste A/B"}
                    </button>
                    {steps.length > 1 && (
                      <button type="button" onClick={() => removeStep(idx)} className="rounded-lg p-2 text-surface-600 hover:bg-red-500/10 hover:text-red-400 transition-all">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Versão A */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-surface-500 uppercase tracking-[0.2em]">
                    <span>Variante A (Controle)</span>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                      <label className={labelClass}>Assunto Variante A *</label>
                      <input required value={step.subject} onChange={(e) => updateStep(idx, "subject", e.target.value)} placeholder="Assunto versão A" className={inputClass} />
                    </div>
                    <div className="lg:col-span-4">
                      <label className={labelClass}>Aguardar (Horas)</label>
                      <input type="number" min={0} value={step.delayHours} disabled={idx === 0} onChange={(e) => updateStep(idx, "delayHours", parseInt(e.target.value) || 0)} className={`${inputClass} disabled:opacity-30`} />
                    </div>
                  </div>
                  <button type="button" onClick={() => { setEditingVariant("A"); setEditingStepIndex(idx); }} className="flex items-center gap-2 text-xs font-bold text-primary-400 hover:text-primary-300">
                    <Layout className="h-3 w-3" /> {step.design ? 'Editar Design A' : 'Criar Design A'}
                  </button>
                </div>

                {/* Versão B (Condicional) */}
                {step.isABTest && (
                  <div className="pt-6 border-t border-surface-800/50 space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">
                      <Split className="h-3 w-3" /> Variante B (Desafiante)
                    </div>
                    <div className="grid gap-6">
                      <div>
                        <label className={labelClass}>Assunto Variante B *</label>
                        <input required value={step.subjectB} onChange={(e) => updateStep(idx, "subjectB", e.target.value)} placeholder="Assunto diferente para testar performance" className={inputClass} />
                      </div>
                    </div>
                    <button type="button" onClick={() => { setEditingVariant("B"); setEditingStepIndex(idx); }} className="flex items-center gap-2 text-xs font-bold text-violet-400 hover:text-violet-300">
                      <Layout className="h-3 w-3" /> {step.designB ? 'Editar Design B' : 'Criar Design B'}
                    </button>
                  </div>
                )}

                {/* Automação e Branching */}
                <div className="rounded-xl bg-surface-900/50 border border-surface-800 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-surface-400">Roteamento</h3>
                    </div>
                    {step.isABTest && (
                      <span className="text-[10px] text-surface-600 flex items-center gap-1">
                        <Info className="h-3 w-3" /> Divisão 50/50 automática
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-surface-300">
                    <span>Se clicar, pular para</span>
                    <select
                      value={step.conditions?.[0]?.nextStepOrder || ""}
                      onChange={(e) => {
                        const nextOrder = parseInt(e.target.value);
                        const newConditions: any[] | null = nextOrder ? [{ on: "CLICKED", nextStepOrder: nextOrder }] : null;
                        updateStep(idx, "conditions", newConditions);
                      }}
                      className="bg-surface-800 border border-surface-700 rounded px-2 py-1 text-xs focus:border-primary-500"
                    >
                      <option value="">Próxima Etapa</option>
                      {steps.map((_, sIdx) => sIdx + 1 > step.stepOrder && (
                        <option key={sIdx} value={sIdx + 1}>Etapa {sIdx + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addStep} className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-surface-800 py-6 text-sm font-medium text-surface-500 hover:border-primary-500/30 hover:bg-primary-500/5 hover:text-primary-400 transition-all group">
            <Plus className="h-5 w-5" /> Adicionar Próxima Etapa
          </button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-950/80 backdrop-blur-md border-t border-surface-800 py-4 px-6">
          <div className="mx-auto max-w-4xl flex justify-end">
            <button type="submit" disabled={isPending || steps.some(s => !s.design || !s.subject || (s.isABTest && (!s.designB || !s.subjectB)))} className="flex items-center justify-center gap-3 rounded-lg bg-primary-600 px-8 py-3 text-base font-bold text-white shadow-xl shadow-primary-600/20 hover:bg-primary-500 transition-all active:scale-[0.98] disabled:opacity-50">
              {isPending ? <><Loader2 className="h-5 w-5 animate-spin" /> Salvando...</> : <><Mail className="h-5 w-5" /> Salvar Campanha com A/B Test</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
