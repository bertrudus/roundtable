"use client";

import { CreateSessionForm } from "@/components/session/CreateSessionForm";
import { RoundTable } from "@/components/table/RoundTable";
import { PanelSelector } from "@/components/panels/PanelSelector";
import { useDiscussionStore } from "@/stores/discussionStore";

export default function Home() {
  const { session, reset } = useDiscussionStore();

  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 relative">
        <div className="text-center mb-12">
          <h1 className="heading-display text-6xl tracking-wider mb-3">
            <span className="text-white">ROUND</span>
            <span className="text-accent">TABLE</span>
          </h1>
          <p className="font-[family-name:var(--font-serif)] text-text-secondary text-lg max-w-md mx-auto leading-relaxed">
            AI agents debate topics around a virtual roundtable.
            Pick your panel, set the topic, and watch the discussion unfold.
          </p>
        </div>
        <CreateSessionForm />
      </main>
    );
  }

  return (
    <main className="h-screen flex overflow-hidden relative">
      {/* Center — the roundtable */}
      <div className="flex-1 relative flex items-center justify-center">
        <RoundTable />
      </div>

      {/* Right panel — glass sidebar */}
      <div className="w-[400px] flex flex-col glass border-l-0 m-2 ml-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <span className="heading-display text-lg tracking-wider">
              <span className="text-white">ROUND</span>
              <span className="text-accent">TABLE</span>
            </span>
          </div>
          <button
            onClick={reset}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-text-secondary hover:text-white"
            title="New session"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 1v14M1 8h14" />
            </svg>
          </button>
        </div>

        <PanelSelector />
      </div>
    </main>
  );
}
