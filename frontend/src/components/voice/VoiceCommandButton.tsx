/**
 * VoiceCommandButton — Header mic button for voice-to-UI commands
 * 
 * States: Idle → Loading (model download) → Listening (pulsing mic) → Processing (inference)
 */

'use client';

import { Mic, MicOff, Loader2, Brain } from 'lucide-react';
import { useVoiceCommandContext } from '@/providers/VoiceCommandProvider';

export default function VoiceCommandButton() {
  const {
    isListening,
    isModelLoaded,
    isModelLoading,
    modelLoadProgress,
    isProcessing,
    audioLevel,
    toggleListening,
    error,
  } = useVoiceCommandContext();

  // Determine visual state
  const isActive = isListening || isProcessing;

  const getButtonClasses = () => {
    const base = 'relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold transition-all cursor-pointer border shadow-xs';

    if (error) {
      return `${base} bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300`;
    }
    if (isProcessing) {
      return `${base} bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 animate-pulse`;
    }
    if (isListening) {
      return `${base} bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 text-rose-700 dark:text-rose-300 ring-2 ring-rose-400/30 dark:ring-rose-500/30`;
    }
    if (isModelLoading) {
      return `${base} bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300`;
    }
    return `${base} bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200`;
  };

  const getIcon = () => {
    if (isProcessing) {
      return <Brain className="w-3.5 h-3.5 animate-pulse" />;
    }
    if (isModelLoading) {
      return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    }
    if (isListening) {
      return <Mic className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
    }
    return <MicOff className="w-3.5 h-3.5" />;
  };

  const getLabel = () => {
    if (error) return 'Error';
    if (isProcessing) return 'Thinking...';
    if (isModelLoading) return `Loading ${modelLoadProgress}%`;
    if (isListening) return 'Listening';
    if (!isModelLoaded) return 'Voice';
    return 'Voice';
  };

  const getTitle = () => {
    if (error) return `Voice Error: ${error}`;
    if (isProcessing) return 'Processing speech with Whisper...';
    if (isModelLoading) return `Downloading Whisper model (${modelLoadProgress}%)...`;
    if (isListening) return 'Listening for voice commands — click to stop';
    if (!isModelLoaded) return 'Click to load Whisper model (~39 MB one-time download)';
    return 'Click to start voice commands';
  };

  return (
    <button
      onClick={toggleListening}
      className={getButtonClasses()}
      title={getTitle()}
    >
      {/* Audio level ring animation when listening */}
      {isListening && (
        <span
          className="absolute inset-0 rounded-full border-2 border-rose-400/50 dark:border-rose-500/50 pointer-events-none"
          style={{
            transform: `scale(${1 + audioLevel * 0.3})`,
            opacity: 0.3 + audioLevel * 0.7,
            transition: 'transform 50ms ease-out, opacity 50ms ease-out',
          }}
        />
      )}

      {getIcon()}
      <span>{getLabel()}</span>

      {/* Model load progress bar */}
      {isModelLoading && (
        <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-violet-200 dark:bg-violet-800 rounded-full overflow-hidden">
          <span
            className="h-full bg-violet-500 dark:bg-violet-400 rounded-full transition-all duration-300"
            style={{ width: `${modelLoadProgress}%`, display: 'block' }}
          />
        </span>
      )}
    </button>
  );
}
