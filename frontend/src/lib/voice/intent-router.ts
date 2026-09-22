/**
 * Intent Router — Maps voice transcriptions to concrete UI actions
 * 
 * Deterministic, regex-based pattern matching. No LLM needed for a fixed
 * command vocabulary in an industrial control UI.
 */

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { useIndraStore } from '@/store/indra-store';

type StoreActions = ReturnType<typeof useIndraStore.getState>;

export interface IntentMatch {
  intent: string;
  confidence: number;
  label: string;
  action: () => void;
}

interface IntentDefinition {
  intent: string;
  label: string;
  patterns: RegExp[];
  /** Keywords that boost confidence when found */
  keywords: string[];
  /** Base confidence score for a pattern match (0–1) */
  baseConfidence: number;
  createAction: (router: AppRouterInstance, store: StoreActions, transcript: string) => () => void;
}

const INTENT_DEFINITIONS: IntentDefinition[] = [
  {
    intent: 'NAVIGATE_WORKBENCH',
    label: 'Navigate to Agent Workbench',
    patterns: [
      /\b(?:go\s+to|open|show|pull\s+up|switch\s+to|navigate\s+to)\s+(?:the\s+)?(?:workbench|agent\s*workbench|main\s*view|chat)\b/i,
      /\b(?:workbench)\b/i,
    ],
    keywords: ['workbench', 'agent', 'chat', 'main'],
    baseConfidence: 0.85,
    createAction: (router) => () => router.push('/workbench'),
  },
  {
    intent: 'NAVIGATE_CANVAS',
    label: 'Navigate to Spatial Canvas',
    patterns: [
      /\b(?:go\s+to|open|show|pull\s+up|switch\s+to|navigate\s+to)\s+(?:the\s+)?(?:spatial\s*canvas|canvas|infinite\s*canvas|node\s*workspace|graph\s*view)\b/i,
      /\b(?:spatial\s*canvas|canvas\b)/i,
    ],
    keywords: ['canvas', 'spatial', 'infinite', 'nodes', 'graph'],
    baseConfidence: 0.88,
    createAction: (router) => () => router.push('/canvas'),
  },
  {
    intent: 'NAVIGATE_KB',
    label: 'Navigate to Knowledge Base',
    patterns: [
      /\b(?:go\s+to|open|show|pull\s+up|switch\s+to|navigate\s+to)\s+(?:the\s+)?(?:knowledge\s*base|kb|documents?|rag|doc(?:ument)?\s*store)\b/i,
      /\b(?:knowledge\s*base|kb\b)/i,
    ],
    keywords: ['knowledge', 'base', 'kb', 'documents', 'rag'],
    baseConfidence: 0.85,
    createAction: (router) => () => router.push('/kb'),
  },
  {
    intent: 'NAVIGATE_AUDIT',
    label: 'Navigate to Audit Ledger',
    patterns: [
      /\b(?:go\s+to|open|show|pull\s+up|switch\s+to|navigate\s+to)\s+(?:the\s+)?(?:audit|ledger|merkle|audit\s*ledger)\b/i,
      /\b(?:audit\s*ledger|audit)\b/i,
    ],
    keywords: ['audit', 'ledger', 'merkle', 'chain'],
    baseConfidence: 0.85,
    createAction: (router) => () => router.push('/audit'),
  },
  {
    intent: 'SHOW_PUMP_STATUS',
    label: 'Stream Pump P-101 Telemetry & Control Deck',
    patterns: [
      /\b(?:show|stream|pull\s+up|display|check)\s+(?:the\s+)?(?:status\s+of\s+)?(?:pump|p-?101|feed\s+pump)(?:\s+status|\s+telemetry)?\b/i,
      /\bpump\s+(?:status|telemetry)\b/i,
    ],
    keywords: ['pump', 'p-101', 'telemetry', 'status', 'stream'],
    baseConfidence: 0.92,
    createAction: (router, store) => () => {
      router.push('/workbench');
      store.setInputValue('What is the status of pump P-101? Stream live telemetry gauge, vibration chart, and DCS setpoint control deck');
      store.selectTag('P-101');
    },
  },
  {
    intent: 'TOGGLE_SIDEBAR',
    label: 'Toggle Sidebar',
    patterns: [
      /\b(?:toggle|hide|show|close|open)\s+(?:the\s+)?(?:sidebar|left\s*(?:pane|panel)|side\s*bar)\b/i,
    ],
    keywords: ['sidebar', 'left', 'pane'],
    baseConfidence: 0.9,
    createAction: (_, store) => () => store.toggleSidebar(),
  },
  {
    intent: 'TOGGLE_INSPECTOR',
    label: 'Toggle Inspector Panel',
    patterns: [
      /\b(?:toggle|hide|show|close|open)\s+(?:the\s+)?(?:inspector|right\s*(?:pane|panel)|deliverables?\s*pane)\b/i,
    ],
    keywords: ['inspector', 'right', 'deliverables'],
    baseConfidence: 0.9,
    createAction: (_, store) => () => store.toggleRightPane(),
  },
  {
    intent: 'TOGGLE_THEME',
    label: 'Toggle Theme',
    patterns: [
      /\b(?:switch|toggle|change)\s+(?:to\s+)?(?:dark|light)\s*mode\b/i,
      /\b(?:dark|light)\s*mode\b/i,
      /\btoggle\s+(?:the\s+)?theme\b/i,
    ],
    keywords: ['dark', 'light', 'mode', 'theme'],
    baseConfidence: 0.9,
    createAction: (_, store) => () => store.toggleTheme(),
  },
  {
    intent: 'OPEN_SETTINGS',
    label: 'Open Settings',
    patterns: [
      /\b(?:open|show|pull\s+up)\s+(?:the\s+)?(?:settings|diagnostics|system\s*settings|config(?:uration)?)\b/i,
    ],
    keywords: ['settings', 'diagnostics', 'configuration'],
    baseConfidence: 0.9,
    createAction: (_, store) => () => store.setSettingsOpen(true),
  },
  {
    intent: 'OPEN_APPROVALS',
    label: 'Open HITL Approvals',
    patterns: [
      /\b(?:open|show|pull\s+up|check)\s+(?:the\s+)?(?:approvals?|hitl|pending\s*approvals?|sign[\s-]*offs?)\b/i,
      /\bpending\s*approvals?\b/i,
    ],
    keywords: ['approvals', 'hitl', 'pending', 'sign'],
    baseConfidence: 0.9,
    createAction: (_, store) => () => store.setApprovalsModalOpen(true),
  },
  {
    intent: 'NEW_CONVERSATION',
    label: 'New Conversation',
    patterns: [
      /\b(?:new|start|create|begin)\s+(?:a\s+)?(?:new\s+)?(?:conversation|chat|session)\b/i,
      /\b(?:clear|reset)\s+(?:the\s+)?(?:chat|conversation|session)\b/i,
      /\bstart\s+fresh\b/i,
    ],
    keywords: ['new', 'conversation', 'chat', 'fresh', 'clear', 'reset'],
    baseConfidence: 0.85,
    createAction: (_, store) => () => store.newConversation(),
  },
  {
    intent: 'SAVE_SESSION',
    label: 'Save Session',
    patterns: [
      /\b(?:save)\s+(?:the\s+)?(?:current\s+)?(?:session|conversation|chat)\b/i,
    ],
    keywords: ['save', 'session', 'conversation'],
    baseConfidence: 0.9,
    createAction: (_, store) => () => store.saveCurrentSession(),
  },
  {
    intent: 'SEND_TO_CHAT',
    label: 'Send to Chat',
    patterns: [
      /\b(?:ask|tell)\s+(?:indra)\s+(.+)/i,
      /\bindra[,:]?\s+(?:can\s+you|please|could\s+you)\s+(.+)/i,
    ],
    keywords: ['ask', 'tell', 'indra'],
    baseConfidence: 0.7,
    createAction: (_, store, transcript) => () => {
      // Extract the actual query after "ask indra" / "tell indra"
      const askMatch = transcript.match(/\b(?:ask|tell)\s+(?:indra)\s+(.+)/i);
      const pleaseMatch = transcript.match(/\bindra[,:]?\s+(?:can\s+you|please|could\s+you)\s+(.+)/i);
      const query = askMatch?.[1] || pleaseMatch?.[1] || transcript;
      store.sendMessage(query.trim());
    },
  },
];

