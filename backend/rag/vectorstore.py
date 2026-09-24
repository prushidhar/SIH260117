"""
Knowledge Base for INDRA
Uses BM25 (rank_bm25) with TF-IDF fallback for fully air-gapped, offline semantic search.
Enriched with industrial engineering synonym expansion.
No external model downloads. No internet. Pure local execution.
"""
import os
import json
import pickle
from typing import List, Dict, Optional, Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE_PATH = os.path.join(BASE_DIR, "chroma_db")
INDEX_FILE = os.path.join(STORE_PATH, "bm25_index.pkl")
DOCS_FILE  = os.path.join(STORE_PATH, "documents.json")

try:
    from rank_bm25 import BM25Okapi
    HAS_BM25 = True
except ImportError:
    HAS_BM25 = False

try:
    from rag.synonyms import expand as expand_synonyms
except ImportError:
    def expand_synonyms(text: str) -> str:
        return text


class KnowledgeBase:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(KnowledgeBase, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        if hasattr(self, 'initialized'):
            return
        self.initialized = True

        os.makedirs(STORE_PATH, exist_ok=True)
        self._docs: Dict[str, dict] = {}
        self._bm25 = None
        self._corpus_tokens = []
        self._doc_ids = []
        self._vectorizer = None
        self._matrix = None

        self._load()

    def _load(self):
        """Load persisted documents and index from disk."""
        if os.path.exists(DOCS_FILE):
            try:
                with open(DOCS_FILE, "r", encoding="utf-8") as f:
                    self._docs = json.load(f)
            except Exception as e:
                print(f"KB load docs error: {e}")

        if os.path.exists(INDEX_FILE) and self._docs:
            try:
                with open(INDEX_FILE, "rb") as f:
                    saved = pickle.load(f)
                self._corpus_tokens = saved.get("tokens", [])
                self._doc_ids = saved.get("ids", [])
                if HAS_BM25 and self._corpus_tokens:
                    self._bm25 = BM25Okapi(self._corpus_tokens)
                print(f"KB: loaded {len(self._docs)} chunks (BM25 indexed).")
                return
            except Exception as e:
                print(f"KB: index reload failed ({e}), rebuilding.")

        if self._docs:
            self._rebuild_index()

    def _save(self):
        """Persist index and documents to disk."""
        try:
            with open(DOCS_FILE, "w", encoding="utf-8") as f:
                json.dump(self._docs, f)
            with open(INDEX_FILE, "wb") as f:
                pickle.dump({
                    "tokens": self._corpus_tokens,
                    "ids": self._doc_ids,
                }, f)
        except Exception as e:
            print(f"KB save error: {e}")

    def _tokenize(self, text: str) -> List[str]:
        import re
        text_expanded = expand_synonyms(text.lower())
        tokens = re.findall(r'\b[a-z0-9_.-]{2,}\b', text_expanded)
        return tokens

    def _rebuild_index(self):
        """Rebuild BM25 index from current documents."""
        if not self._docs:
            self._bm25 = None
            self._corpus_tokens = []
            self._doc_ids = []
            return

        self._doc_ids = list(self._docs.keys())
        self._corpus_tokens = [self._tokenize(self._docs[doc_id]["text"]) for doc_id in self._doc_ids]

        if HAS_BM25 and self._corpus_tokens:
            self._bm25 = BM25Okapi(self._corpus_tokens)
        else:
            # Fallback to TF-IDF
            try:
                from sklearn.feature_extraction.text import TfidfVectorizer
                texts = [self._docs[doc_id]["text"] for doc_id in self._doc_ids]
                self._vectorizer = TfidfVectorizer(max_features=8000, stop_words="english")
                self._matrix = self._vectorizer.fit_transform(texts)
            except Exception:
                pass

    def add_document(self, doc_id: str, title: str, text: str, chunk_size: int = 400, overlap: int = 50):
        """Chunk and index an uploaded document."""
        words = text.split()
        if not words:
            return

        step = max(1, chunk_size - overlap)
        chunks = [words[i:i + chunk_size] for i in range(0, len(words), step)]
        
        for idx, chunk in enumerate(chunks):
            chunk_text = " ".join(chunk)
            chunk_id = f"{doc_id}_chunk_{idx}"
            self._docs[chunk_id] = {
                "doc_id": doc_id,
                "title": title,
                "chunk_index": idx,
                "text": chunk_text,
                "created_at": None,
            }

    def ingest_document(self, doc_id: str, title: str, text: str, extra_meta: dict = None, chunk_size: int = 400, overlap: int = 50) -> int:
        """Ingests and chunks a document into the Knowledge Base, returning chunk count."""
        self.add_document(doc_id=doc_id, title=title, text=text, chunk_size=chunk_size, overlap=overlap)
        if extra_meta and self._docs:
            for d in self._docs.values():
                if d.get("doc_id") == doc_id:
                    d.update(extra_meta)
            self._save()
        return sum(1 for d in self._docs.values() if d.get("doc_id") == doc_id) or 1

    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """BM25 search with synonym expansion and top_k results."""
        if not self._docs:
            return []

        query_expanded = expand_synonyms(query)
        q_tokens = self._tokenize(query_expanded)

        if HAS_BM25 and self._bm25 and q_tokens:
            scores = self._bm25.get_scores(q_tokens)
            ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
            results = []
            for idx in ranked_indices:
                if idx >= len(self._doc_ids) or scores[idx] <= 0:
                    continue
                doc_id = self._doc_ids[idx]
                item = self._docs[doc_id]
                results.append({
                    "id": doc_id,
                    "title": item["title"],
                    "snippet": item["text"][:300] + "..." if len(item["text"]) > 300 else item["text"],
                    "relevance_score": round(float(scores[idx]), 3),
                    "code_reference": item["title"]
                })
            return results

        # Fallback to simple keyword overlap
        results = []
        q_words = set(q_tokens)
        for doc_id, doc in self._docs.items():
            doc_words = set(self._tokenize(doc["text"]))
            overlap_count = len(q_words & doc_words)
            if overlap_count > 0:
                results.append({
                    "id": doc_id,
                    "title": doc["title"],
                    "snippet": doc["text"][:300],
                    "relevance_score": overlap_count,
                    "code_reference": doc["title"]
                })
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:top_k]

    def get_collection_stats(self) -> Dict[str, Any]:
        """System observability metrics for Knowledge Base."""
        unique_docs = set(v.get("doc_id", k) for k, v in self._docs.items())
        return {
            "document_count": len(unique_docs),
            "total_chunks": len(self._docs),
            "index_type": "BM25 (Rank-BM25 with Synonym Expansion)" if HAS_BM25 else "TF-IDF / Lexical",
            "is_air_gapped": True,
        }

    # Compatibility shim with legacy Chroma get() calls
    @property
    def collection(self):
        return self

    def get(self):
        unique_docs = {}
        for k, v in self._docs.items():
            doc_id = v.get("doc_id", k)
            if doc_id not in unique_docs:
                unique_docs[doc_id] = {
                    "doc_id": doc_id,
                    "title": v.get("title", "Document"),
                    "size": "Active",
                    "chunk_count": sum(1 for d in self._docs.values() if d.get("doc_id") == doc_id),
                    "created_at": None,
                }
        ids = list(unique_docs.keys())
        metadatas = list(unique_docs.values())
        return {"ids": ids, "metadatas": metadatas}


# Global singleton
kb = KnowledgeBase()
