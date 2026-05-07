"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateCampaign, type CampaignActionState } from "@/features/campaigns/actions/create-campaign";
import { Plus, Trash2, Mail, Loader2, ArrowLeft, Layout, CheckCircle2, Split, Info } from "lucide-react";
import Link from "next/link";
import { EmailCodeEditor } from "@/features/campaigns/components/email-code-editor";

interface StepData {
  id?: string;
  stepOrder: number;
  subject: string;
  htmlBody: string;
  textBody: string;
  design: any;
  conditions: any;
  delayHours: number;
  isABTest: boolean;
  subjectB: string;
  htmlBodyB: string;
  designB: any;
}

export default function CampaignEditorForm({ campaign }: { campaign: any }) {
  const router = useRouter();
  const [steps, setSteps] = useState<StepData[]>(campaign.steps.map((s: any) => ({
    id: s.id,
    stepOrder: s.stepOrder,
    subject: s.subject,
    htmlBody: s.htmlBody,
    textBody: s.textBody || "",
    design: s.design,
    conditions: s.conditions,
    delayHours: s.delayHours,
    isABTest: s.isABTest,
    subjectB: s.subjectB || "",
    htmlBodyB: s.htmlBodyB || "",
    designB: s.designB,
  })));

  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editingVariant, setEditingVariant] = useState<"A" | "B">("A");

  const [state, formAction, isPending] = useActionState<CampaignActionState, FormData>(
    updateCampaign.bind(null, campaign.id), {}
  );

  useEffect(() => {
    if (state.success) {
      router.push(`/campaigns/${campaign.id}`);
      router.refresh();
    }
  }, [state.success, campaign.id, router]);

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

  const handleSaveDesign = (html: string) => {
    if (editingStepIndex !== null) {
      if (editingVariant === "A") {
        updateStep(editingStepIndex, "htmlBody", html);
        updateStep(editingStepIndex, "design", { isCode: true });
      } else {
        updateStep(editingStepIndex, "htmlBodyB", html);
        updateStep(editingStepIndex, "designB", { isCode: true });
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
        <EmailCodeEditor
          initialHtml={editingVariant === "A" ? currentStep.htmlBody : currentStep.htmlBodyB}
          subject={editingVariant === "A" ? currentStep.subject : currentStep.subjectB}
          onSave={handleSaveDesign}
          onCancel={() => setEditingStepIndex(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href={`/campaigns/${campaign.id}`} className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300">
        <ArrowLeft className="h-4 w-4" /> Cancelar Edição
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-surface-50">Editar Campanha</h1>
        <p className="mt-1 text-sm text-surface-500">Ajuste sua régua de prospecção.</p>
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
              <input name="name" defaultValue={campaign.name} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Descrição</label>
              <input name="description" defaultValue={campaign.description || ""} className={inputClass} />
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

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-surface-500 uppercase tracking-[0.2em]">
                    <span>Variante A</span>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                      <label className={labelClass}>Assunto Variante A *</label>
                      <input required value={step.subject} onChange={(e) => updateStep(idx, "subject", e.target.value)} className={inputClass} />
                    </div>
                    <div className="lg:col-span-4">
                      <label className={labelClass}>Aguardar (Horas)</label>
                      <input type="number" min={0} value={step.delayHours} disabled={idx === 0} onChange={(e) => updateStep(idx, "delayHours", parseInt(e.target.value) || 0)} className={`${inputClass} disabled:opacity-30`} />
                    </div>
                  </div>
                  <button type="button" onClick={() => { setEditingVariant("A"); setEditingStepIndex(idx); }} className="flex items-center gap-2 text-xs font-bold text-primary-400 hover:text-primary-300">
                    <Layout className="h-3 w-3" /> Editar Código HTML A
                  </button>
                </div>

                {step.isABTest && (
                  <div className="pt-6 border-t border-surface-800/50 space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">
                      <Split className="h-3 w-3" /> Variante B
                    </div>
                    <div className="grid gap-6">
                      <div>
                        <label className={labelClass}>Assunto Variante B *</label>
                        <input required value={step.subjectB} onChange={(e) => updateStep(idx, "subjectB", e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    <button type="button" onClick={() => { setEditingVariant("B"); setEditingStepIndex(idx); }} className="flex items-center gap-2 text-xs font-bold text-violet-400 hover:text-violet-300">
                      <Layout className="h-3 w-3" /> Editar Código HTML B
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={addStep} className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-surface-800 py-6 text-sm font-medium text-surface-500 hover:border-primary-500/30 hover:bg-primary-500/5 hover:text-primary-400 transition-all group">
            <Plus className="h-5 w-5" /> Adicionar Próxima Etapa
          </button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-950/80 backdrop-blur-md border-t border-surface-800 py-4 px-6">
          <div className="mx-auto max-w-4xl flex justify-end">
            <button 
              type="submit" 
              disabled={isPending || steps.some(s => !s.subject || (s.isABTest && !s.subjectB))} 
              className="flex items-center justify-center gap-3 rounded-lg bg-primary-600 px-8 py-3 text-base font-bold text-white shadow-xl shadow-primary-600/20 hover:bg-primary-500 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? <><Loader2 className="h-5 w-5 animate-spin" /> Salvando...</> : <><Save className="h-5 w-5" /> Salvar Alterações</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const Save = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);