/**
 * Calculate confidence score for a transcript against an intent definition
 */
function calculateConfidence(transcript: string, def: IntentDefinition): number {
  const lower = transcript.toLowerCase();
  let score = 0;

  // Check pattern matches (strongest signal)
  for (const pattern of def.patterns) {
    if (pattern.test(transcript)) {
      score = Math.max(score, def.baseConfidence);
      break;
    }
  }

  if (score === 0) return 0;

  // Boost score with keyword density
  const matchedKeywords = def.keywords.filter((kw) => lower.includes(kw.toLowerCase()));
  const keywordBoost = (matchedKeywords.length / def.keywords.length) * 0.15;
  score = Math.min(score + keywordBoost, 1.0);

  return score;
}

/**
 * Route a transcript to the best matching intent
 * @param transcript The text transcribed from speech
 * @param router Next.js App Router instance
 * @param store Zustand store state (with actions)
 * @param minConfidence Minimum confidence threshold (default 0.6)
 * @returns The best matching intent, or null if none matched
 */
export function routeIntent(
  transcript: string,
  router: AppRouterInstance,
  store: StoreActions,
  minConfidence: number = 0.6
): IntentMatch | null {
  if (!transcript || transcript.trim().length < 2) return null;

  // Strip common Whisper artifacts
  const cleaned = transcript
    .replace(/^\[.*?\]\s*/g, '') // Remove [BLANK_AUDIO] etc.
    .replace(/^(you|thank you|thanks)\.?\s*$/i, '') // Common false positives
    .trim();

  if (cleaned.length < 2) return null;

  let bestMatch: IntentMatch | null = null;
  let bestScore = 0;

  for (const def of INTENT_DEFINITIONS) {
    const confidence = calculateConfidence(cleaned, def);
    if (confidence > bestScore && confidence >= minConfidence) {
      bestScore = confidence;
      bestMatch = {
        intent: def.intent,
        confidence,
        label: def.label,
        action: def.createAction(router, store, cleaned),
      };
    }
  }

  return bestMatch;
}

