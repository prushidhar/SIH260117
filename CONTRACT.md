# CONTRACT.md — Sovereign Agentic AI Workbench
### Shared API/WebSocket contract · hand this to BOTH the frontend and backend builders before either starts

This is the single source of truth both sides build against. Neither side needs access to the other's code or repo — they only need this document and the base URLs agreed below.

---

## 0. Base URLs (agree on this once, don't change it mid-build)

- Backend REST: `http://localhost:8000`
- Backend WebSocket: `ws://localhost:8000`
- Frontend dev server: `http://localhost:3000`

**Backend must enable CORS** for `http://localhost:3000` (and whatever origin the frontend actually runs on) — add FastAPI's `CORSMiddleware` allowing that origin, credentials, and all methods/headers. This is the single most common "it works for each of us alone but not together" bug in a split build — handle it from the start, not as a late fix.

Frontend must read the base URLs from env vars (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_URL`), defaulting to the values above, so either side can change the port later without the other's code changing.

---

## 1. REST endpoints

- `POST /api/tasks` — body: `{ text: string, fileIds?: string[] }` → `{ taskId: string }`
- `GET /api/history` → `{ tasks: [{ taskId, title, type, timestamp, status }] }`
- `GET /api/history/{taskId}` → `{ taskId, messages, toolCalls, deliverables }`
- `POST /api/files` (multipart upload) → `{ fileId, filename, mimeType, previewUrl }`
- `GET /api/kb/documents` → `{ documents: [{ id, title, ingestedAt, tag }] }`
- `POST /api/kb/documents` (upload) → `{ id }`
- `GET /api/kb/search?q=` → `{ results: [{ documentId, title, snippet, score }] }`
- `GET /api/models` → `{ models: [{ id, name, sizeParams, capabilities: string[], vramGb, loaded, updatedAt }] }`
- `POST /api/models` — body: `{ repoId: string }` → `{ jobId }`
- `GET /api/settings` / `PUT /api/settings`

## 2. WebSocket events

`WS /ws/tasks/{taskId}` — server pushes, in order:
- `{ type: "model_selected", model: string, taskType: string, confidence: number, reason: string }`
- `{ type: "plan", steps: string[] }`
- `{ type: "tool_call", id: string, tool: string, args: object, status: "running" }`
- `{ type: "tool_result", id: string, output: string, status: "done" | "error" }`
- `{ type: "token", text: string }` (repeated)
- `{ type: "deliverable", filename: string, url: string, kind: "docx"|"pptx"|"xlsx"|"code" }`
- `{ type: "done" }`

`WS /ws/network` — pushed ~1/sec: `{ timestamp, action: string, destination: string, status: "contained" | "blocked" }`

`WS /ws/models/{jobId}` — model-add progress: `{ percent: number, stage: string }`

---

## 3. Ground rules for the split build

- **Frontend builder:** implement against this contract exactly, and ship a mock server (matching these same shapes, with realistic latency) so you can build and demo standalone without waiting on the backend. Validate every response with a schema (e.g. `zod`) so a real mismatch fails loudly instead of silently.
- **Backend builder:** implement against this contract exactly. Field names, event order, and types must match — the frontend will not be adjusted to accommodate drift on your end.
- **Neither side edits this file unilaterally.** If either of you finds a genuine gap or ambiguity while building, that's a conversation between you two (or with whoever's coordinating), then this file gets updated and both sides re-sync — not a silent local workaround on one side.
- **Integration step, once both are done:** point the frontend's env vars at the real backend's base URLs, run through all 3 golden-path demo scenarios together, and confirm nothing needed to change on either side. If something did need to change, it means this contract had a gap — fix the contract, not just the symptom.
