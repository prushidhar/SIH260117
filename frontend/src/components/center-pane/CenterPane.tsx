'use client';

import MessageArea from './MessageArea';
import ChatInput from './ChatInput';
import useIndraStore from '@/store/indra-store';

export default function CenterPane() {
  const messages = useIndraStore((state) => state.messages);

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-[#f8fafc] aurora-bg relative overflow-hidden">
      {/* Main Message Area (Handles both Antigravity centered home state and active conversation) */}
      <MessageArea />

      {/* Floating Bottom Input Bar (Only docked at bottom when active conversation is ongoing) */}
      {messages.length > 0 && <ChatInput mode="bottom" />}
    </div>
  );
}
