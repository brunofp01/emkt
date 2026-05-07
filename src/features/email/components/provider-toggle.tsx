"use client";

import { useState } from "react";

interface ProviderToggleProps {
  providerId: string;
  isActive: boolean;
}

export function ProviderToggle({ providerId, isActive: initialActive }: ProviderToggleProps) {
  const [isActive, setIsActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/toggle-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, isActive: !isActive }),
      });
      if (res.ok) {
        setIsActive(!isActive);
      }
    } catch (err) {
      console.error("Erro ao alterar provedor:", err);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
        isActive ? "bg-emerald-500" : "bg-surface-700"
      } ${loading ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
          isActive ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
