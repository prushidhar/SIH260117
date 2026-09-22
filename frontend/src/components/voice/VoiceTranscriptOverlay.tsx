/**
 * VoiceTranscriptOverlay — Floating overlay showing voice command transcript + intent match
 * 
 * Appears at bottom-center when a voice command is being processed or was just executed.
 * Auto-dismisses after 4 seconds.
 */

'use client';

import { Mic, CheckCircle2, AlertCircle, Brain, X } from 'lucide-react';
import { useVoiceCommandContext } from '@/providers/VoiceCommandProvider';

export default function VoiceTranscriptOverlay() {
  const {
    isListening,
    isProcessing,
    lastTranscript,
    lastIntent,
    audioLevel,
    error,
    dismissTranscript,
  } = useVoiceCommandContext();

  // Show overlay when: listening, processing, has a recent transcript, or has an error
  const isVisible = isListening || isProcessing || lastTranscript || error;

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto">
      <div className="relative flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-700/80 shadow-lg shadow-black/10 dark:shadow-black/40 min-w-[320px] max-w-[600px]">
        {/* Dismiss button */}
        {(lastTranscript || error) && (
          <button
            onClick={dismissTranscript}
            className="absolute top-1.5 right-1.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Status icon */}
        <div className="flex-shrink-0">
          {error ? (
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center">
              <AlertCircle className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
            </div>
          ) : isProcessing ? (
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
              <Brain className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
          ) : lastIntent ? (
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : lastTranscript ? (
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
              <Mic className="w-4.5 h-4.5 text-slate-500 dark:text-zinc-400" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center relative">
              <Mic className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
              {/* Pulsing ring based on audio level */}
              <span
                className="absolute inset-0 rounded-xl border-2 border-rose-400/40 dark:border-rose-500/40 pointer-events-none"
                style={{
                  transform: `scale(${1 + audioLevel * 0.4})`,
                  opacity: 0.3 + audioLevel * 0.7,
                  transition: 'transform 50ms ease-out, opacity 50ms ease-out',
                }}
              />
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          {error ? (
            <div className="text-xs text-rose-700 dark:text-rose-300 font-medium">{error}</div>
          ) : isProcessing ? (
            <div className="text-xs text-amber-700 dark:text-amber-300 font-medium font-mono">
              Processing speech with Whisper...
            </div>
          ) : lastTranscript ? (
            <>
              <div className="text-xs text-slate-800 dark:text-zinc-100 font-medium truncate">
                &ldquo;{lastTranscript}&rdquo;
              </div>
              {lastIntent ? (
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold mt-0.5">
                  ✓ {lastIntent.label} ({Math.round(lastIntent.confidence * 100)}% confidence)
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">
                  No matching command — try &ldquo;open audit&rdquo; or &ldquo;toggle sidebar&rdquo;
                </div>
              )}
            </>
          ) : isListening ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-700 dark:text-rose-300 font-medium font-mono">
                Listening for voice commands...
              </span>
              {/* Audio waveform visualization */}
              <div className="flex items-center gap-0.5 h-4">
                {[0.3, 0.7, 1.0, 0.5, 0.8, 0.4, 0.9].map((weight, i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-rose-400 dark:bg-rose-500 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(3, audioLevel * weight * 16)}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Whisper badge */}
        <div className="flex-shrink-0">
          <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-zinc-700 font-semibold whitespace-nowrap">
            WHISPER LOCAL
          </span>
        </div>
      </div>
    </div>
  );
}
