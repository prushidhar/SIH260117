# Sovereign Agentic AI Workbench - Backend

This is the Hugging Face-based, fully sovereign backend for the SIH 2026 PS 26117 project.

## Code-Level Proof of Sovereignty

To guarantee that this application cannot "call home" or use cloud AI services, it strictly enforces an offline mode at the framework level. In `backend/src/main.py`, we unconditionally set:

```python
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
```

**Why this matters for the judges:**
This is not merely a monitoring claim. With these flags set, the Hugging Face `transformers` and `huggingface_hub` libraries will intrinsically refuse to initiate any network connection. If a requested model is not found in the local cache, the framework will explicitly raise an `OfflineModeIsEnabled` error rather than attempting a download.

You can physically disconnect the network adapter, and the entire AI workbench—including reasoning, coding, vision, and vector search—will continue to operate perfectly.

## Setup Instructions

1. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. Download models (requires internet, run exactly once):
   ```bash
   python backend/scripts/download_models.py
   ```

3. Run the backend (offline):
   ```bash
   # Network can be disabled now!
   cd backend
   python -m uvicorn src.main:app --host 0.0.0.0 --port 8000
   ```

## Architecture

- **ModelManager**: A VRAM-aware singleton (`src/model_manager.py`) that manages multiple resident models, automatically evicting least-recently-used models when the strict VRAM budget is exceeded.
- **AgentLoop**: An orchestrator (`src/agent.py`) that manages the plan-act-observe cycle, dispatching to different models (Reasoning, Coding, Vision) based on task semantics.
- **Knowledge Base**: Embedded vector store (`src/kb.py`) using ChromaDB and Nomic embeddings.
- **Tool Registry**: Secure Python sandbox execution and `.docx/.pptx/.xlsx` document generation (`src/tools.py`).
- **Network Watcher**: Real-time `psutil` monitoring to prove no unauthorized outbound connections exist, streamed over WebSocket.
