/**
 * VoiceCommandProvider — React Context provider for global voice command state
 * 
 * Wraps the app to share voice command state (model status, listening state, etc.)
 * across all components without prop drilling.
 */

'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useVoiceCommand, type VoiceCommandState } from '@/hooks/useVoiceCommand';

const VoiceCommandContext = createContext<VoiceCommandState | null>(null);

export function VoiceCommandProvider({ children }: { children: ReactNode }) {
  const voiceState = useVoiceCommand();

  return (
    <VoiceCommandContext.Provider value={voiceState}>
      {children}
    </VoiceCommandContext.Provider>
  );
}

/**
 * Consumer hook — use this in any component to access voice command state
 * @throws Error if used outside VoiceCommandProvider
 */
export function useVoiceCommandContext(): VoiceCommandState {
  const context = useContext(VoiceCommandContext);
  if (!context) {
    throw new Error('useVoiceCommandContext must be used within a <VoiceCommandProvider>');
  }
  return context;
}
