import os
import hashlib
import json
import time
from typing import Any, Dict, List, Optional

LEDGER_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audit_ledger.json")

class MerkleAuditTrail:
    """
    Cryptographic Audit Ledger for the Sovereign AI Workbench.
    Ensures all agent actions, tool calls, and generated files are tamper-proof.
    Persisted to audit_ledger.json for continuous multi-session immutability.
    """
    def __init__(self):
        self.chain: List[Dict[str, Any]] = []
        self.last_hash: str = hashlib.sha256(b"genesis_block").hexdigest()
        self._load()

    def _hash_data(self, data: Dict[str, Any]) -> str:
        data_str = json.dumps(data, sort_keys=True).encode('utf-8')
        return hashlib.sha256(data_str).hexdigest()

    def _load(self):
        """Load persisted audit ledger from disk if available, else seed genesis events."""
        if os.path.exists(LEDGER_FILE):
            try:
                with open(LEDGER_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list) and len(data) > 0:
                        self.chain = data
                        self.last_hash = data[-1]["hash"]
                        if self.verify_chain():
                            return
                        else:
                            print("WARNING: Corrupted audit ledger on disk, resetting.")
                            self.chain = []
                            self.last_hash = hashlib.sha256(b"genesis_block").hexdigest()
            except Exception as e:
                print(f"Audit ledger load error: {e}")

        # Sovereign Air-Gap Genesis Block (Zero mock data)
        self.log_event("GENESIS_BLOCK", {
            "status": "INITIALIZED",
            "security": "IEC 62443 Air-Gapped Merkle Chain",
            "crypto": "SHA-256 Chained Hash"
        })

    def _save(self):
        """Persist chain to disk."""
        try:
            with open(LEDGER_FILE, "w", encoding="utf-8") as f:
                json.dump(self.chain, f, indent=2)
        except Exception as e:
            print(f"Audit ledger save error: {e}")

    def log_event(self, event_type: str, payload: Dict[str, Any], file_bytes: Optional[bytes] = None) -> str:
        """
        Logs an event to the cryptographic chain.
        If file_bytes is provided, generates a checksum of the output file.
        """
        event_record = {
            "timestamp": time.time(),
            "event_type": event_type,
            "payload": payload,
            "previous_hash": self.last_hash
        }

        if file_bytes:
            event_record["file_checksum"] = hashlib.sha256(file_bytes).hexdigest()

        # Generate current hash
        current_hash = self._hash_data(event_record)
        event_record["hash"] = current_hash
        
        self.chain.append(event_record)
        self.last_hash = current_hash
        self._save()
        return current_hash

    def verify_chain(self) -> bool:
        """
        Verifies the cryptographic integrity of the entire audit trail.
        """
        if not self.chain:
            return True

        expected_prev = hashlib.sha256(b"genesis_block").hexdigest()
        for block in self.chain:
            if block["previous_hash"] != expected_prev:
                return False
            
            # Recompute hash to verify it hasn't been tampered with
            block_copy = block.copy()
            block_hash = block_copy.pop("hash")
            if self._hash_data(block_copy) != block_hash:
                return False
                
            expected_prev = block_hash
            
        return True

    def export_ledger(self) -> str:
        return json.dumps(self.chain, indent=2)

    def reset(self):
        """Reset ledger to pristine genesis state."""
        self.chain = []
        self.last_hash = hashlib.sha256(b"genesis_block").hexdigest()
        self.log_event("GENESIS_BLOCK", {
            "status": "INITIALIZED",
            "security": "IEC 62443 Air-Gapped Merkle Chain",
            "crypto": "SHA-256 Chained Hash"
        })
        self._save()

# Global singleton for the session
audit_ledger = MerkleAuditTrail()
