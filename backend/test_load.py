from transformers import AutoModelForCausalLM
try:
    AutoModelForCausalLM.from_pretrained(r"D:\models\Qwen3-8B-AWQ")
except Exception as e:
    print(f"Error: {e}")
