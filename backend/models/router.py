"""
Intelligent Model Router for INDRA Sovereign Workbench
Autonomous, zero-WAN task classification and multi-model orchestration.
Routes tasks across local open-weight models based on engineering domain specialization:
- Qwen 2.5 Coder (7B): Deterministic ASME/API math, physics formulas, and sandbox code
- Qwen 3 (8B) AWQ: Multi-step forensic reasoning, ISO 10816 vibration triage, FFT harmonics
- Qwen 2.5 VL (7B): Multimodal P&ID computer vision, ISA-5.1 tag localization, and drawings
- Nomic Embed Text (v1.5): Local dense vector embeddings and semantic standards retrieval
"""
from typing import Tuple, Dict, Any, Optional

TASK_PROFILES = {
    "coding": {
        "model_name": "Qwen 2.5 Coder (7B)",
        "model_path": r"D:\models\Qwen2.5-Coder-7B-Instruct",
        "role": "coding",
        "parameters": "7.6B",
        "quantization": "BF16 / FP16",
        "description": "Deterministic ASME/API/ISO calculations, unit conversion, and Python sandbox execution",
        "keywords": [
            "calculate", "code", "math", "formula", "compute", "python", "script",
            "equation", "thickness", "asme", "b31.3", "b16.5", "mawp", "hydraulics",
            "head", "tdh", "brake horsepower", "bhp", "flow rate", "delta p",
            "cv", "valve sizing", "isa-75", "fouling", "tema", "pipe wall"
        ]
    },
    "reasoning": {
        "model_name": "Qwen 3 (8B) AWQ",
        "model_path": r"D:\models\Qwen3-8B-AWQ",
        "role": "reasoning",
        "parameters": "8.2B",
        "quantization": "AWQ 4-Bit Quantized",
        "description": "ISO 10816 vibration triage, FFT harmonics root-cause analysis, and multi-agent plan orchestration",
        "keywords": [
            "vibration", "harmonics", "misalignment", "unbalance", "looseness",
            "bearing", "fft", "spectral", "triage", "iso 10816", "severity",
            "cavitation", "surge", "npsh", "margin", "compressor surge",
            "anti-surge", "root cause", "maintenance note", "approval note", "fmea", "risk"
        ]
    },
    "vision": {
        "model_name": "Qwen 2.5 VL (7B)",
        "model_path": r"D:\models\Qwen2.5-VL-7B-Instruct",
        "role": "vision",
        "parameters": "7.6B",
        "quantization": "BF16 / Vision-Encoder",
        "description": "Multimodal P&ID diagram parsing, ISA-5.1 tag localization, and blueprint entity extraction",
        "keywords": [
            "p&id", "pid", "diagram", "image", "photo", "drawing", "schematic",
            "piping", "instrument", "scan", "picture", "blueprint", "tag", "ocr",
            "valve tag", "isa-5.1"
        ]
    },
    "rag": {
        "model_name": "Nomic Embed Text (v1.5)",
        "model_path": r"D:\models\nomic-embed-text-v1.5",
        "role": "rag",
        "parameters": "137M",
        "quantization": "ONNX INT8 / FP16",
        "description": "Dense semantic vector retrieval across engineering SOPs, standards, and plant manuals",
        "keywords": [
            "sop", "manual", "search", "lookup", "rag", "clause", "standard",
            "oisd", "policy", "regulation", "spec", "retrieval", "evidence"
        ]
    }
}

class ModelRouter:
    def classify_task(self, prompt: str, requested_model: Optional[str] = None) -> dict:
        """
        Analyzes the user prompt (and optional user model override)
        and returns the optimal task type and resident model metadata.
        """
        # 1. Manual user override check
        if requested_model and requested_model.lower() not in ["auto", "auto-negotiate", "default"]:
            rm_lower = requested_model.lower()
            if "coder" in rm_lower:
                target_key = "coding"
            elif "vl" in rm_lower or "vision" in rm_lower:
                target_key = "vision"
            elif "qwen3" in rm_lower or "8b" in rm_lower or "reason" in rm_lower:
                target_key = "reasoning"
            elif "nomic" in rm_lower or "embed" in rm_lower:
                target_key = "rag"
            else:
                target_key = "coding"
            
            profile = TASK_PROFILES[target_key]
            return {
                "task_type": target_key,
                "model_name": profile["model_name"],
                "model_path": profile["model_path"],
                "role": profile["role"],
                "parameters": profile["parameters"],
                "quantization": profile["quantization"],
                "description": profile["description"],
                "confidence": 1.0,
                "reason": f"Explicitly requested by user: {profile['model_name']} ({profile['parameters']})."
            }

        # 2. Autonomous keyword scoring across engineering profiles
        prompt_lower = prompt.lower()
        scores = {task: 0 for task in TASK_PROFILES}

        for task_name, profile in TASK_PROFILES.items():
            for kw in profile["keywords"]:
                if kw in prompt_lower:
                    scores[task_name] += 1

        # Pick highest scoring task
        best_task = max(scores, key=scores.get)
        best_score = scores[best_task]

        # Intelligent defaults
        if best_score == 0:
            best_task = "reasoning"

        profile = TASK_PROFILES[best_task]
        total_keywords = len(profile["keywords"])
        confidence = round(min(0.60 + (best_score * 0.10), 0.99), 2)

        return {
            "task_type": best_task,
            "model_name": profile["model_name"],
            "model_path": profile["model_path"],
            "role": profile["role"],
            "parameters": profile["parameters"],
            "quantization": profile["quantization"],
            "description": profile["description"],
            "confidence": confidence,
            "reason": f"Auto-negotiated: detected {best_score} {best_task} engineering markers. Routed to {profile['model_name']}."
        }

    def get_all_models(self) -> list:
        """Returns all available model configurations."""
        models = []
        for profile in TASK_PROFILES.values():
            models.append({
                "name": profile["model_name"],
                "path": profile["model_path"],
                "role": profile["role"],
                "parameters": profile["parameters"],
                "quantization": profile["quantization"],
                "task": profile["description"]
            })
        return models

model_router = ModelRouter()
