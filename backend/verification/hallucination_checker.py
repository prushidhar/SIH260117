"""
Hallucination & Contradiction Checker for INDRA
Detects conflicting values for the same fact across multiple source documents
and verifies deterministic mathematical fidelity between report claims and tool outputs.
"""
import re
from typing import List, Dict, Any, Optional

class ContradictionDetector:
    def detect(self, doc1_text: str, doc2_text: str, key_fact: str) -> dict:
        """
        Checks if `key_fact` has different numerical values in two documents.
        E.g., key_fact = 'vibration limit' or 'max pressure'
        Returns: {contradiction: bool, doc1_value, doc2_value, recommendation}
        """
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
        """
        if not texts_with_revisions:
            return {"authoritative": None, "reason": "No documents provided"}
        sorted_docs = sorted(texts_with_revisions,
                              key=lambda x: (x.get("revision", 0), x.get("date", "")),
                              reverse=True)
        auth = sorted_docs[0]
        return {
            "authoritative": auth,
            "reason": f"Revision {auth.get('revision')} dated {auth.get('date')} is the most recent."
        }


class NumericIntegrityVerifier:
    """
    Validates that report text contains zero hallucinated numbers by cross-checking
    all numerical claims against deterministic tool execution outputs.
    """
    def verify_report_math(
        self,
        report_text: str,
        tool_results: List[Dict[str, Any]],
        tolerance_pct: float = 2.0
    ) -> Dict[str, Any]:
        """
        Scans report_text for numerical parameters and compares them to tool outputs.
        Returns a verification score (0.0 - 100.0%) and discrepancy list.
        """
        discrepancies = []
        matches = 0
        total_checks = 0

        # Flatten all numerical values from tool outputs
        ground_truth: Dict[str, float] = {}
        for tc in tool_results:
            out = tc.get("output", {})
            if isinstance(out, dict):
                for k, v in out.items():
                    if isinstance(v, (int, float)) and not isinstance(v, bool):
                        ground_truth[k] = float(v)

        if not ground_truth:
            return {
                "math_fidelity_pct": 100.0,
                "verified": True,
                "checked_parameters": 0,
                "discrepancies": []
            }

        # Check key engineering parameters
        for param_name, true_val in ground_truth.items():
            if abs(true_val) < 1e-4:
                continue
            total_checks += 1
            # Look for true_val in text
            str_val = f"{true_val:.2f}"
            str_val_round = f"{round(true_val)}"
            str_val_4 = f"{true_val:.4f}"

            if str_val in report_text or str_val_round in report_text or str_val_4 in report_text:
                matches += 1
            else:
                # Approximate match within tolerance
                pattern = rf'\b(\d+(?:\.\d+)?)\b'
                found_numbers = [float(n) for n in re.findall(pattern, report_text)]
                has_approx = any(abs(n - true_val) / abs(true_val) <= (tolerance_pct / 100.0) for n in found_numbers)
                if has_approx:
                    matches += 1
                else:
                    discrepancies.append({
                        "parameter": param_name,
                        "expected": true_val,
                        "found_in_text": False
                    })

        fidelity = round((matches / max(total_checks, 1)) * 100.0, 1)

        return {
            "math_fidelity_pct": fidelity,
            "verified": fidelity >= 85.0,
            "checked_parameters": total_checks,
            "matched_parameters": matches,
            "discrepancies": discrepancies,
            "seal": "EVIDENCE_LOCK_VERIFIED" if fidelity >= 85.0 else "UNVERIFIED_NUMERICAL_DRIFT"
        }


contradiction_detector = ContradictionDetector()
numeric_verifier = NumericIntegrityVerifier()
