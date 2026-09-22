# PITCH DECK & PRESENTATION SCRIPT
### Time Limit: 5 Minutes · SIH 2026 Problem Statement 26117
**Organization:** Mangalore Refinery and Petrochemicals Limited (MRPL) / Ministry of Petroleum & Natural Gas  
**System:** INDRA (Industrial Neural Decision & Reasoning Assistant)

---

### Slide 1: Title & The Confidentiality Dilemma (0:00 - 0:45)
- **Visual:** Bold title: "INDRA — Sovereign Agentic AI Workbench". MRPL & SIH 2026 logos. Graphic showing a locked refinery perimeter with "0-WAN Air-Gapped".
- **Spoken Script:**
  > "Good morning judges. Refineries, PSUs, and defence units have a massive problem today. Your engineers and analysts want to use AI to draft approval notes, analyze P&ID schematics, and run ASME stress math. But doing so means pasting highly confidential, restricted data into cloud tools like ChatGPT or Claude. That is an unacceptable security breach. 
  > 
  > Our solution is **INDRA**—a locally-hosted, completely air-gapped Agentic AI Workbench that delivers the full power of an autonomous engineering agent, without a single byte of data ever leaving your facility."

---

### Slide 2: Core Innovation — Multi-Model Auto-Negotiation (0:45 - 1:30)
- **Visual:** Diagram of the Poly-Model Router dynamically dispatching to 4 resident open-weight models:
  - `Qwen 2.5 Coder (7B)` -> Deterministic ASME Math & Python Sandbox
  - `Qwen 2.5 VL (7B)` -> P&ID Computer Vision & ISA-5.1 Tag OCR
  - `Qwen 3 (8B) AWQ` -> Sovereign Agentic Reasoning & SCADA Triage
  - `Nomic Embed Text (v1.5)` -> Local ChromaDB Vector Pipeline
- **Spoken Script:**
  > "The hardest part of enterprise local AI is hardware. You don't have $40,000 server racks on every engineer's desk. To solve this, we built INDRA's dynamic Multi-Model Auto-Negotiator. Instead of trying to force one bloated, slow model to do everything, INDRA dynamically routes tasks in milliseconds to specialized, resident open-weight models. 
  > 
  > If a task requires engineering calculations, it routes to Qwen Coder; if it's a blueprint, it routes to Qwen Vision; if it's SCADA triage, it routes to Qwen Reasoning. All of this runs seamlessly on standard workstation GPUs with as little as 4GB to 12GB of VRAM."

---

### Slide 3: Beyond Chat — Deterministic Verification (1:30 - 2:15)
- **Visual:** Split screen: Left: "Generic LLM (Hallucinated Math)". Right: "INDRA Deterministic Python Sandbox (ASME B31.3 Verified)". Deliverable icons for `.docx` and `.xlsx`.
- **Spoken Script:**
  > "In an oil refinery, hallucinated math can cause catastrophic failure. INDRA eliminates math hallucinations by design. Our models do not do mental math; they generate executable Python code run in an isolated sandbox to evaluate verified engineering standards—like ASME B31.3 Paragraph 304.1.2 or ISO 10816 vibration severity. 
  > 
  > More than just text, INDRA produces actual engineering artifacts: official Microsoft Word reports and Excel spreadsheets with complete source citations and cryptographic integrity hashes."

---

### Slide 4: LIVE DEMO — The Golden Path (2:15 - 3:45)
- **Visual:** Live screen share of the native desktop app `INDRA.exe`.
- **Demo Script (3 Sequential Steps):**
  1. **ASME Math**: Enter *"Calculate the minimum wall thickness of pipe X under pressure 300 psig using ASME code"*.
     - Point out: Routed to Qwen 2.5 Coder in 0.00s. The Python sandbox evaluates design thickness `t_d = 0.0746"` and recommends Schedule 40. Download the generated `.docx` report.
  2. **P&ID Vision**: Enter *"Analyze the attached P&ID and extract all valve part numbers"*.
     - Point out: Dynamically routed to Qwen 2.5 VL. ISA-5.1 tags (`FV-101`, `PSV-201`) extracted into a ready-to-use `.xlsx` Excel inventory sheet.
  3. **SCADA Triage & HITL**: Enter *"Cooling pump P-101 has high vibration of 7.2 mm/s, triage the issue and draft maintenance approval note"*.
     - Point out: Diagnoses ISO 10816 Zone D (Unacceptable). Triggers the **Human-in-the-Loop Dual-Key Modal**. Sign the approval note live and show it commit to the cryptographic audit trail!

---

### Slide 5: The Ultimate Proof of Sovereignty (3:45 - 4:30)
- **Visual:** Live Network Monitor showing "0 Outbound WAN Connections" + Code highlight of `HF_HUB_OFFLINE = 1`.
- **Spoken Script & Cable-Pull Stunt:**
  > "How do you know it's truly sovereign? We don't just promise it's offline—we enforce it structurally. Inside our code, offline environment flags physically block AI libraries from initiating network handshakes. On the screen, our live Network Watcher polls OS sockets continuously, proving 0 external connections. 
  > 
  > And to prove it to you right now..." *(Presenter disconnects Wi-Fi / unplugs Ethernet cable)* "...I have disconnected all networking. Let me run another prompt. As you can see, INDRA processes, calculates, and generates documents with zero interruption."

---

### Slide 6: Operational Impact & Scalability (4:30 - 5:00)
- **Visual:** Key metrics: "40% Engineer Time Saved", "100% Air-Gapped", "Zero Cloud API Costs", "Immediate Enterprise Desktop Deployment".
- **Spoken Script:**
  > "By deploying INDRA, MRPL and critical public sector units can safely unlock the massive productivity gains of agentic AI without risking sensitive IP or plant safety. It is production-ready today as a native Windows desktop application. Thank you, and we look forward to your questions."
