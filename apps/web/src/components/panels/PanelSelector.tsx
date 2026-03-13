"use client";

import { useState } from "react";
import { TranscriptPanel } from "../transcript/TranscriptPanel";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { SettingsPanel } from "./SettingsPanel";

type PanelTab = "transcript" | "participants" | "settings";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "transcript", label: "TRANSCRIPT" },
  { id: "participants", label: "PANEL" },
  { id: "settings", label: "SETTINGS" },
];

export function PanelSelector() {
  const [activeTab, setActiveTab] = useState<PanelTab>("transcript");

  return (
    <>
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 label-mono text-center transition-colors relative ${
              activeTab === tab.id
                ? "text-white"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-felt-light" />
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "transcript" && <TranscriptPanel />}
        {activeTab === "participants" && <ParticipantsPanel />}
        {activeTab === "settings" && <SettingsPanel />}
      </div>
    </>
  );
}
