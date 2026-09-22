"""data/equipment_registry.py — Equipment Registry singleton."""
import os, json
from typing import Optional, List, Dict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EQUIPMENT_FILE = os.path.join(BASE_DIR, "data", "equipment.json")

class EquipmentRegistry:
    _instance = None
    def __new__(cls, *a, **kw):
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_loaded"):
            return
        self._loaded = True
        self._items: List[dict] = []
        self._by_tag: Dict[str, dict] = {}
        self._load()

    def _load(self):
        if not os.path.exists(EQUIPMENT_FILE):
            return
        try:
            with open(EQUIPMENT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            items = data if isinstance(data, list) else data.get("equipment", [])
            for item in items:
                self._items.append(item)
                tag = str(item.get("tag", "")).upper().strip()
                if tag:
                    self._by_tag[tag] = item
            print(f"EquipmentRegistry: loaded {len(self._items)} equipment items.")
        except Exception as e:
            print(f"EquipmentRegistry load error: {e}")

    def get_spec(self, tag: str) -> Optional[dict]:
        return self._by_tag.get(str(tag).upper().strip()) if tag else None

    def get_all(self) -> List[dict]:
        return list(self._items)

    def get_by_type(self, equipment_type: str) -> List[dict]:
        t = equipment_type.lower()
        return [i for i in self._items if t in str(i.get("type", "")).lower()]

    def search(self, query: str) -> List[dict]:
        q = query.lower()
        return [i for i in self._items if
                q in str(i.get("tag","")).lower() or
                q in str(i.get("name","")).lower() or
                q in str(i.get("description","")).lower() or
                q in str(i.get("service","")).lower()]

    def fill_missing_params(self, tag: Optional[str], params: dict) -> dict:
        if not tag:
            return params
        spec = self.get_spec(tag)
        if not spec:
            return params
        mapping = {
            "design_pressure_psig": "design_pressure_psig",
            "suction_pressure_psig": "suction_pressure_psig",
            "discharge_pressure_psig": "discharge_pressure_psig",
            "design_temp_c": "design_temp_c",
            "flow_gpm": "rated_flow_gpm",
            "head_m": "rated_head_m",
            "specific_gravity": "fluid_sg",
            "outer_diameter_in": "pipe_od_in",
            "allowable_stress_psi": "allowable_stress_psi",
            "flange_class": "flange_class",
        }
        for k, spec_key in mapping.items():
            if params.get(k) is None and spec_key in spec:
                params[k] = spec[spec_key]
        return params

equipment_registry = EquipmentRegistry()