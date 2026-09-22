"""
Hallucination & Contradiction Checker for INDRA
Detects conflicting values for the same fact across multiple source documents.
Critical for industrial compliance where two SOP revisions may disagree.
"""
import re
from typing import List

class ContradictionDetector:
    def detect(self, doc1_text: str, doc2_text: str, key_fact: str) -> dict:
        """
        Checks if `key_fact` has different numerical values in two documents.
        E.g., key_fact = 'vibration limit' or 'max pressure'
        Returns: {contradiction: bool, doc1_value, doc2_value, recommendation}
        """
        # Find numerical values near the key fact
        pattern = rf'{re.escape(key_fact)}[\s:=<>]+([0-9]+\.?[0-9]*)'
        match1 = re.search(pattern, doc1_text, re.IGNORECASE)
        match2 = re.search(pattern, doc2_text, re.IGNORECASE)

        val1 = float(match1.group(1)) if match1 else None
        val2 = float(match2.group(1)) if match2 else None

        if val1 is not None and val2 is not None and val1 != val2:
            return {
                "contradiction": True,
                "key_fact": key_fact,
                "doc1_value": val1,
                "doc2_value": val2,
                "difference": abs(val1 - val2),
                "recommendation": f"⚠ DOCUMENT CONFLICT: Two documents disagree on '{key_fact}' ({val1} vs {val2}). Use the higher-revision document.",
                "alert": True
            }

        return {
            "contradiction": False,
            "key_fact": key_fact,
            "doc1_value": val1,
            "doc2_value": val2,
            "recommendation": "No contradiction found — values consistent across documents.",
            "alert": False
        }

    def batch_check(self, doc_texts: List[str], facts: List[str]) -> List[dict]:
        """
        Checks multiple facts across a list of documents.
        Returns all detected contradictions.
        """
        results = []
        for fact in facts:
            for i in range(len(doc_texts)):
                for j in range(i + 1, len(doc_texts)):
                    result = self.detect(doc_texts[i], doc_texts[j], fact)
                    if result["contradiction"]:
                        result["doc_pair"] = (i, j)
                        results.append(result)
        return results

    def check_revision_conflict(self, texts_with_revisions: List[dict]) -> dict:
        """
        Given a list of {text, revision, date} dicts, finds the most authoritative document.
        texts_with_revisions: [{"text": "...", "revision": 4, "date": "2025-01-01"}, ...]
        """
        if not texts_with_revisions:
            return {"authoritative": None, "reason": "No documents provided"}
        # Sort by revision descending, then date descending
        sorted_docs = sorted(texts_with_revisions,
                              key=lambda x: (x.get("revision", 0), x.get("date", "")),
                              reverse=True)
        auth = sorted_docs[0]
        return {
            "authoritative": auth,
            "reason": f"Revision {auth.get('revision')} dated {auth.get('date')} is the most recent."
        }

contradiction_detector = ContradictionDetector()
