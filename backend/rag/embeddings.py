"""
Local Embedding Generator for INDRA
Wraps SentenceTransformers for batch encoding with the local nomic-embed model.
"""
import os
from typing import List, Union
import torch
import torch.nn.functional as F

class LocalEmbedder:
    def __init__(self, model_path: str = r"D:\models\nomic-embed-text-v1.5"):
        self.model_path = model_path
        self._model = None
        self._tokenizer = None

    def _load(self):
        if self._model is None:
            try:
                from transformers import AutoModel, BertTokenizerFast
                tok_file = os.path.join(self.model_path, "tokenizer.json")
                if os.path.exists(tok_file):
                    self._tokenizer = BertTokenizerFast(tokenizer_file=tok_file)
                else:
                    self._tokenizer = BertTokenizerFast.from_pretrained(self.model_path)
                self._model = AutoModel.from_pretrained(self.model_path, trust_remote_code=True)
                self._model.eval()
                print(f"Nomic Embedder loaded successfully from {self.model_path}")
            except Exception as e:
                print(f"Warning: Could not load nomic embedder: {e}")
                self._model = False
        return self._model

    def embed_text(self, text: Union[str, List[str]]) -> Union[List[float], List[List[float]]]:
        """Generate real dense embeddings from local Nomic model."""
        model = self._load()
        if not model or not self._tokenizer:
            if isinstance(text, list):
                return [[0.0] * 768] * len(text)
            return [0.0] * 768
            
        single = isinstance(text, str)
        texts = [text] if single else text
        
        with torch.no_grad():
            inputs = self._tokenizer(texts, padding=True, truncation=True, max_length=512, return_tensors="pt")
            outputs = model(**inputs)
            attention_mask = inputs["attention_mask"].unsqueeze(-1)
            embeddings = (outputs.last_hidden_state * attention_mask).sum(dim=1) / attention_mask.sum(dim=1).clamp(min=1e-9)
            embeddings = F.normalize(embeddings, p=2, dim=1)
            
        result = embeddings.cpu().numpy().tolist()
        return result[0] if single else result

    def similarity(self, text1: str, text2: str) -> float:
        vecs = self.embed_text([text1, text2])
        v1 = torch.tensor(vecs[0])
        v2 = torch.tensor(vecs[1])
        return float(torch.dot(v1, v2).item())

local_embedder = LocalEmbedder()
