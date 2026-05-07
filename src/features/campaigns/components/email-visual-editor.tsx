'use client';

import React, { useRef, useState } from 'react';
import EmailEditor, { EditorRef, EmailEditorProps } from 'react-email-editor';
import { Loader2, Save, Trash2 } from 'lucide-react';

interface EmailVisualEditorProps {
  initialDesign?: any;
  onSave: (html: string, design: any) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * Componente de Editor Visual de E-mail (World-Class).
 * Utiliza o SDK do Unlayer para fornecer uma experiência drag-and-drop premium.
 */
export const EmailVisualEditor: React.FC<EmailVisualEditorProps> = ({
  initialDesign,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const emailEditorRef = useRef<EditorRef>(null);
  const [isEditorLoaded, setIsEditorLoaded] = useState(false);

  const exportHtml = () => {
    const unlayer = emailEditorRef.current?.editor;

    unlayer?.exportHtml((data) => {
      const { design, html } = data;
      onSave(html, design);
    });
  };

  const onLoad: EmailEditorProps['onLoad'] = (unlayer) => {
    setIsEditorLoaded(true);
    if (initialDesign) {
      unlayer.loadDesign(initialDesign);
    }
  };

  const onReady: EmailEditorProps['onReady'] = (unlayer) => {
    // Aqui podemos configurar fontes customizadas ou cores padrão da marca
    console.log('Editor visual pronto');
  };

  return (
    <div className="flex flex-col h-[85vh] w-full bg-surface-950 rounded-xl overflow-hidden border border-surface-800 shadow-2xl">
      {/* Header do Editor */}
      <div className="flex items-center justify-between px-6 py-4 bg-surface-900 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-primary-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-surface-50 uppercase tracking-widest">
            Visual Designer
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-400 hover:text-surface-100 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={exportHtml}
            disabled={!isEditorLoaded || isLoading}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Design
          </button>
        </div>
      </div>

      {/* Container do Editor */}
      <div className="flex-1 relative bg-white">
        {!isEditorLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-950 z-50">
            <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
            <p className="mt-4 text-sm text-surface-500 font-medium animate-pulse">
              Iniciando motor de design...
            </p>
          </div>
        )}
        <EmailEditor
          ref={emailEditorRef}
          onLoad={onLoad}
          onReady={onReady}
          minHeight="100%"
          style={{ width: '100%', height: '100%' }}
          options={{
            appearance: {
              theme: 'dark',
              panels: {
                tools: {
                  dock: 'left',
                },
              },
            },
            locale: 'pt-BR',
            features: {
              textEditor: {
                spellChecker: true,
              },
            },
          }}
        />
      </div>
    </div>
  );
};
