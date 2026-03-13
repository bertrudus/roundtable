"use client";

import { useDiscussionStore } from "@/stores/discussionStore";

export function SettingsPanel() {
  const { session, ttsEnabled, setTTSEnabled, speechRate, setSpeechRate, isActive, stopDiscussion, startDiscussion } =
    useDiscussionStore();

  if (!session) return null;

  const { config } = session;

  return (
    <div className="flex flex-col h-full">
      {/* Session info */}
      <div className="px-4 py-4 border-b border-border space-y-3">
        <div>
          <span className="label-mono block mb-1">Topic</span>
          <p className="text-sm font-[family-name:var(--font-serif)] text-white leading-snug">
            {config.topic}
          </p>
        </div>
        {config.description && (
          <div>
            <span className="label-mono block mb-1">Context</span>
            <p className="text-[13px] font-[family-name:var(--font-serif)] text-text-secondary leading-snug">
              {config.description}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="label-mono">Voice Output</span>
          <button
            onClick={() => setTTSEnabled(!ttsEnabled)}
            className={`label-mono px-3 py-1.5 border transition-colors ${
              ttsEnabled
                ? "border-felt-light text-felt-light bg-felt-light/10"
                : "border-border text-text-muted"
            }`}
          >
            {ttsEnabled ? "ON" : "OFF"}
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="label-mono">Speech Speed</span>
            <span className="label-mono text-white">{speechRate.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="w-full accent-felt-light h-1"
            disabled={!ttsEnabled}
          />
          <div className="flex justify-between label-mono text-[9px] text-text-muted mt-1">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.0x</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="label-mono">Turn Mode</span>
          <span className="label-mono text-white capitalize">{config.turnMode}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="label-mono">Response Length</span>
          <span className="label-mono text-white capitalize">{config.responseLength ?? "medium"}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="label-mono">Max Turns</span>
          <span className="label-mono text-white">{config.maxTurns ?? 20}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="label-mono">Status</span>
          <span className={`label-mono ${session.status === "active" ? "text-green-400" : session.status === "completed" ? "text-text-muted" : "text-gold"}`}>
            {session.status}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-4 mt-auto border-t border-border">
        {isActive ? (
          <button onClick={stopDiscussion} className="btn btn-danger w-full">
            Stop Discussion
          </button>
        ) : session.status !== "completed" ? (
          <button onClick={startDiscussion} className="btn btn-primary w-full">
            Start Discussion
          </button>
        ) : (
          <p className="label-mono text-center">Discussion complete</p>
        )}
      </div>
    </div>
  );
}
