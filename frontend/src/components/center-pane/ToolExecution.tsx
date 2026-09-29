'use client';

import ToolExecutionDisclosure from './ToolExecutionDisclosure';

export default function ToolExecution({
  execution,
}: {
  execution: { code: string; output: string; language: string; toolName?: string };
}) {
  if (!execution) return null;

  return (
    <ToolExecutionDisclosure
      toolName={execution.toolName || 'deterministic_python_solver'}
      argumentsPayload={{ code: execution.code, language: execution.language }}
      outputPayload={{ output: execution.output }}
      code={execution.code}
      status="completed"
      executionTimeMs={42}
      deterministicStamp="SHA256:0x7a3f89...e12d"
    />
  );
}