/**
 * Get all available voice commands for help display
 */
export function getAvailableCommands(): { intent: string; label: string; examples: string[] }[] {
  return [
    { intent: 'NAVIGATE_WORKBENCH', label: 'Go to Workbench', examples: ['"Open the workbench"', '"Go to agent workbench"'] },
    { intent: 'NAVIGATE_KB', label: 'Go to Knowledge Base', examples: ['"Open knowledge base"', '"Show documents"'] },
    { intent: 'NAVIGATE_AUDIT', label: 'Go to Audit Ledger', examples: ['"Pull up the audit ledger"', '"Show audit"'] },
    { intent: 'TOGGLE_SIDEBAR', label: 'Toggle Sidebar', examples: ['"Hide the sidebar"', '"Show sidebar"'] },
    { intent: 'TOGGLE_INSPECTOR', label: 'Toggle Inspector', examples: ['"Open inspector"', '"Close right pane"'] },
    { intent: 'TOGGLE_THEME', label: 'Switch Theme', examples: ['"Switch to dark mode"', '"Light mode"'] },
    { intent: 'OPEN_SETTINGS', label: 'Open Settings', examples: ['"Open settings"', '"Show diagnostics"'] },
    { intent: 'OPEN_APPROVALS', label: 'Show Approvals', examples: ['"Show pending approvals"', '"Open HITL"'] },
    { intent: 'NEW_CONVERSATION', label: 'New Chat', examples: ['"New conversation"', '"Start fresh"'] },
    { intent: 'SAVE_SESSION', label: 'Save Session', examples: ['"Save the session"', '"Save conversation"'] },
    { intent: 'SEND_TO_CHAT', label: 'Ask INDRA', examples: ['"Ask INDRA to check pipe thickness"', '"Tell INDRA to run analysis"'] },
  ];
}
