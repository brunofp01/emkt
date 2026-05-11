"use client";

import { useState, useEffect, useRef } from "react";
import { Code2, Eye, Save, X, Tablet, Smartphone, Monitor, Info } from "lucide-react";

interface EmailCodeEditorProps {
  initialHtml: string;
  subject: string;
  onSave: (html: string) => void;
  onCancel: () => void;
}

export function EmailCodeEditor({ initialHtml, subject, onSave, onCancel }: EmailCodeEditorProps) {
  const [html, setHtml] = useState(initialHtml || getDefaultHtml());
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Mock data para preview
  const mockData = {
    contactName: "João Silva",
    contactEmail: "joao@exemplo.com.br",
    contactCompany: "Empresa XPTO",
  };

  // Prepara o HTML para o preview (substituindo variáveis)
  const getPreviewHtml = () => {
    if (typeof html !== "string") return "";
    let preview = html;
    try {
      Object.entries(mockData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        preview = preview.replace(regex, value);
      });
    } catch (err) {
      console.error("Erro ao processar variáveis do email:", err);
    }
    return preview;
  };

  const previewHtml = getPreviewHtml();

  const viewWidths = {
    desktop: "100%",
    tablet: "600px",
    mobile: "375px",
  };

  return (
    <div className="flex flex-col h-full bg-surface-950 rounded-2xl border border-surface-800 overflow-hidden shadow-2xl">
      {/* Header do Editor */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800 bg-surface-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/10 rounded-lg">
            <Code2 className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-surface-50 uppercase tracking-widest">Email Code Studio</h3>
            <p className="text-[10px] text-surface-500 font-medium">MODO HTML PURO</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Viewport Selectors */}
          <div className="hidden sm:flex items-center bg-surface-950 rounded-lg p-1 border border-surface-800">
            {(["desktop", "tablet", "mobile"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-md transition-all ${viewMode === mode ? 'bg-primary-500 text-white shadow-lg' : 'text-surface-500 hover:text-surface-300'}`}
              >
                {mode === "desktop" && <Monitor className="h-4 w-4" />}
                {mode === "tablet" && <Tablet className="h-4 w-4" />}
                {mode === "mobile" && <Smartphone className="h-4 w-4" />}
              </button>
            ))}
          </div>

          <div className="hidden sm:block h-6 w-px bg-surface-800 mx-1" />

          <button onClick={onCancel} className="p-2 text-surface-500 hover:text-surface-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
          <button 
            onClick={() => onSave(html)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-lg shadow-primary-600/20 active:scale-95 whitespace-nowrap"
          >
            <Save className="h-4 w-4 sm:h-5 sm:w-5" /> 
            <span className="hidden xs:inline">Salvar Design</span>
            <span className="xs:hidden">Salvar</span>
          </button>
        </div>
      </div>

      {/* Workspace: Editor + Preview */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Editor (Lado Esquerdo / Topo no Mobile) */}
        <div className="h-1/2 lg:h-auto lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-surface-800 bg-surface-950">
          <div className="px-4 py-2 bg-surface-900/30 flex items-center justify-between border-b border-surface-800">
            <span className="text-[10px] font-bold text-surface-500 uppercase">index.html</span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] sm:text-[10px] text-primary-400/70">Variáveis: {"{{name}}"}, {"{{company}}"}</span>
            </div>
          </div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="flex-1 w-full p-4 sm:p-6 bg-surface-950 text-surface-300 font-mono text-sm resize-none focus:outline-none focus:ring-0"
            spellCheck={false}
          />
        </div>

        {/* Preview (Lado Direito / Baixo no Mobile) */}
        <div className="h-1/2 lg:h-auto lg:w-1/2 flex flex-col bg-surface-900/20 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-surface-800 bg-surface-950/50 shrink-0">
            <div className="space-y-1 sm:space-y-1.5">
              <div className="flex gap-2">
                <span className="text-[9px] font-bold text-surface-500 w-10">DE:</span>
                <span className="text-[9px] text-surface-400 truncate">Vendas &lt;vendas@mailpulse.com&gt;</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[9px] font-bold text-surface-500 w-10">PARA:</span>
                <span className="text-[9px] text-surface-400 truncate">{mockData.contactName} &lt;{mockData.contactEmail}&gt;</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[9px] font-bold text-surface-500 w-10">ASSUNTO:</span>
                <span className="text-[10px] font-bold text-primary-400 truncate">{subject || "(Sem Assunto)"}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 sm:p-8 flex justify-center overflow-auto bg-surface-800/30 custom-scrollbar">
            <div 
              className="bg-white shadow-2xl transition-all duration-300 h-fit min-h-full overflow-hidden rounded-md shrink-0"
              style={{ width: viewMode === 'desktop' ? '100%' : viewWidths[viewMode] }}
            >
              <iframe
                srcDoc={previewHtml}
                title="Email Preview"
                className="w-full h-full border-none min-h-[500px]"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer / Status Bar */}
      <div className="px-4 py-1.5 bg-primary-600 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[9px] font-bold text-white uppercase tracking-tighter">
          <span>HTML5</span>
          <span>UTF-8</span>
          <span className="opacity-70">Linhas: {html.split('\n').length}</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold text-white">
          <Info className="h-3 w-3" />
          Dica: Use tabelas e CSS inline para máxima compatibilidade.
        </div>
      </div>
    </div>
  );
}

function getDefaultHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { background: #ffffff; padding: 30px; border-radius: 8px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #1e293b;">Olá, {{contactName}}! 👋</h1>
    </div>
    <div class="content">
      <p>Escreva sua mensagem personalizada aqui.</p>
      <p>Este é um exemplo de email marketing de alta performance enviado via <strong>MailPulse</strong>.</p>
      <a href="#" class="button">Call to Action Principal</a>
    </div>
    <div class="footer">
      <p>&copy; 2026 MailPulse. Todos os direitos reservados.</p>
      <p>Você está recebendo este email porque faz parte da nossa lista da {{contactCompany}}.</p>
      <p><a href="{{unsubscribeUrl}}">Descadastrar-se</a></p>
    </div>
  </div>
</body>
</html>`;
}
