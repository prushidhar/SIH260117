"""rag/synonyms.py — Engineering abbreviation expansion."""
import re

SYNONYM_MAP = {
    "tdh": "total dynamic head total head differential head",
    "npsha": "net positive suction head available npsh",
    "npshr": "net positive suction head required npsh",
    "mawp": "maximum allowable working pressure",
    "bhp": "brake horsepower shaft power",
    "lmtd": "log mean temperature difference",
    "htc": "heat transfer coefficient overall u",
    "b31.3": "asme b31 3 process piping",
    "b16.5": "asme b16 5 pipe flanges",
    "api 610": "api 610 centrifugal pump hydraulics",
    "api 617": "api 617 centrifugal compressor surge",
    "iso 10816": "iso 10816 vibration severity machinery",
    "tema": "tema heat exchanger tubular shell tube",
    "isa 75": "isa 75 control valve sizing flow coefficient",
    "sg": "specific gravity relative density fluid",
    "rf": "fouling resistance thermal fouling factor",
    "ascl": "anti surge control line surge margin",
    "nb": "nominal bore pipe diameter",
    "od": "outside diameter outer diameter pipe",
}

def expand(text: str) -> str:
    lower = text.lower()
    for abbrev, expansion in SYNONYM_MAP.items():
        lower = re.sub(r'\b' + re.escape(abbrev) + r'\b', f'{abbrev} {expansion}', lower)
    return lower