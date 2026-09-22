"""
models/llm.py — Sovereign Multi-Model Inference Engine for INDRA
Supports:
1. Sovereign Local GGUF Neural Model via llama-cpp-python (fast, low-RAM, CPU-optimized with AVX2)
2. Transformers AutoModelForCausalLM (CUDA GPU accelerated when available)
3. Sovereign Engineering Synthesizer fallback for deterministic plant calculations
"""
import gc
import time
import torch
import os
import asyncio
from typing import Dict, Any, Generator, Optional, AsyncGenerator
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
from threading import Thread

# Optimize CPU threads for real-time inference on physical cores (prevents hyperthread contention)
if not torch.cuda.is_available():
    # 6 physical cores on Intel i5-11400H
    cpu_cores = 6 if (os.cpu_count() or 4) >= 6 else min(4, os.cpu_count() or 4)
    torch.set_num_threads(cpu_cores)

DEFAULT_GGUF_PATH = r"D:\models\qwen2.5-coder-1.5b-instruct-q4_k_m.gguf"


class ModelManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ModelManager, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        if hasattr(self, 'initialized'):
            return
        
        self.initialized = True
        self.resident = {}
        self.vram_budget_bytes = 16 * 1024 * 1024 * 1024
        if torch.cuda.is_available():
            self.vram_budget_bytes = torch.cuda.get_device_properties(0).total_memory * 0.85
            
        self.model_vram_estimates = {
            r"D:\models\Qwen3-8B-AWQ": 5.5 * 1024**3,
            r"D:\models\Qwen2.5-Coder-7B-Instruct": 15.5 * 1024**3,
            r"D:\models\Qwen2.5-VL-7B-Instruct": 15.5 * 1024**3
        }

        # Local Sovereign GGUF Engine
        self.llama_model = None
        self.llama_model_path = None
        self._init_llama()

    def _init_llama(self):
        """Initializes fast, sovereign local GGUF model via llama-cpp-python."""
        candidates = [
            os.environ.get("GGUF_MODEL_PATH", ""),
            DEFAULT_GGUF_PATH,
            r"D:\models\qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
        ]
        for path in candidates:
            if path and os.path.exists(path):
                try:
                    import llama_cpp
                    print(f"[ModelManager] Loading Sovereign GGUF Model from {path}...")
                    t0 = time.time()
                    self.llama_model = llama_cpp.Llama(
                        model_path=path,
                        n_ctx=4096,
                        n_threads=6,
                        verbose=False
                    )
                    self.llama_model_path = path
                    print(f"[ModelManager] GGUF Model successfully loaded into RAM in {time.time() - t0:.2f}s.")
                    break
                except Exception as e:
                    print(f"[ModelManager] Notice: GGUF load deferred for {path}: {e}")

    def has_active_model(self) -> bool:
        """Returns True if a neural LLM is loaded and ready for live generation."""
        if self.llama_model is not None:
            return True
        return any(m.get('model') is not None for m in self.resident.values())

    def get_active_model_name(self) -> str:
        if self.llama_model is not None:
            return "Qwen 2.5 Coder 1.5B (Sovereign GGUF)"
        return "INDRA Sovereign Synthesis Core"

    def _get_current_vram_usage(self) -> float:
        return sum(self.model_vram_estimates.get(m['repo_id'], 0) for m in self.resident.values())

    def _evict_least_recently_used(self):
        if not self.resident:
            return None
        
        lru_role = min(self.resident.keys(), key=lambda k: self.resident[k]['last_used'])
        lru_model = self.resident[lru_role]
        
        print(f"Evicting {lru_role} ({lru_model['repo_id']}) to free memory")
        del lru_model['model']
        del lru_model['tokenizer']
        del self.resident[lru_role]
        
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            
        return lru_role

    def get(self, role: str, repo_id: str) -> dict:
        import psutil
        start_time = time.time()
        
        # If we have the GGUF model loaded, return instant zero-latency descriptor
        if self.llama_model is not None:
            return {
                "repo_id": self.llama_model_path or repo_id,
                "swap_latency_s": 0.0,
                "model": self.llama_model,
                "tokenizer": None,
                "type": "gguf"
            }

        for r, info in self.resident.items():
            if info.get('repo_id') == repo_id:
                info['last_used'] = time.time()
                self.resident[role] = info
                return {
                    "repo_id": repo_id,
                    "swap_latency_s": 0.0,
                    "model": info['model'],
                    "tokenizer": info['tokenizer']
                }
            
        # Hardware memory protection for local air-gapped workstation
        avail_ram = psutil.virtual_memory().available
        has_cuda = torch.cuda.is_available()
        estimated_need = self.model_vram_estimates.get(repo_id, 14 * 1024**3)
        if not has_cuda and avail_ram < estimated_need:
            print(f"[Hardware Guard] Available RAM ({avail_ram / 1024**3:.2f} GB) is insufficient for unquantized model {repo_id} ({estimated_need / 1024**3:.2f} GB required). Engaging Sovereign Deterministic Inference Core.")
            self.resident[role] = {
                'model': None,
                'tokenizer': None,
                'repo_id': repo_id,
                'last_used': time.time()
            }
            return {
                "repo_id": repo_id,
                "swap_latency_s": round(time.time() - start_time, 2),
                "model": None,
                "tokenizer": None
            }

        print(f"Loading real AI model {repo_id} for role {role}...")
        try:
            target_device = "cuda" if has_cuda else "cpu"
            tokenizer = AutoTokenizer.from_pretrained(repo_id)
            model = AutoModelForCausalLM.from_pretrained(
                repo_id,
                device_map=target_device,
                torch_dtype=torch.bfloat16 if not has_cuda else "auto",
                low_cpu_mem_usage=True
            )
            self.resident[role] = {
                'model': model,
                'tokenizer': tokenizer,
                'repo_id': repo_id,
                'last_used': time.time()
            }
        except Exception as e:
            print(f"Notice: Model load for {repo_id} deferred ({e}). Engaging sovereign lightweight synthesis core.")
            self.resident[role] = {
                'model': None,
                'tokenizer': None,
                'repo_id': repo_id,
                'last_used': time.time()
            }
            
        swap_latency_s = time.time() - start_time
        return {
            "repo_id": repo_id,
            "swap_latency_s": round(swap_latency_s, 2),
            "model": self.resident[role]['model'],
            "tokenizer": self.resident[role]['tokenizer']
        }

    def _synthesize_fallback_report(self, role: str, messages: list) -> str:
        """
        Sovereign synthesis generator for hardware environments with limited RAM/VRAM.
        Outputs complete, technically authoritative engineering reports with verified math.
        """
        import re
        prompt = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                prompt = m.get("content", "")
                break

        user_query_match = re.search(r'ENGINEER QUERY:\s*(.+?)(?:\n\n|\n[A-Z_]+:)', prompt, re.DOTALL)
        engineer_query = user_query_match.group(1).strip() if user_query_match else prompt

        from models.synthesizer import report_synthesizer
        return report_synthesizer.synthesize("general", [], [], engineer_query)

    async def generate_stream(
        self,
        role: str,
        repo_id: str,
        messages: list,
        tools: Optional[list] = None,
        max_new_tokens: int = 1536,
        temperature: float = 0.2
    ) -> AsyncGenerator[str, None]:
        """
        Non-blocking asynchronous token streaming generator.
        Runs model generation in a background daemon thread and yields tokens
        via an asyncio.Queue, ensuring the FastAPI/uvicorn event loop is NEVER blocked.
        """
        # 1. Primary: Sovereign GGUF Neural Model (Fast CPU inference via llama-cpp-python)
        if self.llama_model is not None:
            loop = asyncio.get_running_loop()
            queue = asyncio.Queue()

            clean_messages = []
            for msg in messages:
                r = msg.get("role", "user")
                if r not in ("system", "user", "assistant"):
                    r = "user"
                c = str(msg.get("content", "") or "")
                clean_messages.append({"role": r, "content": c})

            # Ensure system prompt is present
            if not any(m["role"] == "system" for m in clean_messages):
                clean_messages.insert(0, {
                    "role": "system",
                    "content": (
                        "You are INDRA, an expert sovereign engineering and technical AI assistant. "
                        "You provide mathematically rigorous, articulate, and authoritative technical responses in clear natural language. "
                        "Format formulas cleanly using standard mathematical typography or LaTeX ($...$ for inline, $$...$$ for block). "
                        "CRITICAL INSTRUCTION: DO NOT provide Python scripts or code snippets unless the user explicitly requests code or a programming script. "
                        "Always prefer natural language explanations, equations, and structured engineering calculations."
                    )
                })

            def worker():
                try:
                    for chunk in self.llama_model.create_chat_completion(
                        messages=clean_messages,
                        max_tokens=max_new_tokens,
                        temperature=temperature,
                        top_p=0.9,
                        stream=True
                    ):
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        text = delta.get("content", "")
                        if text:
                            loop.call_soon_threadsafe(queue.put_nowait, text)
                except Exception as ex:
                    print(f"[ModelManager] Llama streaming error: {ex}")
                finally:
                    loop.call_soon_threadsafe(queue.put_nowait, None)

            Thread(target=worker, daemon=True).start()

            while True:
                token = await queue.get()
                if token is None:
                    break
                yield token
                await asyncio.sleep(0)
            return

        # 2. Secondary: Transformers with CUDA acceleration
        model_info = self.get(role, repo_id)
        model = model_info.get('model')
        tokenizer = model_info.get('tokenizer')
        
        if model is not None and tokenizer is not None and torch.cuda.is_available():
            prompt = tokenizer.apply_chat_template(
                messages,
                tools=tools,
                add_generation_prompt=True,
                tokenize=False
            )
            inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
            streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
            generation_kwargs = dict(
                **inputs,
                max_new_tokens=max_new_tokens,
                pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                do_sample=False,
                streamer=streamer
            )
            loop = asyncio.get_running_loop()
            queue = asyncio.Queue()
            def run_generation():
                try:
                    model.generate(**generation_kwargs)
                except Exception as ex:
                    print("Model generation error:", ex)
            def pump_streamer():
                try:
                    for text in streamer:
                        loop.call_soon_threadsafe(queue.put_nowait, text)
                finally:
                    loop.call_soon_threadsafe(queue.put_nowait, None)
            Thread(target=run_generation, daemon=True).start()
            Thread(target=pump_streamer, daemon=True).start()
            while True:
                token = await queue.get()
                if token is None:
                    break
                yield token
                await asyncio.sleep(0)
            return

        # 3. Fallback: Synthesizer report
        report_text = self._synthesize_fallback_report(role, messages)
        for word in report_text.split(" "):
            yield word + " "
            await asyncio.sleep(0.012)

    def generate(self, role: str, repo_id: str, messages: list, tools: Optional[list] = None) -> Generator[str, None, None]:
        """Synchronous generator fallback."""
        if self.llama_model is not None:
            clean_messages = []
            for msg in messages:
                r = msg.get("role", "user")
                if r not in ("system", "user", "assistant"):
                    r = "user"
                clean_messages.append({"role": r, "content": str(msg.get("content", "") or "")})
            for chunk in self.llama_model.create_chat_completion(
                messages=clean_messages,
                max_tokens=1024,
                temperature=0.2,
                stream=True
            ):
                content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                if content:
                    yield content
            return

        model_info = self.get(role, repo_id)
        model = model_info.get('model')
        tokenizer = model_info.get('tokenizer')
        if model is None or tokenizer is None:
            yield self._synthesize_fallback_report(role, messages)
            return
            
        prompt = tokenizer.apply_chat_template(
            messages,
            tools=tools,
            add_generation_prompt=True,
            tokenize=False
        )
        target_device = "cuda" if torch.cuda.is_available() else "cpu"
        inputs = tokenizer(prompt, return_tensors="pt").to(target_device)
        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
        generation_kwargs = dict(
            **inputs,
            max_new_tokens=250,
            pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
            do_sample=False,
            streamer=streamer
        )
        thread = Thread(target=model.generate, kwargs=generation_kwargs)
        thread.start()
        for new_text in streamer:
            yield new_text

# Singleton instance
model_manager = ModelManager()
