"use client";

import { Globe, Shield, Zap, Lock } from "lucide-react";

const PLATFORMS = [
  { name: "HubSpot", icon: "https://www.vectorlogo.zone/logos/hubspot/hubspot-icon.svg", status: "Em breve" },
  { name: "Salesforce", icon: "https://www.vectorlogo.zone/logos/salesforce/salesforce-icon.svg", status: "Em breve" },
  { name: "Pipedrive", icon: "https://www.vectorlogo.zone/logos/pipedrive/pipedrive-icon.svg", status: "Em breve" },
  { name: "ActiveCampaign", icon: "https://www.vectorlogo.zone/logos/activecampaign/activecampaign-icon.svg", status: "Em breve" },
];

export function PlatformImporter() {
  return (
    <div className="space-y-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {PLATFORMS.map((platform) => (
          <div 
            key={platform.name}
            className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-surface-800 bg-surface-900/50 p-6 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 p-2 transition-transform group-hover:scale-110">
              <img src={platform.icon} alt={platform.name} className="h-8 w-8 object-contain" />
            </div>
            <span className="text-xs font-bold text-surface-400">{platform.name}</span>
            <div className="absolute -top-2 -right-2 rounded-full bg-surface-800 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-surface-500 border border-surface-700">
              {platform.status}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-surface-800 bg-surface-900/40 p-8 text-center space-y-4">
        <div className="flex justify-center -space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 ring-4 ring-surface-950">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 ring-4 ring-surface-950">
            <Lock className="h-5 w-5" />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-500 ring-4 ring-surface-950">
            <Zap className="h-5 w-5" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-surface-50 font-bold">Conexões Seguras e Autenticadas</h4>
          <p className="text-sm text-surface-500 max-w-sm mx-auto">
            Estamos finalizando as integrações nativas via OAuth para que você possa sincronizar seus leads em tempo real com total segurança.
          </p>
        </div>

        <button className="text-xs font-bold uppercase tracking-widest text-primary-500 hover:text-primary-400 transition-colors">
          Solicitar Integração Específica →
        </button>
      </div>
    </div>
  );
}
