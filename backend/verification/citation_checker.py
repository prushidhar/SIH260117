"""
Citation Checker — Evidence Lock™ for INDRA
Verifies that every AI-generated claim can be traced back to a source document.
"""
import re
from typing import List

class CitationChecker:
    def check(self, claim: str, evidence_texts: List[str]) -> dict:
        """
        Checks if a claim is supported by at least one evidence text.
        Uses keyword overlap as a heuristic for claim grounding.
        Returns: {verified: bool, confidence: float, matched_text: str, method: str}
        """
        if not evidence_texts:
            return {
                "verified": False,
                "confidence": 0.0,
                "matched_text": "",
                "method": "no_evidence"
            }

        # Extract key numbers and nouns from the claim
        claim_numbers = set(re.findall(r'\b\d+\.?\d*\b', claim))
        claim_words = set(re.sub(r'[^a-z\s]', '', claim.lower()).split())
        claim_words -= {"the", "a", "an", "is", "are", "was", "were", "be", "of", "and", "in", "to", "for"}

        best_score = 0.0
        best_match = ""

        for text in evidence_texts:
            text_lower = text.lower()
            text_numbers = set(re.findall(r'\b\d+\.?\d*\b', text))
            text_words = set(re.sub(r'[^a-z\s]', '', text_lower).split())

            # Overlap scoring
            num_overlap = len(claim_numbers & text_numbers)
            word_overlap = len(claim_words & text_words)

            total_possible = len(claim_numbers) + len(claim_words)
            if total_possible == 0:
                continue

            score = (num_overlap * 2 + word_overlap) / (total_possible + 1)
            if score > best_score:
                best_score = score
                best_match = text[:300]

        verified = best_score > 0.2
        return {
            "verified": verified,
            "confidence": round(min(best_score, 1.0), 2),
            "matched_text": best_match,
            "method": "keyword_overlap",
            "evidence_lock": "✓ VERIFIED" if verified else "⚠ UNVERIFIED CLAIM"
        }

    def check_numerical_claim(self, claimed_value: float, evidence_texts: List[str],
                               tolerance_pct: float = 5.0) -> dict:
        """
        Specifically checks whether a numerical value appears in evidence within a tolerance range.
        """
        lo = claimed_value * (1 - tolerance_pct / 100)
        hi = claimed_value * (1 + tolerance_pct / 100)

        for text in evidence_texts:
            numbers = [float(n) for n in re.findall(r'\b\d+\.?\d*\b', text)]
            for n in numbers:
                if lo <= n <= hi:
                    return {
                        "verified": True,
                        "confidence": 0.95,
                        "found_value": n,
                        "claimed_value": claimed_value,
                        "evidence_lock": "✓ VERIFIED"
                    }

        return {
            "verified": False,
            "confidence": 0.0,
            "claimed_value": claimed_value,
            "evidence_lock": "⚠ VALUE NOT FOUND IN EVIDENCE"
        }

citation_checker = CitationChecker()
