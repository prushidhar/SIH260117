# EXECUTIVE SUMMARY & ARCHITECTURAL WRITEUP
### SIH 2026 Problem Statement 26117
**Title:** Sovereign On-Premise Agentic AI Workbench using Open-Weight Multimodal LLMs for Confidential Industrial Work

## 1. Problem Statement & Stakeholder Needs

SIH26117 calls for a fully on-premises “Agentic AI Workbench” for Mangalore Refinery (MRPL) that uses only open-source LLMs and multimodal models to assist with confidential engineering tasks. In effect, the solution must be a secure, air-gapped AI platform that can ingest text and diagrammatic data (e.g. P&IDs, sensor logs) and execute multi-step “agentic” analyses or automation without leaking any data off-site. 

**Stakeholder needs and constraints:** MRPL (Ministry of Petroleum & Natural Gas) handles highly sensitive refinery engineering data that cannot leave the secure perimeter. The solution must be deployable on MRPL’s own hardware (single or few GPUs) with zero outbound networking, full audit logs, and reproducible state. It must use only “open-weight” (i.e. self-hosted) LLMs and tool frameworks, not proprietary cloud APIs.

## 2. Proposed Approach

Build a modular workbench combining:
1. **A Lightweight Router (Poly-Model Router):** Dispatches tasks to specialized local LLMs (e.g. a coding model, a vision-LM model, etc.) in <10ms.
2. **Stateful Agent Harness:** Manages multi-step reasoning via a directed acyclic graph (DAG) of agent steps.
3. **Sandboxed Tools:** Deterministic calculations (e.g. pipe-stress formulas) via Python sandboxing to eliminate math hallucinations.
4. **RAG Index:** Embedded ChromaDB index of MRPL manuals/policies for factual answers.
5. **Secure Execution Environment:** A live network sniffer to prove “0-WAN” (no external calls) and ensure strict air-gapped operation.
6. **Polished GUI:** A frontend that lets engineers query the agents and see results (reports, annotated diagrams, etc.).

**Outcome:** A demonstrable on-premise AI workbench that can answer questions like *“Calculate the minimum wall thickness of pipe X under pressure P using ASME code”* or *“Analyze the attached P&ID and extract all valve part numbers”* – generating a correct, audited answer with source citations and native-format outputs (Word/Excel).

## 3. Expected Deliverables (Fulfilled)
- Code repository (Backend FastAPI + Frontend Next.js).
- Setup instructions (`DEPLOYMENT_GUIDE.md`).
- Architectural writeup (This Document).
- A short slide deck (`PITCH_DECK.md`).

## 4. Functional & Non-Functional Requirements

### Functional
- **Multimodal Input Ingestion:** Handle text and image inputs (PDFs, P&IDs).
- **Multi-Model Orchestration:** Agentic framework where different LLMs handle specialized subtasks.
- **Chained Tool Execution & RAG:** Multi-step workflows with tool calling (Python sandbox, vector retrieval).
- **Security / Control Tools:** Sand-boxed arithmetic engine and a network sniffer.
- **User Interface:** A clear GUI for engineers to input queries and view generated outputs.

### Non-Functional
- **Performance:** Low-latency routing.
- **Hardware Constraints:** Must run on a single machine with 1–2 GPUs.
- **Reproducibility & Auditability:** All agent decisions and intermediate state must be reproducible (tamper-proof logging, Merkle hashing).
- **Zero External Comms:** Complete air-gapped verification.

## 5. Unique Differentiators for SIH Submission

To win SIH, our solution emphasizes:
- **Complete On-Prem Security:** Demonstrated air-gap enforcement via live packet-sniffing and cryptographic audit trails for every output.
- **Specialized Agent Design:** A poly-model router that intelligently selects the best LLM for each subtask (e.g., routing vision tasks to a Qwen-VL model and numeric calculations to a small math LLM).
- **Deterministic Subprocesses:** Offloading all critical engineering calculations to trusted Python modules rather than relying on LLM math, eliminating “hallucinated” results.
- **Explainability & Verification:** A step-by-step audit report (Agent Trace) for each query showing the prompt, the agent/model used, tool calls made, and results obtained.

## 6. One-Liner and Elevator Pitch

**One-liner (judge-facing):** *"Our solution is a 100%-air-gapped AI Workbench for refinery engineers that orchestrates multiple local LLMs (text and vision) to securely analyze engineering diagrams and data – producing audit-proof reports entirely on-premise."*

**Elevator Pitch:** 
The MRPL engineering team gets a chat-like workbench that understands their specialized data without any cloud. They can upload a P&ID diagram or ask a process question, and our system routes the request to the right AI agents. Behind the scenes, every step is recorded and cross-checked: calculations use a trusted Python module, outputs are hashed to prevent tampering, and a live sniffer ensures zero external network calls. The result: fast, explainable answers to complex technical questions, delivered in native formats and with traceable evidence.

## 7. Gap Analysis & Existing Platforms vs. SIH26117 Requirements

| Requirement | Existing Support | Gap for SIH26117 |
|---|---|---|
| **Air-Gapped Deployment** | Rasa, LangChain, CrewAI support self-hosting. | Need packaged no-internet solution with 0-WAN proof. |
| **Open-Weight Multimodal** | Local LLMs (Llama-2, Qwen) and VLM exist. | Selecting and integrating suitable open models for text+image seamlessly. |
| **Agentic Orchestration** | LangChain, CrewAI provide orchestration frameworks. | Need a self-hosted orchestration layer with a multi-LLM router. |
| **Tool Execution** | LangChain allows Python tools. | Specialized math sandbox and deep vector integration needed. |
| **Audit & Logging** | Enterprise platforms have logs. | Must design in full tamper-proof logging and state checkpoints. |
| **UI/UX for Engineering** | No direct OSS. | Need a polished industrial interface integrating all components. |
| **Zero External Comms** | Some platforms allow offline mode. | Need custom packet-sniffer or isolation enforcement (0-WAN). |
| **Hardware Performance** | Torchserve supports GPU inference. | Multi-model <10ms routing on a single GPU constraint. |

*Our solution combines the best of these elements into a single, cohesive, highly-secure platform specifically tailored for the stringent requirements of MRPL and SIH26117.*
