# DEPLOYMENT GUIDE
### Sovereign Agentic AI Workbench · SIH 2026 · PS 26117 · MRPL

This guide provides step-by-step instructions for judges and evaluators to deploy the Sovereign Agentic AI Workbench entirely on-premises, proving its air-gapped capabilities.

---

## 1. Hardware Prerequisites
- **OS:** Windows 11 / Linux (Ubuntu 22.04+)
- **GPU:** Minimum 12GB VRAM (NVIDIA RTX 3060/4070 or better). Recommended: 24GB VRAM (RTX 3090/4090).
- **RAM:** 32GB System RAM minimum.
- **Storage:** 50GB free space for model weights (SSD highly recommended).

---

## 2. One-Time Setup (Online Phase)

Before isolating the system, you must download the dependencies and the model weights.

### A. Install Backend Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### B. Download AI Models to Cache
Run the download script. This pulls ~17GB of model weights for Reasoning, Coding, Vision, and Embeddings directly to your local cache.
```bash
python scripts/download_models.py
```
*Wait for this to complete 100%.*

### C. Install Frontend Dependencies
```bash
cd ../frontend
npm install
npm run build
```

---

## 3. The Air-Gap (Offline Phase)

**CRITICAL STEP:** Physically disconnect the Ethernet cable or disable the Wi-Fi adapter on the host machine. 
The system is now completely sovereign.

---

## 4. Starting the Workbench

### Start the Backend Server
```bash
cd backend
source venv/bin/activate
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000
```
*Note: The backend enforces `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1` at the code level, guaranteeing no outbound network requests can be made by the Hugging Face libraries.*

### Start the Frontend UI
Open a new terminal.
```bash
cd frontend
npm run start
```

---

## 5. Using the System
1. Open a browser and navigate to `http://localhost:3000`.
2. Notice the **Network Monitor** on the right sidebar. It actively polls the system for outbound connections, proving to users that 0 external connections are being made.
3. Upload an inspection report (or use the provided `inspection_report.txt` in the knowledge base) and ask the AI to "Draft an approval note".
4. Watch the Agent Trace route the task, execute tools, and generate a downloadable `.docx` file entirely on local hardware.

---

## Troubleshooting

- **CUDA Out of Memory (OOM):** If the backend crashes on generation, your GPU has less than the required VRAM. The `ModelManager` is designed to aggressively evict models, but a baseline of 12GB is required for the Qwen3-8B-AWQ model.
- **Port Conflicts:** If port 8000 or 3000 are taken, adjust the `--port` flag for Uvicorn and update the `.env.local` file in the frontend to point to the new backend port.
