"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCampaign, type CampaignActionState, getAvailableTags } from "@/features/campaigns/actions/create-campaign";
import { Plus, Trash2, Mail, Loader2, ArrowLeft, Layout, CheckCircle2, Split, Info, Clock, ArrowDown, Zap, ChevronDown, ChevronUp, Target, Users as UsersIcon, Tag } from "lucide-react";
import Link from "next/link";
import { EmailCodeEditor } from "@/features/campaigns/components/email-code-editor";

interface StepData {
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

export default function NewCampaignPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<StepData[]>([
    { 
      stepOrder: 1, subject: "", htmlBody: "", textBody: "", design: null, conditions: null, delayHours: 0,
      isABTest: false, subjectB: "", htmlBodyB: "", designB: null
    },
  ]);

  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [audienceType, setAudienceType] = useState<"NONE" | "ALL" | "TAGS">("NONE");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editingVariant, setEditingVariant] = useState<"A" | "B">("A");
  const [expandedStep, setExpandedStep] = useState<number>(0);
  
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");

  const [state, formAction, isPending] = useActionState<CampaignActionState, FormData>(
    createCampaign, {}
  );

  useEffect(() => {
    // Carregar tags disponíveis para o seletor de público
    getAvailableTags().then(setAvailableTags);
  }, []);

  useEffect(() => {
    if (state.success) {
      router.push(`/campaigns/${state.campaignId}`);
    }
  }, [state.success, state.campaignId, router]);

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
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold text-surface-50 tracking-tight">Nova Campanha</h1>
        <p className="mt-1 text-sm text-surface-500">Monte seu fluxo de prospecção passo a passo.</p>
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
            <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Quem deve receber esta campanha?</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setAudienceType("NONE")}
                className={`p-4 rounded-xl border text-left transition-all ${audienceType === 'NONE' ? 'bg-primary-500/10 border-primary-500/40' : 'bg-surface-900/50 border-surface-800 hover:border-surface-700'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${audienceType === 'NONE' ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-500'}`}>
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className={`text-xs font-bold ${audienceType === 'NONE' ? 'text-surface-50' : 'text-surface-400'}`}>Sem contatos agora</span>
                </div>
                <p className="text-[10px] text-surface-500 leading-relaxed">Você poderá adicionar contatos manualmente depois de criar a campanha.</p>
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
                <p className="text-[10px] text-surface-500 leading-relaxed">Adiciona automaticamente todos os contatos ativos da sua base à campanha.</p>
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
                  <span className={`text-xs font-bold ${audienceType === 'TAGS' ? 'text-surface-50' : 'text-surface-400'}`}>Filtrar por Tags</span>
                </div>
                <p className="text-[10px] text-surface-500 leading-relaxed">Selecione grupos específicos baseados nas tags cadastradas.</p>
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
                    <p className="text-[10px] text-surface-600 italic">Nenhuma tag encontrada na sua base.</p>
                  )}
                </div>
                {selectedTags.length > 0 && (
                  <p className="mt-3 text-[10px] text-primary-400 font-medium">
                    {selectedTags.length} tag(s) selecionada(s). Apenas contatos que possuam TODAS essas tags serão adicionados.
                  </p>
                )}
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
              const isFirst = idx === 0;

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
                            <div className={`md:hidden h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              complete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary-500/10 text-primary-400'
                            }`}>
                              {complete ? <CheckCircle2 className="h-4 w-4" /> : step.stepOrder}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-surface-200">Etapa {step.stepOrder}</span>
                                {step.isABTest && <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">A/B</span>}
                                {complete && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Pronta</span>}
                              </div>
                              <p className="text-xs text-surface-500 truncate mt-0.5 max-w-[300px]">{step.subject || "Assunto não definido..."}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-surface-500" /> : <ChevronDown className="h-4 w-4 text-surface-500" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-surface-800/40 p-5 space-y-5 animate-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => updateStep(idx, "isABTest", !step.isABTest)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${step.isABTest ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'bg-surface-800/50 border-surface-800 text-surface-500 hover:text-surface-300'}`}
                              >
                                <Split className="h-3 w-3" /> Teste A/B
                              </button>
                              {steps.length > 1 && (
                                <button type="button" onClick={() => removeStep(idx)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-surface-600 hover:bg-red-500/10 hover:text-red-400 transition-all">
                                  <Trash2 className="h-3 w-3" /> Remover
                                </button>
                              )}
                            </div>

                            {!isFirst && (
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                                <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">Delay entre etapas</p>
                                  <div className="flex items-center gap-2">
                                    <input type="number" min={0} value={step.delayHours} onChange={(e) => updateStep(idx, "delayHours", parseInt(e.target.value) || 0)} className="input-base h-8 w-20 !text-sm text-center" />
                                    <span className="text-xs text-surface-400">horas após etapa anterior</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.15em]">{step.isABTest ? "Variante A" : "Email"}</p>
                              </div>
                              <div>
                                <label className={labelClass}>Assunto {step.isABTest ? 'A' : ''} *</label>
                                <input required value={step.subject} onChange={(e) => updateStep(idx, "subject", e.target.value)} placeholder="Ex: Tenho uma proposta para você, {{contactName}}" className={inputClass} />
                              </div>
                              <button type="button" onClick={() => { setEditingVariant("A"); setEditingStepIndex(idx); }} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-all ${step.design ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10' : 'border-primary-500/30 bg-primary-500/5 text-primary-400 hover:bg-primary-500/10'}`}>
                                {step.design ? <CheckCircle2 className="h-4 w-4" /> : <Layout className="h-4 w-4" />}
                                <span className="text-xs font-bold">{step.design ? 'Design Criado — Editar' : 'Criar Design do Email'}</span>
                              </button>
                            </div>

                            {step.isABTest && (
                              <div className="space-y-3 pt-4 border-t border-surface-800/40">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.15em] flex items-center gap-1.5"><Split className="h-3 w-3" /> Variante B</p>
                                </div>
                                <div>
                                  <label className={labelClass}>Assunto B *</label>
                                  <input required value={step.subjectB} onChange={(e) => updateStep(idx, "subjectB", e.target.value)} placeholder="Assunto alternativo" className={inputClass} />
                                </div>
                                <button type="button" onClick={() => { setEditingVariant("B"); setEditingStepIndex(idx); }} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-all ${step.designB ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10' : 'border-violet-500/30 bg-violet-500/5 text-violet-400 hover:bg-violet-500/10'}`}>
                                  {step.designB ? <CheckCircle2 className="h-4 w-4" /> : <Layout className="h-4 w-4" />}
                                  <span className="text-xs font-bold">{step.designB ? 'Design B Criado — Editar' : 'Criar Design B'}</span>
                                </button>
                              </div>
                            )}

                            {steps.length > 1 && idx < steps.length - 1 && (
                              <div className="rounded-xl bg-surface-900/50 border border-surface-800 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Roteamento Condicional</h3>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-surface-300">
                                  <span className="text-xs">Se clicar, pular para</span>
                                  <select value={step.conditions?.[0]?.nextStepOrder || ""} onChange={(e) => { const nextOrder = parseInt(e.target.value); const newConditions: any[] | null = nextOrder ? [{ on: "CLICKED", nextStepOrder: nextOrder }] : null; updateStep(idx, "conditions", newConditions); }} className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-1.5 text-xs focus:border-primary-500 outline-none">
                                    <option value="">Próxima Etapa (linear)</option>
                                    {steps.map((_, sIdx) => sIdx + 1 > step.stepOrder && (
                                      <option key={sIdx} value={sIdx + 1}>Etapa {sIdx + 1}</option>
                                    ))}
                                  </select>
                                </div>
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

            <div className="relative">
              <div className="flex flex-col items-center py-3 md:ml-[27px] md:items-start">
                <ArrowDown className="h-4 w-4 text-surface-700" />
              </div>
              <div className="flex gap-4">
                <div className="hidden md:flex flex-col items-center z-10">
                  <div className="h-[54px] w-[54px] rounded-2xl flex items-center justify-center border-2 border-dashed border-surface-800 bg-surface-950 text-surface-600">
                    <Plus className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex-1">
                  <button type="button" onClick={addStep} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-800/60 py-5 text-sm font-semibold text-surface-500 hover:border-primary-500/30 hover:bg-primary-500/5 hover:text-primary-400 transition-all">
                    <Plus className="h-4 w-4" /> Adicionar Etapa ao Fluxo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card !p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-primary-400" /><span className="text-xs font-semibold text-surface-300">{steps.length} {steps.length === 1 ? 'etapa' : 'etapas'}</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /><span className="text-xs font-semibold text-surface-300">{steps.filter(isStepComplete).length} completas</span></div>
            </div>
            <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-400" /><span className="text-xs font-semibold text-surface-300">Duração: ~{steps.reduce((sum, s) => sum + s.delayHours, 0)}h</span></div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-950/90 backdrop-blur-xl border-t border-surface-800/40 py-3 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <p className="text-[10px] text-surface-500 hidden sm:block">{steps.filter(isStepComplete).length}/{steps.length} etapas prontas</p>
            <button type="submit" disabled={isPending || steps.some(s => !s.subject || (s.isABTest && !s.subjectB))} className="btn btn-primary !px-6 !py-2.5 ml-auto">
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <><Mail className="h-4 w-4" /> Salvar Campanha</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
