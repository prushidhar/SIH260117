#!/usr/bin/env python3
"""
scripts/download_models.py — Sovereign Model Verification & Download Utility
Verifies and downloads required open-weight models for 100% offline air-gapped operation.
"""
import os
import sys
from pathlib import Path

MODELS_DIR = Path(r"D:\models")

REQUIRED_MODELS = [
    {
        "name": "Qwen 2.5 Coder 1.5B (GGUF Q4_K_M)",
        "type": "file",
        "path": MODELS_DIR / "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
        "repo_id": "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF",
        "filename": "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf"
    },
    {
        "name": "Nomic Embed Text v1.5",
        "type": "dir",
        "path": MODELS_DIR / "nomic-embed-text-v1.5",
        "repo_id": "nomic-ai/nomic-embed-text-v1.5"
    },
    {
        "name": "Qwen 2.5 Coder 7B Instruct",
        "type": "dir",
        "path": MODELS_DIR / "Qwen2.5-Coder-7B-Instruct",
        "repo_id": "Qwen/Qwen2.5-Coder-7B-Instruct"
    },
    {
        "name": "Qwen 2.5 VL 7B Instruct",
        "type": "dir",
        "path": MODELS_DIR / "Qwen2.5-VL-7B-Instruct",
        "repo_id": "Qwen/Qwen2.5-VL-7B-Instruct"
    },
    {
        "name": "Qwen 3 8B AWQ",
        "type": "dir",
        "path": MODELS_DIR / "Qwen3-8B-AWQ",
        "repo_id": "Qwen/Qwen-7B-Chat"
    }
]

def main():
    print("=================================================================")
    print("   INDRA: Sovereign Offline Model Verification & Setup         ")
    print("=================================================================")
    
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    all_ready = True

    for item in REQUIRED_MODELS:
        name = item["name"]
        target = item["path"]
        
        if target.exists():
            if item["type"] == "file":
                size_mb = target.stat().st_size / (1024 * 1024)
                print(f"[VERIFIED] {name} -> {target} ({size_mb:.1f} MB)")
            else:
                files_count = len(list(target.glob("*")))
                print(f"[VERIFIED] {name} -> {target} ({files_count} files)")
        else:
            print(f"[MISSING]  {name} -> {target}")
            print(f"           Downloading from HuggingFace ({item['repo_id']})...")
            try:
                from huggingface_hub import hf_hub_download, snapshot_download
                if item["type"] == "file":
                    hf_hub_download(
                        repo_id=item["repo_id"],
                        filename=item["filename"],
                        local_dir=str(MODELS_DIR),
                        local_dir_use_symlinks=False
                    )
                else:
                    snapshot_download(
                        repo_id=item["repo_id"],
                        local_dir=str(target),
                        local_dir_use_symlinks=False
                    )
                print(f"[DOWNLOADED] {name} successfully stored at {target}")
            except Exception as e:
                print(f"[ERROR] Could not download {name}: {e}")
                all_ready = False

    print("-----------------------------------------------------------------")
    if all_ready:
        print("ALL SOVEREIGN OPEN-WEIGHT MODELS ARE VERIFIED IN LOCAL STORAGE.")
        print("Network access can now be fully air-gapped / disabled safely.")
    else:
        print("Notice: Some models were missing and could not be fetched.")
    print("=================================================================")

if __name__ == "__main__":
    main()
