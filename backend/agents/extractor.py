"""
agents/extractor.py  -  Smart NLP Parameter Extractor (INDRA)
"""
import re
from typing import Optional, Dict, Any, List

_FLOW_TO_GPM = {
    r'm3/h|m3 per hour|cubic meter': lambda v: v * 4.40287,
    r'm3/s': lambda v: v * 15850.3,
    r'l/s|litre.*second': lambda v: v * 15.8503,
    r'l/min': lambda v: v * 0.264172,
    r'bbl/day': lambda v: v * 0.02917,
    r'gpm|gallon.*min': lambda v: v,
}
_PRESSURE_TO_PSIG = {
    r'bara': lambda v: (v - 1.01325) * 14.5038,
    r'barg|bar\b': lambda v: v * 14.5038,
    r'atm\b': lambda v: (v - 1.0) * 14.6959,
    r'kpa': lambda v: v * 0.145038,
    r'mpa': lambda v: v * 145.038,
    r'kg/cm2|kgf/cm': lambda v: v * 14.2233,
    r'psi[ga]?': lambda v: v,
}
_TEMP_TO_C = {
    r'deg f|fahrenheit': lambda v: (v - 32) * 5 / 9,
    r'deg c|celsius': lambda v: v,
    r'kelvin': lambda v: v - 273.15,
}
_LENGTH_TO_M = {
    r'ft\b|feet|foot': lambda v: v * 0.3048,
    r'inch\b|in\b': lambda v: v * 0.0254,
    r'mm\b': lambda v: v / 1000,
    r'm\b|meter': lambda v: v,
}
_TAG_RE = re.compile(r'\b([A-Z]{1,3}-\d{3,4}[A-Z]?)\b|\b([A-Z]{1,3}\d{3,4}[A-Z]?)\b', re.IGNORECASE)
ENGINEERING_SYNONYMS = {
    'tdh': 'total dynamic head', 'npsha': 'net positive suction head available',
    'npshr': 'net positive suction head required', 'mawp': 'maximum allowable working pressure',
    'bhp': 'brake horsepower', 'lmtd': 'log mean temperature difference',
    'ascl': 'anti surge control line', 'sg': 'specific gravity', 'rf': 'fouling resistance',
}

def _convert(value: float, unit_str: str, table: dict) -> Optional[float]:
    for pattern, fn in table.items():
        if re.search(pattern, unit_str.lower()):
            return fn(value)
    return None

