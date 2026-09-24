import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from rag.vectorstore import kb

SEEDS = [
    {
        "doc_id": "std-asme-b313",
        "title": "ASME B31.3 Process Piping Design & Inspection Standards",
        "text": """ASME B31.3 Process Piping Code (2022 Edition) Paragraph 304.1.2:
Minimum required straight pipe wall thickness t under internal design pressure P:
Formula: t = (P * D) / (2 * (S * E * W + P * Y)) + c
Where:
- P: internal design gauge pressure (psig or MPa)
- D: outside diameter of pipe (inches or mm)
- S: allowable stress value for material from Table A-1 (ASTM A106 Grade B = 20,000 psi / 137.9 MPa at design temperatures <= 200°C)
- E: quality factor from Table 302.3.4 (E = 1.0 for seamless pipe)
- W: weld joint strength reduction factor (W = 1.0 for temperatures <= 510°C)
- Y: material coefficient from Table 304.1.1 (Y = 0.4 for ferritic steels at design temp < 482°C)
- c: sum of mechanical allowances plus corrosion and erosion allowances (typically 3.175 mm / 0.125 in)

Hydrostatic Test Pressure (Paragraph 345.4.2):
Not less than 1.5 times the design pressure, corrected for temperature ratings.
Statutory Plant Approval Requirement: Any pressurized asset operating below minimum calculated nominal wall thickness or exhibiting >= 40% cumulative wall loss requires formal engineering sign-off by the Plant Superintendent prior to continued commercial service."""
    },
    {
        "doc_id": "std-api-570",
        "title": "API 570 Piping Inspection Code — Fitness for Service & Corrosion Rates",
        "text": """API 570 Piping Inspection Code (4th Edition):
In-service inspection, rating, repair, and alteration of metallic and fiberglass piping systems.
Section 7: Inspection Data Evaluation, Maximum Allowable Working Pressure, and Remaining Life.
Remaining Life calculation:
Remaining Life (years) = (t_actual - t_minimum) / Corrosion_Rate (mm/year)
Where:
- t_actual: thickness recorded by ultrasonic thickness gauging (UT) or profile radiography (RT)
- t_minimum: minimum required wall thickness calculated per ASME B31.3 §304.1.2
- Corrosion Rate: Short-term or long-term thinning rate determined from periodic baseline NDT inspections.

Fitness-for-Service (FFS) Assessment:
Piping circuits experiencing localized thinning may be evaluated per API 579-1 / ASME FFS-1 Level 1 or Level 2 rules.
Re-inspection intervals shall not exceed one-half of the remaining life or 5 years, whichever is less.
When remaining life is <= 5 years, elevated monitoring protocol and statutory superintendent authorization are required."""
    },
    {
        "doc_id": "std-api-610",
        "title": "API 610 Centrifugal Pumps for Petroleum Industries (12th Edition)",
        "text": """API 610 12th Edition / ISO 13709 Centrifugal Pumps for Petroleum, Petrochemical and Natural Gas Industries:
Section 6: Hydraulic Performance, NPSH Margins, and Drive Sizing.
Total Dynamic Head (TDH):
TDH = (P_discharge - P_suction) / (rho * g) + Delta_Z + Head_losses
Net Positive Suction Head (NPSH) Margin:
NPSH_margin = NPSH_available - NPSH_required
Clause 6.1.2: Minimum NPSH margin shall be at least 1.0 meter (3.3 ft) or 1.1 times NPSHr across the entire preferred operating region (POR).

Electric Motor Driver Sizing (Table 12 Power Margins):
For motor ratings <= 22 kW (30 HP): 125% of rated pump BHP
For motor ratings 22 kW to 55 kW (30 to 75 HP): 115% of rated pump BHP
For motor ratings > 55 kW (75 HP): 110% of rated pump BHP

Vibration Limits (API 610 / API 670):
Unfiltered bearing housing vibration velocity during shop testing shall not exceed 3.0 mm/s RMS (overall). Operational alert threshold is set at 4.5 mm/s RMS."""
    },
    {
        "doc_id": "std-iso-10816",
        "title": "ISO 10816-3 Machinery Vibration Severity & Diagnostic Criteria",
        "text": """ISO 10816-3 Evaluation of Machine Vibration by Measurements on Non-Rotating Parts:
Industrial machines with nominal power above 15 kW and nominal speeds between 120 RPM and 15,000 RPM.
Evaluation Severity Zones:
- Zone A: Newly commissioned machinery in prime condition (< 2.3 mm/s RMS).
- Zone B: Machines acceptable for unrestricted continuous long-term operation (2.3 to 4.5 mm/s RMS).
- Zone C: Machines unsatisfactory for long-term continuous service; remedial maintenance should be scheduled (4.5 to 7.1 mm/s RMS).
- Zone D: Vibration severity is sufficient to cause imminent mechanical damage (>= 7.1 mm/s RMS). Immediate action required.

Harmonic Spectral Diagnostics (FFT):
- 1X RPM dominant peak (> 70% overall amplitude): Indicates mechanical rotor unbalance, bent shaft, or excessive eccentric mass.
- 2X RPM dominant peak (with 180° phase shift): Indicates angular or parallel shaft misalignment across coupling, or cocked bearing.
- High-frequency harmonics (3X, 4X, blade pass): Looseness, vane passing frequency, or early bearing race spalling."""
    },
    {
        "doc_id": "std-isa-51",
        "title": "ANSI/ISA-5.1 Instrumentation Symbols and Identification",
        "text": """ANSI/ISA-5.1-2009 Instrumentation Symbols and Identification:
Standard identification letters for process instrumentation:
First Letter (Measured Variable):
- F: Flow Rate
- P: Pressure
- T: Temperature
- L: Level
- A: Analysis
Succeeding Letters (Readout or Output Function):
- I: Indicator
- C: Controller
- T: Transmitter
- V: Valve / Actuator
- S: Switch
- Y: Auxiliary Computing Device

Valve Actuation and Failure Modes:
- FC: Fail Closed (Air-to-Open) - standard for hazardous feed lines and fuel gas supply
- FO: Fail Open (Air-to-Close) - standard for cooling utility headers and depressuring vents
- FL: Fail Locked (Maintains current position upon air/power loss)

Safety Relief Valves (PSV / PRV per API 520 / API 521):
Pressure safety relief valves must be isolated with car-sealed open (CSO) full-bore ball or gate valves to guarantee overpressure protection venting."""
    },
    {
        "doc_id": "std-crane-tp410",
        "title": "Crane TP 410 / ISO 5167 Fluid Flow & Darcy-Weisbach Hydraulics",
        "text": """Crane Technical Paper No. 410 — Flow of Fluids Through Valves, Fittings and Pipe:
Darcy-Weisbach Equation for Frictional Pressure Drop:
Delta_P = f * (L / D) * (rho * v^2 / 2)
Head Loss: h_f = f * (L / D) * (v^2 / (2 * g))
Where:
- f: Darcy-Weisbach friction factor
- L: pipe length (meters)
- D: internal diameter (meters)
- rho: fluid density (kg/m^3)
- v: mean fluid velocity (m/s)

Colebrook-White Implicit Equation for Turbulent Flow (Re > 4000):
1 / sqrt(f) = -2.0 * log10((epsilon / (3.7 * D)) + (2.51 / (Re * sqrt(f))))
Solved numerically via Newton-Raphson iteration.
Standard commercial carbon steel pipe absolute roughness epsilon = 0.045 mm (0.000045 m)."""
    },
    {
        "doc_id": "std-asme-sec8",
        "title": "ASME Boiler & Pressure Vessel Code Section VIII Division 1",
        "text": """ASME BPVC Section VIII Division 1: Pressure Vessels (2021/2023 Edition)
Paragraph UG-27: Thickness of Cylindrical Shells under Internal Pressure:
Circumferential Stress (Longitudinal Joints):
t = (P * R) / (S * E - 0.6 * P) + c
Longitudinal Stress (Circumferential Joints):
t = (P * R) / (2 * S * E + 0.4 * P) + c

Paragraph UG-32: Formed Heads and Sections, Pressure on Concave Side:
2:1 Ellipsoidal Formed Heads (UG-32(d)):
t = (P * D) / (2 * S * E - 0.2 * P) + c
Where:
- P: internal design pressure (psig or MPa)
- R: inside radius of shell course (inches or mm)
- D: inside diameter of head skirt (inches or mm)
- S: maximum allowable stress per ASME Section II Part D Table 1A
- E: joint efficiency per UW-12 (E = 1.0 for fully radiographed Category A welds)
- c: corrosion allowance (typically 3.175 mm / 0.125 in)
Hydrostatic Shell Test per UG-99: Minimum 1.3 times the maximum allowable working pressure (MAWP)."""
    },
    {
        "doc_id": "doc-insp-cdu104",
        "title": "Ultrasonic Inspection Report — Crude Distillation Line CDU-Pipe-104",
        "text": """Sovereign Refineries & Petrochemicals Ltd.
STATUTORY PLANT ASSET INTEGRITY INSPECTION REPORT: INSP-2025-084-UT
Unit: Crude Distillation Unit II (CDU-II)
Asset Identification: CDU-Pipe-104 (Atmospheric Crude Transfer Header Line)
Governing Standards: ASME B31.3 Chapter II, API 570, ASME Section V Article 4
Material Specification: ASTM A106 Grade B Seamless Carbon Steel
Operating Conditions:
- Design Pressure: 3.2 MPa (464.1 psig)
- Operating Pressure: 2.85 MPa (413.4 psig)
- Design Temperature: 180°C (356°F)
- Outside Diameter: 273.1 mm (10.75 in NPS 10)
- Nominal Wall Thickness: 12.7 mm (0.500 in)
Ultrasonic NDT Findings:
- Minimum Measured Thickness: 7.2 mm (0.283 in) recorded at 6 o'clock bottom invert
- Corrosion Rate: 0.45 mm/year (due to high-temperature naphthenic acid and sulfidic service)
- ASME B31.3 Calculated Minimum Required Thickness (t_min): 5.12 mm
- Usable Corrosion Margin Remaining: 2.08 mm
- Estimated Remaining Service Life: 4.62 Years
Compliance Verdict: Code Compliant for continued service under 12-month re-inspection interval.
Approval Action: Statutory Plant Approval Note submitted for Plant Superintendent executive authorization."""
    },
    {
        "doc_id": "doc-pid-001",
        "title": "P&ID Specification — Process Cooling & Heat Exchanger Unit (PID-001)",
        "text": """Drawing Reference: P&ID-001 Rev A
Project: Process Cooling & Feed Storage System
Governing Standard: ANSI/ISA-5.1-2009, ASME B31.3, API 600, ASME B16.34
Major Equipment:
- TK-101: Atmospheric Feed Storage Accumulation Tank
- P-101: Crude Feed Centrifugal Process Pump (API 610 BB2), DN50 suction L-002, DN50 discharge L-003
- E-101: Shell-and-Tube Heat Exchanger, thermal service preheating crude feed with steam utility
- P-102: Cooling Tower Auxiliary Circulation Pump
Control Loops & Valves:
- Loop 101: Flow Transmitter FT-101 -> Flow Indicating Controller FIC-101 -> Feed Control Valve FV-101 (DN50 Globe, Fail-Closed)
- Loop 102: Temperature Transmitter TT-101 -> Temperature Controller TIC-101 -> Steam Valve TV-101 (DN25 Globe, Fail-Closed)
- Loop 103: Temperature Transmitter TT-102 -> Temperature Controller TIC-102 -> Product Valve TV-102 (DN50 Angle, Fail-Closed)
- Manual Isolation: XV-101 (DN25 Gate Valve, API 600 Car-Sealed Open on cooling water return line L-008)
Safety Interlock: Automatic ESD trip on pump suction low-level interlock to prevent cavitating dry run."""
    }
]

def main():
    print("Seeding Knowledge Base with governing industrial codes and plant documentation...")
    for doc in SEEDS:
        chunks = kb.ingest_document(
            doc_id=doc["doc_id"],
            title=doc["title"],
            text=doc["text"],
            extra_meta={
                "size": f"{len(doc['text']) / 1024:.1f} KB",
                "chunk_count": 1,
                "status": "indexed"
            }
        )
        print(f"  Indexed '{doc['title']}' ({chunks} chunks)")
    print(f"SUCCESS: Seeded {len(SEEDS)} documents into Knowledge Base!")

if __name__ == "__main__":
    main()
