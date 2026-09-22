'use client';

// User explicitly requested clean, ChatGPT-style output without the terminal execution block
export default function ToolExecution({
  execution,
}: {
  execution: { code: string; output: string; language: string; toolName?: string };
}) {
  return null;
}
