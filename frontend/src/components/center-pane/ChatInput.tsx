'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Paperclip, 
  ArrowRight, 
  Plus, 
  Mic, 
  FileCheck2, 
  Loader2,
  Square
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { useWebSocket } from '@/providers/WebSocketProvider';

export default function ChatInput({ mode = 'bottom' }: { mode?: 'center' | 'bottom' }) {
  const { sendMessage, isAgentWorking, abortTask } = useWebSocket();
  const { 
    inputValue, 
    setInputValue
  } = useIndraStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<{ id?: string; name: string; type: string; size: string; url?: string } | null>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, 130);
    textarea.style.height = `${Math.max(nextHeight, 38)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [inputValue, adjustHeight]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAgentWorking) {
        e.preventDefault();
        abortTask();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isAgentWorking, abortTask]);

  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInputValue((inputValue ? `${inputValue} ` : '') + 'Perform ASME B31.3 wall thickness evaluation');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => (result as any)[0].transcript)
          .join('');
        setInputValue(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text && !selectedAttachment) return;
    if (isAgentWorking) return;

    sendMessage(text || `Process attached document: ${selectedAttachment?.name}`);
    setInputValue('');
    setSelectedAttachment(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = '38px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setTimeout(() => {
      setSelectedAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: `${(file.size / 1024).toFixed(1)} KB`,
      });
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }, 400);
  };

  const isCenter = mode === 'center';

  return (
    <div className={isCenter ? 'w-full max-w-xl mx-auto' : 'absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 z-20'}>
      <div className={isCenter ? 'space-y-3' : 'relative max-w-3xl mx-auto'}>
        {/* Input Card */}
        <div className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          {/* File Attachment Chip */}
          {(selectedAttachment || isUploading) && (
            <div className="flex items-center gap-2 px-4 pt-3 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 font-medium">
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                    <span className="text-slate-600 dark:text-zinc-400">Processing file...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{selectedAttachment?.name}</span>
                    <span className="text-slate-400 dark:text-zinc-500 text-[10px]">({selectedAttachment?.size})</span>
                    <button 
                      onClick={() => setSelectedAttachment(null)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 ml-1 font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Main Input Row */}
          <div className="flex items-start px-4 pt-3 pb-1.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or request a calculation... (Shift+Enter for newline)"
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 min-h-[38px] max-h-[130px] font-normal py-1.5 leading-5 scrollbar-thin overflow-y-auto"
              autoFocus={isCenter}
              disabled={isAgentWorking}
            />
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.png,.jpg"
            onChange={handleFileChange}
          />

          {/* Card Bottom Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs">
            {/* Left Controls: Add Attachment Button */}
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isAgentWorking}
                className="p-1.5 rounded-md text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
                title="Attach file"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Right Controls: Voice Mic & Solid Send Button */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isAgentWorking}
                className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors rounded hover:bg-slate-200 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                title="Attach Document"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              <button 
                onClick={toggleSpeechRecognition}
                className={`p-1.5 transition-colors rounded cursor-pointer ${
                  isListening 
                    ? 'text-rose-600 bg-rose-50 border border-rose-200' 
                    : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800'
                }`}
                title={isListening ? 'Listening...' : 'Voice Input'}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              {/* Action Button: Stop if working, Send otherwise */}
              {isAgentWorking ? (
                <button
                  type="button"
                  onClick={abortTask}
                  className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 text-xs font-medium cursor-pointer"
                  title="Stop Execution"
                >
                  <Square className="w-3 h-3 fill-current text-white" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={(!inputValue.trim() && !selectedAttachment) || isUploading}
                  className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
