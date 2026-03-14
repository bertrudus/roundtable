"use client";

import { useDiscussionStore } from "@/stores/discussionStore";

export function SettingsPanel() {
  const {
    session, ttsEnabled, setTTSEnabled, speechRate, setSpeechRate,
    isActive, stopDiscussion, startDiscussion, isPaused, setPaused,
  } = useDiscussionStore();

  if (!session) return null;
  const { config } = session;

  return (
    <div className="flex flex-col h-full px-4">
      {/* Session info */}
      <div className="py-4 space-y-3">
        <div>
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider" style={{ fontFamily: "var(--font-ui)" }}>
            Topic
          </span>
          <p className="text-[15px] text-white leading-snug mt-1" style={{ fontFamily: "var(--font-serif)" }}>
            {config.topic}
          </p>
        </div>
        {config.description && (
          <div>
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider" style={{ fontFamily: "var(--font-ui)" }}>
              Context
            </span>
            <p className="text-[13px] text-text-secondary leading-snug mt-1" style={{ fontFamily: "var(--font-serif)" }}>
              {config.description}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-1">
        {/* Pause toggle */}
        <div className="flex items-center justify-between py-3">
          <div>
            <span className="text-[14px] text-text-primary block" style={{ fontFamily: "var(--font-ui)" }}>Pause Between Turns</span>
            <span className="text-[11px] text-text-muted" style={{ fontFamily: "var(--font-ui)" }}>
              Manually continue after each turn
            </span>
          </div>
          <div
            className={`toggle-track ${isPaused ? "active" : ""}`}
            onClick={() => setPaused(!isPaused)}
          >
            <div className="toggle-thumb" />
          </div>
        </div>

        <div className="h-px bg-white/[0.04]" />

        {/* Voice toggle */}
        <div className="flex items-center justify-between py-3">
          <span className="text-[14px] text-text-primary" style={{ fontFamily: "var(--font-ui)" }}>Voice Output</span>
          <div
            className={`toggle-track ${ttsEnabled ? "active" : ""}`}
            onClick={() => setTTSEnabled(!ttsEnabled)}
          >
            <div className="toggle-thumb" />
          </div>
        </div>

        {/* Speed slider */}
        <div className="py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] text-text-primary" style={{ fontFamily: "var(--font-ui)" }}>Speech Speed</span>
            <span
              className="text-[13px] font-medium tabular-nums"
              style={{ fontFamily: "var(--font-mono)", color: ttsEnabled ? "#fff" : "rgba(235,235,245,0.3)" }}
            >
              {speechRate.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="w-full"
            disabled={!ttsEnabled}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>0.5x</span>
            <span className="text-[10px] text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>1.0x</span>
            <span className="text-[10px] text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>2.0x</span>
          </div>
        </div>

        {/* Info rows */}
        <div className="divide-y divide-white/[0.04]">
          <div className="flex items-center justify-between py-3">
            <span className="text-[14px] text-text-primary" style={{ fontFamily: "var(--font-ui)" }}>Turn Mode</span>
            <span className="text-[13px] text-text-secondary capitalize" style={{ fontFamily: "var(--font-ui)" }}>{config.turnMode}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[14px] text-text-primary" style={{ fontFamily: "var(--font-ui)" }}>Response Length</span>
            <span className="text-[13px] text-text-secondary capitalize" style={{ fontFamily: "var(--font-ui)" }}>{config.responseLength ?? "medium"}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[14px] text-text-primary" style={{ fontFamily: "var(--font-ui)" }}>Max Turns</span>
            <span className="text-[13px] text-text-secondary" style={{ fontFamily: "var(--font-mono)" }}>{config.maxTurns ?? 20}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[14px] text-text-primary" style={{ fontFamily: "var(--font-ui)" }}>Quality</span>
            <span className="text-[13px] text-text-secondary capitalize" style={{ fontFamily: "var(--font-ui)" }}>{config.discussionQuality ?? "balanced"}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[14px] text-text-primary" style={{ fontFamily: "var(--font-ui)" }}>Moderator</span>
            <span className={`text-[13px] ${config.enableChair ? "text-accent" : "text-text-muted"}`} style={{ fontFamily: "var(--font-ui)" }}>
              {config.enableChair ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[14px] text-text-primary" style={{ fontFamily: "var(--font-ui)" }}>Status</span>
            <span className={`text-[13px] font-medium ${
              session.status === "active" ? "text-accent" : session.status === "completed" ? "text-text-muted" : "text-accent"
            }`} style={{ fontFamily: "var(--font-ui)" }}>
              {session.status === "active" ? "Live" : session.status === "completed" ? "Complete" : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="py-4 mt-auto">
        {isActive ? (
          <button onClick={stopDiscussion} className="btn btn-danger w-full">
            Stop Discussion
          </button>
        ) : session.status !== "completed" ? (
          <button onClick={startDiscussion} className="btn btn-primary w-full">
            Start Discussion
          </button>
        ) : (
          <p className="text-center text-[13px] text-text-muted" style={{ fontFamily: "var(--font-ui)" }}>
            Discussion complete
          </p>
        )}
      </div>
    </div>
  );
}
