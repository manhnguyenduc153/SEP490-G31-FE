"use client";

import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Radio, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface OneTimeAudioPlayerProps {
  src: string;
  /** localStorage key used to remember that this recording was already played, so it can never be replayed (page reload, leaving/re-entering the exam, etc). */
  storageKey: string;
  /** Attempt to start playback automatically on mount (falls back to a one-shot start button if the browser blocks autoplay). */
  autoStart?: boolean;
  className?: string;
}

const STORAGE_PREFIX = "examListeningPlayed_";

function wasAlreadyPlayed(storageKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + storageKey) === "1";
  } catch {
    return false;
  }
}

function markAsPlayed(storageKey: string) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + storageKey, "1");
  } catch {
    // ignore storage errors (quota / private mode)
  }
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * A locked-down audio player for Listening exams: the recording can be started at most once
 * (auto-play on mount, with a one-shot fallback button if the browser blocks autoplay), and once
 * playing it cannot be paused, sought/rewound, or replayed after it ends — only the volume is
 * adjustable. "Already played" is persisted so leaving/reloading the exam doesn't grant a replay.
 */
export function OneTimeAudioPlayer({ src, storageKey, autoStart = true, className }: OneTimeAudioPlayerProps) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastTimeRef = useRef(0);
  const startedRef = useRef(false);

  const [status, setStatus] = useState<"locked" | "idle" | "playing" | "ended">(() =>
    wasAlreadyPlayed(storageKey) ? "locked" : "idle"
  );
  const [needsManualStart, setNeedsManualStart] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setStatus(wasAlreadyPlayed(storageKey) ? "locked" : "idle");
  }, [storageKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || status === "locked") return;

    const onTimeUpdate = () => {
      lastTimeRef.current = audio.currentTime;
      setProgress(audio.currentTime);
    };
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onSeeking = () => {
      // Block any attempt to jump forward/back (only natural, contiguous playback is allowed)
      if (Math.abs(audio.currentTime - lastTimeRef.current) > 0.75) {
        audio.currentTime = lastTimeRef.current;
      }
    };
    const onPause = () => {
      // Disallow pausing (e.g. spacebar) once playback has started and hasn't finished yet
      if (startedRef.current && !audio.ended) {
        audio.play().catch(() => {});
      }
    };
    const onEnded = () => {
      startedRef.current = false;
      setStatus("ended");
      markAsPlayed(storageKey);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("seeking", onSeeking);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("seeking", onSeeking);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [status, storageKey]);

  const startPlayback = () => {
    const audio = audioRef.current;
    if (!audio || status !== "idle") return;
    startedRef.current = true;
    audio
      .play()
      .then(() => {
        setStatus("playing");
        setNeedsManualStart(false);
      })
      .catch(() => {
        // Autoplay blocked by the browser — require one explicit tap to start (still one-shot)
        startedRef.current = false;
        setNeedsManualStart(true);
      });
  };

  useEffect(() => {
    if (autoStart && status === "idle") {
      startPlayback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    setMuted(value === 0);
    if (audioRef.current) audioRef.current.volume = value;
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) audioRef.current.volume = next ? 0 : volume || 1;
  };

  const statusLabel =
    status === "locked" || status === "ended"
      ? t("exams.listeningStatusEnded")
      : status === "playing"
      ? t("exams.listeningStatusPlaying")
      : t("exams.listeningStatusReady");

  const progressPct = duration > 0 ? Math.min(100, (progress / duration) * 100) : status === "locked" ? 100 : 0;

  return (
    <div className={`p-3.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl ${className ?? ""}`}>
      {status !== "locked" && (
        <audio ref={audioRef} src={src} tabIndex={-1} onContextMenu={(e) => e.preventDefault()} />
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 shrink-0">
          {status === "playing" ? (
            <Radio className="w-4 h-4 animate-pulse" />
          ) : status === "locked" || status === "ended" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Radio className="w-4 h-4" />
          )}
          {t("exams.listeningAudioTitle")}
        </span>

        <div className="flex-1 min-w-[120px] flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-blue-200/70 dark:bg-blue-900/60 overflow-hidden">
            <div className="h-full bg-blue-500 transition-[width]" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-300 tabular-nums shrink-0">
            {formatTime(progress)} / {formatTime(duration)}
          </span>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
          {statusLabel}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
            title={t("exams.listeningVolumeLabel")}
          >
            {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-20 accent-blue-500"
            aria-label={t("exams.listeningVolumeLabel")}
          />
        </div>
      </div>

      {needsManualStart && status === "idle" && (
        <button
          type="button"
          onClick={startPlayback}
          className="mt-2.5 w-full py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          {t("exams.listeningStartBtn")}
        </button>
      )}
    </div>
  );
}
