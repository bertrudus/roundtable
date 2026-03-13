"use client";

import { useState } from "react";
import { CreateSessionForm } from "@/components/session/CreateSessionForm";
import { RoundTable } from "@/components/table/RoundTable";
import { PanelSelector } from "@/components/panels/PanelSelector";
import { useDiscussionStore } from "@/stores/discussionStore";

export default function Home() {
  const { session, reset } = useDiscussionStore();

  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center mb-10">
          <h1 className="heading-display text-5xl tracking-wider mb-2">
            <span className="text-white">ROUND</span>
            <span className="text-felt-light">TABLE</span>
          </h1>
          <p className="font-[family-name:var(--font-serif)] text-text-secondary text-lg max-w-md mx-auto">
            AI agents debate topics around a virtual roundtable.
            Pick your panel, set the topic, and watch the discussion unfold.
          </p>
        </div>
        <CreateSessionForm />
      </main>
    );
  }

  return (
    <main className="h-screen flex overflow-hidden bg-[#0a0a0a]">
      {/* Left sidebar — branding + session info */}
      <div className="w-14 bg-surface border-r border-border flex flex-col items-center py-4 gap-6">
        <div className="heading-display text-lg text-felt-light tracking-wider leading-none">
          <span className="block text-center">R</span>
          <span className="block text-center text-[10px] text-text-muted">T</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={reset}
          className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-white hover:bg-surface-raised transition-colors"
          title="New session"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 1v14M1 8h14" />
          </svg>
        </button>
      </div>

      {/* Center — the roundtable */}
      <div className="flex-1 relative flex items-center justify-center">
        <RoundTable />
      </div>

      {/* Right panel — tabbed */}
      <div className="w-[380px] border-l border-border flex flex-col bg-surface">
        <PanelSelector />
      </div>
    </main>
  );
}
