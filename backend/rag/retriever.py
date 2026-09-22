"""
Plant Intelligence Graph Retriever for INDRA
Equipment data is populated at runtime from user-uploaded documents and sensor imports.
No hardcoded plant data. Upload your SOPs, P&IDs, and telemetry via /api/equipment or /api/kb/documents.
"""
from typing import List, Dict, Any
import re
import os
import json

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
EQUIPMENT_FILE = os.path.join(DATA_DIR, "equipment.json")

def _load_equipment_memory() -> Dict[str, Dict[str, Any]]:
    if os.path.exists(EQUIPMENT_FILE):
        try:
            with open(EQUIPMENT_FILE, "r", encoding="utf-8") as f:
                raw = json.load(f)
            items = raw if isinstance(raw, list) else raw.get("equipment", [])
            res = {}
            for item in items:
                if isinstance(item, dict):
                    t = str(item.get("tag", "")).upper().strip()
                    if t:
                        res[t] = item
            return res
        except Exception:
            return {}
    return {}

def _save_equipment_memory():
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(EQUIPMENT_FILE, "w", encoding="utf-8") as f:
            json.dump(EQUIPMENT_MEMORY, f, indent=2)
    except Exception:
        pass

# Starts empty or loads user-persisted uploads from disk
EQUIPMENT_MEMORY: Dict[str, Dict[str, Any]] = _load_equipment_memory()


class GraphRetriever:
    def register_equipment(self, tag: str, data: dict):
        EQUIPMENT_MEMORY[tag.upper().strip()] = data
        _save_equipment_memory()

    def remove_equipment(self, tag: str) -> bool:
        t = tag.upper().strip()
        if t in EQUIPMENT_MEMORY:
            del EQUIPMENT_MEMORY[t]
            _save_equipment_memory()
            return True
        return False

    def get_all_equipment(self) -> List[Dict[str, Any]]:
        """Returns summarized metadata for all registered assets."""
        return [
            {
                "tag": tag,
                "name": data.get("name", tag),
                "type": data.get("type", "Equipment"),
                "unit": data.get("unit", "Plant"),
                "status": data.get("status", "OPERATIONAL"),
            }
            for tag, data in EQUIPMENT_MEMORY.items()
        ]

    def get_equipment_context(self, tag: str, kb_instance=None) -> dict:
        """Return everything known about a tag — memory + KB search hits."""
        tag_upper = tag.upper().strip()
        context: dict = {
            "tag": tag_upper,
            "found": False,
            "kb_results": [],
            "history": [],
            "metadata": {},
        }

        if tag_upper in EQUIPMENT_MEMORY:
            mem = EQUIPMENT_MEMORY[tag_upper]
            context["found"] = True
            context["metadata"] = mem
            context["history"] = mem.get("history", [])

        if kb_instance:
            try:
                results = kb_instance.search(
                    f"{tag_upper} inspection maintenance SOP limit"
                )
                context["kb_results"] = results
            except Exception as e:
                context["kb_error"] = str(e)

        return context

    def detect_contradictions(
        self, doc1_text: str, doc2_text: str, fact_pattern: str
    ) -> dict:
        matches1 = re.findall(
            rf"{fact_pattern}[\s:=]+([0-9.]+)", doc1_text, re.IGNORECASE
        )
        matches2 = re.findall(
            rf"{fact_pattern}[\s:=]+([0-9.]+)", doc2_text, re.IGNORECASE
        )
        if matches1 and matches2 and matches1[0] != matches2[0]:
            return {
                "contradiction": True,
                "doc1_value": matches1[0],
                "doc2_value": matches2[0],
                "recommendation": "Conflict detected. Use newer/higher-revision document.",
            }
        return {"contradiction": False, "values": matches1 + matches2}

    def build_timeline(self, tag: str) -> list:
        tag_upper = tag.upper().strip()
        if tag_upper in EQUIPMENT_MEMORY:
            return sorted(
                EQUIPMENT_MEMORY[tag_upper].get("history", []),
                key=lambda x: x["date"],
            )
        return []


graph_retriever = GraphRetriever()
