'use client';

import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import useIndraStore from '@/store/indra-store';
import { useWebSocket } from '@/providers/WebSocketProvider';

export function useAgentStream() {
  const { 
    messages, 
    inputValue, 
    setInputValue 
  } = useIndraStore();

  const {
    networkStatus,
    taskStatus,
    isAgentWorking,
    sendMessage,
    abortTask,
    retryMessage,
  } = useWebSocket();

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
    },
    [setInputValue]
  );

  const handleSubmit = useCallback(
    async (
      e?: FormEvent, 
      attachments?: { id?: string; name: string; type: string; size: string; url?: string }[]
    ) => {
      if (e) e.preventDefault();
      if (!inputValue.trim() && (!attachments || attachments.length === 0)) return;
      await sendMessage(inputValue, attachments);
    },
    [inputValue, sendMessage]
  );

  const reload = useCallback(async () => {
    const lastAgentMessage = [...messages].reverse().find((m) => m.role === 'agent');
    if (lastAgentMessage) {
      await retryMessage(lastAgentMessage.id);
    }
  }, [messages, retryMessage]);

  const lastMessage = messages[messages.length - 1];
  const error = lastMessage?.isError ? (lastMessage.errorDetails?.message || lastMessage.content) : null;

  return {
    messages,
    input: inputValue,
    setInput: setInputValue,
    handleInputChange,
    handleSubmit,
    status: taskStatus,
    isAgentWorking,
    stop: abortTask,
    reload,
    error,
    networkStatus,
  };
}
