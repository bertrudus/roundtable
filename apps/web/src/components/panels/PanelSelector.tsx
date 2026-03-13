"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TranscriptPanel } from "../transcript/TranscriptPanel";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { SettingsPanel } from "./SettingsPanel";

type PanelTab = "transcript" | "participants" | "settings";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "transcript", label: "Transcript" },
  { id: "participants", label: "Panel" },
  { id: "settings", label: "Settings" },
];

export function PanelSelector() {
  const [activeTab, setActiveTab] = useState<PanelTab>("transcript");

  return (
    <>
      {/* Segmented control */}
      <div className="mx-4 mb-3">
        <div className="flex p-1 rounded-xl bg-white/[0.04]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 relative py-2 text-[12px] font-medium transition-colors rounded-lg"
              style={{
                fontFamily: "var(--font-ui)",
                color: activeTab === tab.id ? "#fff" : "rgba(235,235,245,0.4)",
              }}
            >
              {activeTab === tab.id && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-white/[0.08]"
                  layoutId="activeTab"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
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
