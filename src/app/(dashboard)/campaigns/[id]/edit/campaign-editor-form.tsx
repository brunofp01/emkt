"use client";
import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateCampaign, type CampaignActionState, getAvailableTags } from "@/features/campaigns/actions/create-campaign";
import { Plus, Trash2, Mail, Loader2, ArrowLeft, Layout, CheckCircle2, Split, Info, Target, Users as UsersIcon, Tag, Clock, ArrowDown, ChevronUp, ChevronDown, Zap, Save, X } from "lucide-react";
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

  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [audienceType, setAudienceType] = useState<"NONE" | "ALL" | "TAGS">(campaign.audienceType || "NONE");
  const [selectedTags, setSelectedTags] = useState<string[]>(campaign.audienceTags || []);

  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editingVariant, setEditingVariant] = useState<"A" | "B">("A");
  const [expandedStep, setExpandedStep] = useState<number>(0);

  const [campaignName, setCampaignName] = useState(campaign.name || "");
  const [campaignDescription, setCampaignDescription] = useState(campaign.description || "");

  const [state, formAction, isPending] = useActionState<CampaignActionState, FormData>(
    updateCampaign.bind(null, campaign.id), {}
  );

  useEffect(() => {
    // Carregar tags disponíveis para o seletor de público
    getAvailableTags().then(setAvailableTags);
  }, []);

  useEffect(() => {
    if (state.success) {
      router.push(`/campaigns/${campaign.id}`);
      router.refresh();
    }
  }, [state.success, campaign.id, router]);

  const addStep = () => {
    const newStep: StepData = {
      stepOrder: steps.length + 1, subject: "", htmlBody: "", textBody: "", design: null, conditions: null, delayHours: 24,
      isABTest: false, subjectB: "", htmlBodyB: "", designB: null
    };
    setSteps((prev) => [...prev, newStep]);
    setExpandedStep(steps.length);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 })));
    if (expandedStep === index) setExpandedStep(Math.max(0, index - 1));
    else if (expandedStep > index) setExpandedStep(expandedStep - 1);
  };

  const updateStep = (index: number, field: keyof StepData, value: any) => {
    setSteps((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
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

  const isStepComplete = (step: StepData) => {
    const hasSubject = !!step.subject.trim();
    const hasDesign = !!step.design;
    const abOk = !step.isABTest || (!!step.subjectB.trim());
    return hasSubject && hasDesign && abOk;
  };

  const inputClass = "input-base h-10";
  const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-surface-500";

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
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in pb-28">
      <Link href={`/campaigns/${campaign.id}`} className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Cancelar Edição
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold text-surface-50 tracking-tight">Editar Campanha</h1>
        <p className="mt-1 text-sm text-surface-500">Ajuste os detalhes e o público alvo da sua régua.</p>
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <form action={(fd) => {
        fd.set("steps", JSON.stringify(steps));
        fd.set("audienceType", audienceType);
        fd.set("audienceTags", JSON.stringify(selectedTags));
        formAction(fd);
      }} className="space-y-8">
        
        {/* Informações da Campanha */}
        <div className="glass-card !p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Nome da Campanha *</label>
              <input name="name" required placeholder="Ex: Prospecção Imobiliária 2026" className={inputClass} value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Descrição</label>
              <input name="description" placeholder="Breve descrição interna" className={inputClass} value={campaignDescription} onChange={(e) => setCampaignDescription(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ═══════════════════ PÚBLICO ALVO ═══════════════════ */}
        <div className="relative">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-surface-500 mb-6 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary-400" />
            Público Alvo
          </h2>

          <div className="glass-card !p-6 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Ajustar Público da Campanha</p>
              {audienceType !== "NONE" && (
                <span className="text-[9px] font-bold text-primary-400 bg-primary-500/10 px-2 py-1 rounded">
                  {audienceType === 'ALL' ? 'Todos os Contatos' : `${selectedTags.length} Tags Selecionadas`}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setAudienceType("NONE")}
                className={`p-4 rounded-xl border text-left transition-all ${audienceType === 'NONE' ? 'bg-primary-500/10 border-primary-500/40' : 'bg-surface-900/50 border-surface-800 hover:border-surface-700'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${audienceType === 'NONE' ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-500'}`}>
                    <X className="h-4 w-4" />
                  </div>
                  <span className={`text-xs font-bold ${audienceType === 'NONE' ? 'text-surface-50' : 'text-surface-400'}`}>Não adicionar mais</span>
                </div>
                <p className="text-[10px] text-surface-500 leading-relaxed">Mantém o público atual sem vincular novos contatos em massa agora.</p>
              </button>

              <button
                type="button"
                onClick={() => setAudienceType("ALL")}
                className={`p-4 rounded-xl border text-left transition-all ${audienceType === 'ALL' ? 'bg-primary-500/10 border-primary-500/40' : 'bg-surface-900/50 border-surface-800 hover:border-surface-700'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${audienceType === 'ALL' ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-500'}`}>
                    <UsersIcon className="h-4 w-4" />
                  </div>
                  <span className={`text-xs font-bold ${audienceType === 'ALL' ? 'text-surface-50' : 'text-surface-400'}`}>Todos os Contatos</span>
                </div>
                <p className="text-[10px] text-surface-500 leading-relaxed">Sincroniza e adiciona todos os contatos ativos que ainda não estão no fluxo.</p>
              </button>

              <button
                type="button"
                onClick={() => setAudienceType("TAGS")}
                className={`p-4 rounded-xl border text-left transition-all ${audienceType === 'TAGS' ? 'bg-primary-500/10 border-primary-500/40' : 'bg-surface-900/50 border-surface-800 hover:border-surface-700'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${audienceType === 'TAGS' ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-500'}`}>
                    <Tag className="h-4 w-4" />
                  </div>
                  <span className={`text-xs font-bold ${audienceType === 'TAGS' ? 'text-surface-50' : 'text-surface-400'}`}>Atualizar por Tags</span>
                </div>
                <p className="text-[10px] text-surface-500 leading-relaxed">Filtra novos contatos baseados nas tags e os inclui na campanha.</p>
              </button>
            </div>

            {audienceType === "TAGS" && (
              <div className="pt-4 border-t border-surface-800/40 animate-in slide-in-from-top-2">
                <label className={labelClass}>Selecione as Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.length > 0 ? availableTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        selectedTags.includes(tag)
                          ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                          : 'bg-surface-900 border-surface-800 text-surface-500 hover:border-surface-700'
                      }`}
                    >
                      {tag}
                    </button>
                  )) : (
                    <p className="text-[10px] text-surface-600 italic">Nenhuma tag encontrada.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════ FLUXOGRAMA VISUAL ═══════════════════ */}
        <div className="relative">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-surface-500 mb-6 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary-400" />
            Fluxo de Emails
          </h2>

          <div className="absolute left-[27px] top-14 bottom-4 w-px bg-gradient-to-b from-primary-500/40 via-primary-500/20 to-transparent hidden md:block" />

          <div className="space-y-0">
            {steps.map((step, idx) => {
              const isExpanded = expandedStep === idx;
              const complete = isStepComplete(step);

              return (
                <div key={idx} className="relative">
                  {idx > 0 && (
                    <div className="flex flex-col items-center py-3 md:ml-[27px] md:items-start">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="h-4 w-4 text-primary-500/50" />
                        {step.delayHours > 0 && (
                          <span className="text-[10px] font-semibold text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            Aguardar {step.delayHours}h
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 relative">
                    <div className="hidden md:flex flex-col items-center z-10">
                      <div className={`h-[54px] w-[54px] rounded-2xl flex items-center justify-center border-2 transition-all ${
                        complete 
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                          : isExpanded 
                            ? 'bg-primary-500/10 border-primary-500/40 text-primary-400' 
                            : 'bg-surface-900 border-surface-800 text-surface-500'
                      }`}>
                        {complete ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-lg font-black">{step.stepOrder}</span>}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className={`glass-card !p-0 overflow-hidden transition-all ${isExpanded ? 'ring-1 ring-primary-500/30' : ''}`}>
                        <button
                          type="button"
                          onClick={() => setExpandedStep(isExpanded ? -1 : idx)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-800/10 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-surface-200">Etapa {step.stepOrder}</span>
                                {step.isABTest && <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">A/B</span>}
                              </div>
                              <p className="text-xs text-surface-500 truncate mt-0.5 max-w-[300px]">{step.subject || "Assunto não definido..."}</p>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-surface-500" /> : <ChevronDown className="h-4 w-4 text-surface-500" />}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-surface-800/40 p-5 space-y-5 animate-in slide-in-from-top-1">
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => updateStep(idx, "isABTest", !step.isABTest)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${step.isABTest ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'bg-surface-800/50 border-surface-800 text-surface-500 hover:text-surface-300'}`}
                              >
                                <Split className="h-3 w-3" /> Teste A/B
                              </button>
                              {steps.length > 1 && (
                                <button type="button" onClick={() => removeStep(idx)} className="text-[10px] font-bold text-surface-600 hover:text-red-400">
                                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                                </button>
                              )}
                            </div>

                            <div className="grid gap-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <label className={labelClass}>Assunto A *</label>
                                  <input required value={step.subject} onChange={(e) => updateStep(idx, "subject", e.target.value)} className={inputClass} />
                                </div>
                                {idx > 0 && (
                                  <div>
                                    <label className={labelClass}>Aguardar (Horas)</label>
                                    <input type="number" min={0} value={step.delayHours} onChange={(e) => updateStep(idx, "delayHours", parseInt(e.target.value) || 0)} className={inputClass} />
                                  </div>
                                )}
                              </div>
                              <button type="button" onClick={() => { setEditingVariant("A"); setEditingStepIndex(idx); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary-500/30 bg-primary-500/5 text-primary-400 font-bold text-xs">
                                <Layout className="h-4 w-4" /> {step.design ? 'Editar Design HTML' : 'Criar Design HTML'}
                              </button>
                            </div>

                            {step.isABTest && (
                              <div className="pt-4 border-t border-surface-800/40 space-y-4">
                                <label className={labelClass}>Assunto Variante B *</label>
                                <input required value={step.subjectB} onChange={(e) => updateStep(idx, "subjectB", e.target.value)} className={inputClass} />
                                <button type="button" onClick={() => { setEditingVariant("B"); setEditingStepIndex(idx); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 text-violet-400 font-bold text-xs">
                                  <Layout className="h-4 w-4" /> {step.designB ? 'Editar Design B' : 'Criar Design B'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button type="button" onClick={addStep} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-800 py-4 text-xs font-bold text-surface-500 hover:border-primary-500/30 hover:text-primary-400 transition-all">
              <Plus className="h-4 w-4" /> Adicionar Etapa
            </button>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-950/90 backdrop-blur-xl border-t border-surface-800/40 py-3 px-4 flex justify-end">
          <button type="submit" disabled={isPending} className="btn btn-primary !px-8 !py-2.5">
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="h-4 w-4" /> Salvar Alterações</>}
          </button>
        </div>
      </form>
    </div>
  );
}
