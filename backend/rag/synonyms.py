"""rag/synonyms.py — Engineering abbreviation expansion for INDRA Sovereign AI Workbench."""
import re

SYNONYM_MAP = {
    "tdh": "total dynamic head total head differential head",
    "npsha": "net positive suction head available npsh",
    "npshr": "net positive suction head required npsh",
    "mawp": "maximum allowable working pressure mawpr allowable pressure",
    "bhp": "brake horsepower shaft power shaft work",
    "lmtd": "log mean temperature difference mtd corrected mtd",
    "htc": "heat transfer coefficient overall u heat transfer rate",
    "b31.3": "asme b31 3 process piping piping code wall thickness",
    "b31.1": "asme b31 1 power piping steam header thermal expansion",
    "b16.5": "asme b16 5 pipe flanges flange rating bolt circle",
    "api 610": "api 610 centrifugal pump hydraulics bb2 oh2 vs4",
    "api 617": "api 617 centrifugal compressor anti surge polytropic head",
    "iso 10816": "iso 10816 vibration severity machinery velocity rms",
    "tema": "tema heat exchanger tubular shell tube bundle baffle cut",
    "isa 75": "isa 75 control valve sizing flow coefficient cv kv",
    "sg": "specific gravity relative density fluid",
    "rf": "fouling resistance thermal fouling factor fouling margin",
    "ascl": "anti surge control line surge margin surge limit line",
    "nb": "nominal bore pipe diameter pipe size",
    "od": "outside diameter outer diameter pipe",
    "ffs": "fitness for service api 579 asme ffs 1 remaining strength factor",
    "rsf": "remaining strength factor rsfa folias bulging factor",
    "lta": "local thin area localized thinning groove corrosion",
    "pcc-1": "asme pcc 1 bolted flanged joint assembly torque gasket seating",
    "api 650": "api 650 welded steel storage tank atmospheric crude tank one foot method",
    "api 653": "api 653 tank inspection repair alteration reconstruction retirable thickness",
    "ptc 4": "asme ptc 4 fired steam generators fired heater thermal efficiency excess oxygen",
    "ptc 6": "asme ptc 6 steam turbines cogeneration heat rate isentropic efficiency",
    "ptc 10": "asme ptc 10 compressors performance test code polytropic head",
    "lopa": "layer of protection analysis iec 61511 independent protection layer ipl",
    "sil": "safety integrity level iec 61508 iec 61511 target pfd rrf",
    "pfd": "probability of failure on demand target pfd average pfd",
    "rrf": "risk reduction factor required rrf mitigated risk",
    "api 520": "api 520 sizing selection pressure relief valve prv psv orifice area",
    "api 521": "api 521 pressure relieving depressuring systems flare radiation dispersion",
    "api 510": "api 510 pressure vessel inspection code remaining life corrosion rate half life",
    "nace": "nace sp0169 mr0175 iso 15156 cathodic protection sour service ssc hic",
    "cui": "corrosion under insulation api 581 risk based inspection rbi",
    "teg": "triethylene glycol gas dehydration gpsa section 20 dew point depression",
    "cti": "cooling technology institute atc 105 cooling tower approach range",
    "psm": "osha 1910 119 process safety management pha moc mechanical integrity",
    "fmea": "iec 60812 failure mode and effects analysis rpn severity occurrence detection",
    "ssc": "sulfide stress cracking nace mr0175 h2s partial pressure",
    "hic": "hydrogen induced cracking stepwise cracking sour environment",
}

def expand(text: str) -> str:
    lower = text.lower()
    for abbrev, expansion in SYNONYM_MAP.items():
        lower = re.sub(r'\b' + re.escape(abbrev) + r'\b', f'{abbrev} {expansion}', lower)
    return lower