class ParameterExtractor:
    """Product-grade NLP parameter extractor for industrial engineering queries."""
    def __init__(self):
        self._registry = None

    @property
    def registry(self):
        if self._registry is None:
            try:
                from data.equipment_registry import equipment_registry
                self._registry = equipment_registry
            except Exception:
                self._registry = None
        return self._registry

    def extract_tag(self, text: str) -> Optional[str]:
        for m in _TAG_RE.finditer(text):
            tag = (m.group(1) or m.group(2) or '').strip()
            if tag and len(tag) >= 3:
                return tag.upper()
        return None

    def expand_synonyms(self, text: str) -> str:
        lower = text.lower()
        for abbrev, expansion in ENGINEERING_SYNONYMS.items():
            lower = re.sub(r'\b' + re.escape(abbrev) + r'\b', expansion, lower)
        return lower

    def _reg_fallback(self, tag: Optional[str], key: str) -> Optional[float]:
        if tag and self.registry:
            spec = self.registry.get_spec(tag)
            if spec and key in spec:
                return float(spec[key])
        return None

    def extract_flow_gpm(self, text: str, tag: Optional[str] = None) -> Optional[float]:
        for label in ['flow rate', 'flow', 'capacity', 'q']:
            m = re.search(rf'(?:{re.escape(label)})\s*[=:~]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z3/]*)', text, re.IGNORECASE)
            if m:
                val, unit = float(m.group(1)), m.group(2).strip()
                c = _convert(val, unit or 'gpm', _FLOW_TO_GPM)
                if c is not None:
                    return round(c, 2)
        for pattern, fn in _FLOW_TO_GPM.items():
            m = re.search(rf'([0-9]+(?:\.[0-9]+)?)\s*(?:{pattern})', text, re.IGNORECASE)
            if m:
                return round(fn(float(m.group(1))), 2)
        return self._reg_fallback(tag, 'flow_rate_gpm')

    def extract_flow_m3h(self, text: str, tag: Optional[str] = None) -> Optional[float]:
        m = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(?:m3/h|m3 per hour)', text, re.IGNORECASE)
        if m:
            return float(m.group(1))
        gpm = self.extract_flow_gpm(text, tag)
        return round(gpm / 4.40287, 3) if gpm else None

    def extract_head_meters(self, text: str, tag: Optional[str] = None) -> Optional[float]:
        for label in ['head', 'total dynamic head', 'total head', 'differential head']:
            m = re.search(rf'(?:{re.escape(label)})\s*[=:~]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]*)', text, re.IGNORECASE)
            if m:
                val, unit = float(m.group(1)), m.group(2).strip() or 'm'
                c = _convert(val, unit, _LENGTH_TO_M)
                return round(c if c is not None else val, 3)
        m = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*m\b', text, re.IGNORECASE)
        if m and float(m.group(1)) < 2000:
            return float(m.group(1))
        m = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*ft\b', text, re.IGNORECASE)
        if m:
            return round(float(m.group(1)) * 0.3048, 3)
        return self._reg_fallback(tag, 'rated_head_m')

    def extract_pressure_psig(self, text: str, labels: Optional[List[str]] = None, tag: Optional[str] = None) -> Optional[float]:
        labels = labels or ['pressure', 'design pressure', 'operating pressure']
        for label in labels:
            m = re.search(rf'(?:{re.escape(label)})\s*[=:~]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z/]*)', text, re.IGNORECASE)
            if m:
                val, unit = float(m.group(1)), m.group(2).strip() or 'psig'
                c = _convert(val, unit, _PRESSURE_TO_PSIG)
                return round(c if c is not None else val, 2)
        for pattern, fn in _PRESSURE_TO_PSIG.items():
            m = re.search(rf'([0-9]+(?:\.[0-9]+)?)\s*(?:{pattern})', text, re.IGNORECASE)
            if m:
                return round(fn(float(m.group(1))), 2)
        return self._reg_fallback(tag, 'design_pressure_psig')

    def extract_suction_pressure_psig(self, text: str, tag: Optional[str] = None) -> Optional[float]:
        return self.extract_pressure_psig(text, ['suction pressure', 'suction', 'inlet pressure'], tag)

    def extract_discharge_pressure_psig(self, text: str, tag: Optional[str] = None) -> Optional[float]:
        return self.extract_pressure_psig(text, ['discharge pressure', 'discharge', 'outlet pressure', 'delivery pressure'], tag)

    def extract_temperature_c(self, text: str, labels: Optional[List[str]] = None, tag: Optional[str] = None) -> Optional[float]:
        labels = labels or ['temperature', 'temp', 'design temperature', 'operating temperature']
        for label in labels:
            m = re.search(rf'(?:{re.escape(label)})\s*[=:~]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z°]*)', text, re.IGNORECASE)
            if m:
                val, unit = float(m.group(1)), m.group(2).strip() or 'c'
                c = _convert(val, unit, _TEMP_TO_C)
                return round(c if c is not None else val, 2)
        return self._reg_fallback(tag, 'design_temp_c')

    def extract_density_kg_m3(self, text: str, tag: Optional[str] = None) -> Optional[float]:
        m = re.search(r'(?:density|rho)\s*[=:~]?\s*([0-9]+(?:\.[0-9]+)?)', text, re.IGNORECASE)
        if m:
            return float(m.group(1))
        m = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*kg/m3', text, re.IGNORECASE)
        if m:
            return float(m.group(1))
        return self._reg_fallback(tag, 'fluid_density_kg_m3')

    def extract_specific_gravity(self, text: str, tag: Optional[str] = None) -> Optional[float]:
        m = re.search(r'(?:sg|specific gravity|s\.g\.)\s*[=:~]?\s*([0-9]+(?:\.[0-9]+)?)', text, re.IGNORECASE)
        if m:
            return float(m.group(1))
        d = self.extract_density_kg_m3(text, tag)
        return round(d / 1000.0, 4) if d else None

    def extract_outer_diameter_in(self, text: str, tag: Optional[str] = None) -> Optional[float]:
        for pat in [r'(?:od|outer dia|outside dia|nominal bore|nb)\s*[=:]?\s*([0-9]+(?:\.[0-9]+)?)',
                    r'([0-9]+(?:\.[0-9]+)?)\s*(?:inch|in)\s*(?:od|outer|pipe|dia)',
                    r'(?:pipe|line)\s+([0-9]+(?:\.[0-9]+)?)']:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                val = float(m.group(1))
                if val > 36:
                    val = round(val / 25.4, 3)
                return round(val, 3)
        return None

    def extract_stress_psi(self, text: str) -> Optional[float]:
        m = re.search(r'(?:allowable stress|s_allow)\s*[=:]?\s*([0-9,]+)', text, re.IGNORECASE)
        if m:
            return float(m.group(1).replace(',', ''))
        m = re.search(r'([0-9]{4,6})\s*psi(?!g)', text, re.IGNORECASE)
        if m and float(m.group(1)) > 1000:
            return float(m.group(1))
        return None

    def extract_efficiency_pct(self, text: str) -> Optional[float]:
        m = re.search(r'(?:efficiency|eta)\s*[=:~]?\s*([0-9]+(?:\.[0-9]+)?)\s*%', text, re.IGNORECASE)
        return float(m.group(1)) / 100.0 if m else None

    def extract_flange_class(self, text: str) -> Optional[int]:
        m = re.search(r'(?:class|#)\s*([0-9]+)', text, re.IGNORECASE)
        if m:
            val = int(m.group(1))
            return min([150, 300, 400, 600, 900, 1500, 2500], key=lambda x: abs(x - val))
        return None

    def extract_range_midpoint(self, text: str, label: str) -> Optional[float]:
        pat = rf'(?:{re.escape(label)})\s*[=:]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:to|-)\s*([0-9]+(?:\.[0-9]+)?)'
        m = re.search(pat, text, re.IGNORECASE)
        return (float(m.group(1)) + float(m.group(2))) / 2 if m else None

    def extract_npsh(self, text: str) -> tuple[Optional[float], Optional[float]]:
        npsha = None
        npshr = None
        m_a = re.search(r'npsh[a]?\s*(?:available)?\s*[=:]?\s*([0-9]+(?:\.[0-9]+)?)', text, re.IGNORECASE)
        if m_a:
            npsha = float(m_a.group(1))
        m_r = re.search(r'npsh[r]?\s*(?:required)?\s*[=:]?\s*([0-9]+(?:\.[0-9]+)?)', text, re.IGNORECASE)
        if m_r:
            npshr = float(m_r.group(1))
        return npsha, npshr

    def extract_all(self, text: str) -> Dict[str, Any]:
        tag = self.extract_tag(text)
        expanded = self.expand_synonyms(text)
        npsha, npshr = self.extract_npsh(text)
        return {
            'tag': tag,
            'flow_gpm': self.extract_flow_gpm(text, tag),
            'flow_m3h': self.extract_flow_m3h(text, tag),
            'head_m': self.extract_head_meters(expanded, tag),
            'npsh_available_m': npsha,
            'npsh_required_m': npshr,
            'suction_pressure_psig': self.extract_suction_pressure_psig(text, tag),
            'discharge_pressure_psig': self.extract_discharge_pressure_psig(text, tag),
            'design_pressure_psig': self.extract_pressure_psig(text, tag=tag),
            'outer_diameter_in': self.extract_outer_diameter_in(text, tag),
            'allowable_stress_psi': self.extract_stress_psi(text),
            'design_temp_c': self.extract_temperature_c(text, tag=tag),
            'specific_gravity': self.extract_specific_gravity(text, tag),
            'density_kg_m3': self.extract_density_kg_m3(text, tag),
            'efficiency': self.extract_efficiency_pct(text),
            'flange_class': self.extract_flange_class(text),
        }

parameter_extractor = ParameterExtractor()