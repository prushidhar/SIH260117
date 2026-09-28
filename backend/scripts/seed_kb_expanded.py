"""
backend/scripts/seed_kb_expanded.py
Seeds the local RAG Knowledge Base with 31 comprehensive, authoritative engineering standard documents.
Rebuilds the BM25Okapi index and serializes bm25_index.pkl and documents.json for 100% offline, air-gapped retrieval.
"""
import os
import sys
import json
import pickle

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from rag.vectorstore import STORE_PATH, INDEX_FILE, DOCS_FILE, KnowledgeBase

DOCUMENTS = [
    {
        "doc_id": "std-asme-b313",
        "title": "ASME B31.3 Process Piping Design & Inspection Standards",
        "text": """ASME B31.3 Process Piping Code (2022 Edition) Paragraph 304.1.2: Minimum required straight pipe wall thickness t under internal design pressure P:
Formula: t = (P * D) / (2 * (S * E * W + P * Y)) + c
Where:
- P: internal design gauge pressure (psig or MPa)
- D: outside diameter of pipe (inches or mm)
- S: allowable stress value for material from Table A-1 (ASTM A106 Grade B = 20,000 psi / 137.9 MPa at design temperatures <= 200°C)
- E: quality factor from Table 302.3.4 (E = 1.0 for seamless pipe)
- W: weld joint strength reduction factor (W = 1.0 for temperatures <= 510°C)
- Y: material coefficient from Table 304.1.1 (Y = 0.4 for ferritic steels at design temp < 482°C)
- c: sum of mechanical allowances plus corrosion and erosion allowances (typically 3.175 mm / 0.125 in)
Hydrostatic Test Pressure (Paragraph 345.4.2): Not less than 1.5 times the design pressure, corrected for temperature ratings.
Statutory Plant Approval Requirement: Any pressurized asset operating below minimum calculated nominal wall thickness or exhibiting >= 40% cumulative wall loss requires formal engineering sign-off by the Plant Superintendent prior to continued commercial service."""
    },
    {
        "doc_id": "std-api-570",
        "title": "API 570 Piping Inspection Code — Fitness for Service & Corrosion Rates",
        "text": """API 570 Piping Inspection Code (4th Edition): In-service inspection, rating, repair, and alteration of metallic and fiberglass piping systems.
Section 7: Inspection Data Evaluation, Maximum Allowable Working Pressure, and Remaining Life.
Remaining Life calculation:
Remaining Life (years) = (t_actual - t_minimum) / Corrosion_Rate (mm/year)
Where:
- t_actual: thickness recorded by ultrasonic thickness gauging (UT) or profile radiography (RT)
- t_minimum: minimum required wall thickness calculated per ASME B31.3 §304.1.2
- Corrosion Rate: Short-term or long-term thinning rate determined from periodic baseline NDT inspections.
Fitness-for-Service (FFS) Assessment: Piping circuits experiencing localized thinning may be evaluated per API 579-1 / ASME FFS-1 Level 1 or Level 2 rules.
Re-inspection intervals shall not exceed one-half of the remaining life or 5 years, whichever is less. When remaining life is <= 5 years, elevated monitoring protocol and statutory superintendent authorization are required."""
    },
    {
        "doc_id": "std-api-610",
        "title": "API 610 Centrifugal Pumps for Petroleum Industries (12th Edition)",
        "text": """API 610 12th Edition / ISO 13709 Centrifugal Pumps for Petroleum, Petrochemical and Natural Gas Industries:
Section 6: Hydraulic Performance, NPSH Margins, and Drive Sizing.
Total Dynamic Head (TDH): TDH = (P_discharge - P_suction) / (rho * g) + Delta_Z + Head_losses
Net Positive Suction Head (NPSH) Margin: NPSH_margin = NPSH_available - NPSH_required
Clause 6.1.2: Minimum NPSH margin shall be at least 1.0 meter (3.3 ft) or 1.1 times NPSHr across the entire preferred operating region (POR).
Electric Motor Driver Sizing (Table 12 Power Margins):
For motor ratings <= 22 kW (30 HP): 125% of rated pump BHP
For motor ratings 22 kW to 55 kW (30 to 75 HP): 115% of rated pump BHP
For motor ratings > 55 kW (75 HP): 110% of rated pump BHP
Vibration Limits (API 610 / API 670): Unfiltered bearing housing vibration velocity during shop testing shall not exceed 3.0 mm/s RMS (overall). Operational alert threshold is set at 4.5 mm/s RMS."""
    },
    {
        "doc_id": "std-iso-10816",
        "title": "ISO 10816-3 Machinery Vibration Severity & Diagnostic Criteria",
        "text": """ISO 10816-3 Evaluation of Machine Vibration by Measurements on Non-Rotating Parts: Industrial machines with nominal power above 15 kW and nominal speeds between 120 RPM and 15,000 RPM.
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
        "text": """ANSI/ISA-5.1-2009 Instrumentation Symbols and Identification: Standard identification letters for process instrumentation:
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
Safety Relief Valves (PSV / PRV per API 520 / API 521): Pressure safety relief valves must be isolated with car-sealed open (CSO) full-bore ball or gate valves to guarantee overpressure protection venting."""
    },
    {
        "doc_id": "std-crane-tp410",
        "title": "Crane TP 410 / ISO 5167 Fluid Flow & Darcy-Weisbach Hydraulics",
        "text": """Crane Technical Paper No. 410 — Flow of Fluids Through Valves, Fittings and Pipe:
Darcy-Weisbach Equation for Frictional Pressure Drop: Delta_P = f * (L / D) * (rho * v^2 / 2)
Head Loss: h_f = f * (L / D) * (v^2 / (2 * g))
Where:
- f: Darcy-Weisbach friction factor
- L: pipe length (meters)
- D: internal diameter (meters)
- rho: fluid density (kg/m^3)
- v: mean fluid velocity (m/s)
Colebrook-White Implicit Equation for Turbulent Flow (Re > 4000):
1 / sqrt(f) = -2.0 * log10((epsilon / (3.7 * D)) + (2.51 / (Re * sqrt(f))))
Solved numerically via Newton-Raphson iteration. Standard commercial carbon steel pipe absolute roughness epsilon = 0.045 mm (0.000045 m)."""
    },
    {
        "doc_id": "std-asme-sec8",
        "title": "ASME Boiler & Pressure Vessel Code Section VIII Division 1",
        "text": """ASME BPVC Section VIII Division 1: Pressure Vessels (2021/2023 Edition) Paragraph UG-27: Thickness of Cylindrical Shells under Internal Pressure:
Circumferential Stress (Longitudinal Joints): t = (P * R) / (S * E - 0.6 * P) + c
Longitudinal Stress (Circumferential Joints): t = (P * R) / (2 * S * E + 0.4 * P) + c
Paragraph UG-32: Formed Heads and Sections, Pressure on Concave Side:
2:1 Ellipsoidal Formed Heads (UG-32(d)): t = (P * D) / (2 * S * E - 0.2 * P) + c
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
        "text": """Sovereign Refineries & Petrochemicals Ltd. STATUTORY PLANT ASSET INTEGRITY INSPECTION REPORT: INSP-2025-084-UT
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
    },
    {
        "doc_id": "std-api-617",
        "title": "API 617 / ASME PTC 10 Centrifugal Compressor Anti-Surge & Dynamic Performance",
        "text": """API 617 (8th/9th Edition) Axial and Centrifugal Compressors for Petroleum, Chemical and Gas Industry Services:
Surge Phenomena & Anti-Surge Control Architecture:
- Compressor surge is a violent dynamic aerodynamic instability occurring when forward gas flow reverses abruptly across impeller blades due to excessive pressure head or reduced flow rate.
- Surge Limit Line (SLL): The aerodynamic boundary locus of pressure ratio versus inlet flow where blade stall initiates.
- Anti-Surge Control Line (ASCL): Set parallel to the SLL with a safety margin of at least 10% to 15% flow margin:
  Surge Margin % = ((Q_operating - Q_surge) / Q_surge) * 100%
- Anti-Surge Control Valve (ASV): Fast-acting pneumatic or electro-hydraulic recycle valve capable of full stroke from closed to open in < 1.0 to 1.5 seconds.
- Polytropic Head (H_poly per ASME PTC 10):
  H_poly = (Z_avg * R * T1 / (n-1)/n) * ((P2/P1)^((n-1)/n) - 1)
  Where n is the polytropic exponent: (n-1)/n = (k-1)/(k * eta_poly)
- Gas Power required: Power (kW) = (mass_flow * H_poly) / (1000 * eta_poly)."""
    },
    {
        "doc_id": "std-asme-ptc6",
        "title": "ASME PTC 6 & IAPWS-IF97 Steam Turbine Cogeneration & Carbon Offset",
        "text": """ASME PTC 6 (Steam Turbines) & IAPWS-IF97 Formulation for Steam Thermodynamic Properties:
Cogeneration (Combined Heat and Power - CHP) Plant Evaluation:
- Steam expansion across turbine stages:
  Isentropic enthalpy drop: Delta_H_isen = h_inlet - h_isentropic_exhaust
  Actual enthalpy drop: Delta_H_actual = Delta_H_isen * isentropic_efficiency
  Turbine shaft electrical power: P_electric = mass_flow * Delta_H_actual * generator_efficiency
- Process thermal steam export duty:
  Q_thermal = mass_flow_export * (h_export - h_condensate_return)
- Overall Cogeneration Thermal Efficiency:
  eta_cogen = (P_electric + Q_thermal) / (mass_flow * (h_inlet - h_feedwater)) * 100%
  Typically achieves 75% to 85% overall energy utilization compared to ~35-40% for condensing-only cycles.
- Carbon Offset Calculation:
  Baseline grid emissions factor (typically 0.82 t CO2 / MWh for coal-dominated grid) minus cogen gas footprint.
  Statutory carbon credits earned per ton of displaced emissions."""
    },
    {
        "doc_id": "std-nace-sp0169",
        "title": "NACE SP0169 & API 581 Cathodic Protection & Corrosion Under Insulation (CUI)",
        "text": """NACE SP0169 (2013 Edition) / ISO 15589-1 Control of External Corrosion on Underground or Submerged Metallic Piping Systems:
Cathodic Protection (CP) Criteria (Section 6):
1. A negative (cathodic) polarized potential of at least -850 mV relative to a saturated copper/copper sulfate (CSE) reference electrode.
2. A minimum of 100 mV of cathodic polarization between the structure surface and a stable reference electrode contacting the electrolyte.
Corrosion Under Insulation (CUI) Management per API 581 Risk-Based Inspection (RBI):
- Operating temperature sweet spot for severe CUI: -4°C to 175°C (25°F to 350°F), with maximum corrosion rates peaking between 60°C and 100°C (140°F to 212°F).
- Probability of Failure (POF) scale: 1 (Very Low) to 5 (Very High) based on insulation type (calcium silicate vs closed-cell cellular glass), jacketing condition, and marine/industrial atmospheric exposure.
- Consequence of Failure (COF) category: A to E based on fluid flammability, toxicity, and release volume.
- Mitigation: Non-destructive pulsed eddy current (PEC) and profile radiography (RT) targeting pipe supports, elbows, and damaged cladding."""
    },
    {
        "doc_id": "std-cti-atc105",
        "title": "CTI ATC-105 & ASHRAE Cooling Tower Psychrometric Heat Rejection",
        "text": """Cooling Technology Institute (CTI) ATC-105 Acceptance Test Code for Water-Cooling Towers:
Psychrometric Performance Definitions:
- Cooling Range: Delta_T_range = T_hot_water_in - T_cold_water_out
- Approach to Wet Bulb: T_approach = T_cold_water_out - T_ambient_wet_bulb
- Thermal Rejection Duty: Q_tower = m_water * C_p * Delta_T_range (MWth)
- Tower Thermal Effectiveness:
  Effectiveness % = (Range / (Range + Approach)) * 100%
- Cycles of Concentration (COC):
  COC = (Chloride_circulating / Chloride_makeup) = (Silica_circulating / Silica_makeup)
- Water Balance Equations:
  Evaporation Rate (E): E approx = 0.00085 * Circulation_Rate * Delta_T_range (°F)
  Blowdown Rate (B): B = E / (COC - 1)
  Makeup Water Rate (M): M = E + B + Drift (typically 0.005% of circulation rate).
Recommended operational COC for industrial cooling systems is 4.0 to 6.0 to minimize fresh water withdrawal."""
    },
    {
        "doc_id": "std-gpsa-sec20",
        "title": "GPSA Engineering Data Book Section 20 — TEG Gas Dehydration",
        "text": """GPSA Engineering Data Book Section 20 / GPA 2172 Dehydration of Natural Gas:
Triethylene Glycol (TEG) Absorption Process:
- Water content of sweet natural gas (McKetta-Wehe chart correlation):
  At 1000 psia and 40°C, typical saturation water content is ~65 lb H2O / MMSCFD.
- Target pipeline sales gas specification: <= 4 to 7 lb H2O / MMSCFD (corresponding to -70°C water dew point in cryogenic turbo-expander plants).
- Dew Point Depression: Delta_T_dp = T_gas_inlet - T_target_dewpoint.
- TEG Circulation Rate:
  Typically 2.5 to 3.5 gallons TEG per pound of water removed (20 to 30 liters TEG per kg H2O).
- Reboiler Duty:
  Typically 900 to 1200 BTU per gallon of TEG circulated, maintaining reboiler temperature at 204°C (400°F) for 99.5 wt% lean TEG.
- Contactor Sizing (Souders-Brown Equation):
  v_max = K_sb * sqrt((rho_liquid - rho_vapor) / rho_vapor)
  Where K_sb = 0.25 ft/s for structured packing or bubble cap trays."""
    },
    {
        "doc_id": "std-api-520",
        "title": "API 520 Part I & API 526 Sizing, Selection, and Installation of Pressure Relief Valves",
        "text": """API Recommended Practice 520 Part I (10th Edition) & API Standard 526 (7th Edition):
Sizing of Pressure Relief Valves for Gas and Vapor Relief:
Formula for Critical Choked Flow (P_back / P1 <= critical pressure ratio):
A = W / (C * K_d * P1 * K_b * K_c) * sqrt((T * Z) / M)
Where:
- A: required effective discharge orifice area (in^2)
- W: relieving vapor mass flow rate (lb/hr)
- C: gas expansion coefficient based on specific heat ratio k (Cp/Cv)
  C = 520 * sqrt(k * (2 / (k+1))^((k+1)/(k-1)))
- K_d: certified discharge coefficient (typically 0.975 for standard ASME Section VIII relief valves)
- P1: upstream relieving pressure (psia) = Set_Pressure + Allowable_Accumulation + Atmospheric_Pressure
  Allowable accumulation: 10% for operational upset, 16% for multiple valves, 21% for external fire case.
- K_b: capacity correction factor due to back pressure (K_b = 1.0 for conventional valves discharging to atmosphere).
- K_c: combination correction factor for rupture disc upstream (1.0 if none, 0.9 if present).
Standard API 526 Orifice Designations: D (0.110 in^2) to R (16.00 in^2)."""
    },
    {
        "doc_id": "std-api-521",
        "title": "API 521 Pressure-Relieving and Depressuring Systems (Flare & Radiation)",
        "text": """API Standard 521 (7th Edition) / ISO 23251 Pressure-relieving and Depressuring Systems:
Flare Header Sizing, Thermal Radiation, and Atmospheric Dispersion:
- Flare Tip Sizing: Sized for maximum exit velocity Mach number:
  Mach <= 0.2 to 0.5 for continuous flaring to avoid flame lift-off and excessive acoustic noise.
- Thermal Radiation Boundaries (Brzustowski & Sommer Flame Model):
  - 1.58 kW/m^2 (500 BTU/hr-ft^2): Maximum allowable continuous radiation for personnel without special protective clothing.
  - 4.73 kW/m^2 (1500 BTU/hr-ft^2): Maximum allowable for emergency actions requiring short exposure (< 2 to 3 minutes) with gear.
  - 9.46 kW/m^2 (3000 BTU/hr-ft^2): Maximum allowable for equipment structures and escape routes (exposure <= 30 seconds).
- Smokeless Flaring: Steam injection ratio typically 0.25 to 0.40 kg steam per kg hydrocarbon flared for heavy molecular weight streams.
- Rapid Depressuring (Blowdown): Reducing vessel pressure to 50% or 100 psig within 15 minutes to prevent catastrophic boiling liquid expanding vapor explosion (BLEVE)."""
    },
    {
        "doc_id": "std-api-579",
        "title": "API 579-1 / ASME FFS-1 Fitness-For-Service — Local Thin Areas (LTA)",
        "text": """API 579-1 / ASME FFS-1 Fitness-For-Service (3rd Edition, 2021) Part 5: Assessment of Local Metal Loss (LTAs):
Evaluation Methodology:
- Level 1 Assessment: Screening criteria based on maximum pit depth and longitudinal extent:
  Normalized shell parameter lambda = 1.285 * s / sqrt(D * t_min)
  Where s is the longitudinal length of the local thin area, D is shell diameter, t_min is ASME minimum thickness.
- Folias Bulging Factor (M_t):
  M_t = sqrt(1.0 + 0.48 * lambda^2)
- Remaining Strength Factor (RSF):
  RSF = (R_t) / (1.0 - (1.0 / M_t) * (1.0 - R_t))
  Where R_t = (t_measured - FCA) / t_min (remaining thickness ratio).
- Acceptance Criteria:
  If calculated RSF >= RSF_allowable (typically 0.90 for process vessels and piping), the asset is acceptable for operation at full design MAWP.
- Reduced Allowable MAWP (MAWPr):
  If RSF < RSF_allowable, MAWPr = MAWP * (RSF / RSF_allowable).
- Level 2 Assessment: Numerical point-thickness reading (PTR) grid integration across circumferential and longitudinal planes."""
    },
    {
        "doc_id": "std-asme-sec8-app2",
        "title": "ASME Section VIII Div 1 Appendix 2 & ASME PCC-1 Bolted Flange Joint Assembly",
        "text": """ASME Boiler & Pressure Vessel Code Section VIII Division 1 Mandatory Appendix 2 & ASME PCC-1 Guidelines for Bolted Flanged Joint Assembly:
Flange Bolt Load Calculations (Taylor-Forge Method):
1. Operating Condition Bolt Load (W_m1):
   W_m1 = H + H_p = 0.785 * G^2 * P + 2 * b * 3.14159 * G * m * P
   Where:
   - G: diameter at location of gasket load reaction (inches or mm)
   - P: internal design pressure (psi or MPa)
   - b: effective gasket seating width (inches or mm)
   - m: gasket factor (typically 3.00 for spiral wound gaskets with flexible graphite, 2.75 for non-asbestos fiber)
2. Gasket Seating Condition Bolt Load (W_m2):
   W_m2 = 3.14159 * b * G * y
   Where y is the gasket seating stress (typically 10,000 psi / 68.9 MPa for spiral wound stainless steel gaskets).
3. Minimum Required Bolt Area: A_m = max(W_m1 / S_b_oper, W_m2 / S_b_ambient).
Target Assembly Bolt Torque (ASME PCC-1 Appendix O):
Torque (N-m) = K * F_bolt * d_bolt
Where K is the nut factor (typically 0.17 for lubricated anti-seize studs), F_bolt is 50% to 70% of bolt yield stress."""
    },
    {
        "doc_id": "std-api-650",
        "title": "API 650 Welded Tanks for Oil Storage (13th Edition) & API 653 Tank Inspection",
        "text": """API Standard 650 (13th Edition, 2020) Welded Tanks for Oil Storage & API Standard 653 Tank Inspection, Repair, Alteration:
Design Shell Plate Thickness (1-Foot Method, Clause 5.6.3):
Formula for Design Shell Thickness (t_d):
t_d = (4.9 * D * (H - 0.3) * G) / (S_d * E) + CA
Formula for Hydrostatic Test Shell Thickness (t_t):
t_t = (4.9 * D * (H - 0.3)) / (S_t * E)
Governing thickness is the larger of t_d and t_t, but never less than Table 5.2 minimum shell plate thicknesses:
- For tank diameter < 15 m: minimum 5.0 mm
- For 15 m <= diameter < 36 m: minimum 6.0 mm
- For 36 m <= diameter <= 60 m: minimum 8.0 mm
API 653 In-Service Retirable Minimum Thickness (t_min per Clause 4.3.3):
t_min = (2.6 * D * (H_act - 1) * G) / (S_allowable * E)
If bottom course measured thickness falls below API 653 t_min, tank maximum filling height must be reduced or course replaced."""
    },
    {
        "doc_id": "std-asme-ptc4",
        "title": "ASME PTC 4 Fired Steam Generators & API 560 Fired Heaters Thermal Efficiency",
        "text": """ASME PTC 4 (Fired Steam Generators) & API Standard 560 (Fired Heaters for General Refinery Service):
Thermal Efficiency Determination via Heat Loss Method:
Total Efficiency % = 100.0 - Total Heat Losses %
Major Heat Loss Components:
1. Dry Flue Gas Loss (L_dfg): Heat carried away by dry combustion gases:
   L_dfg approx = 0.0195 * (T_stack - T_ambient) * (1 + 0.45 * Excess_Air / 100)
2. Moisture Loss from Fuel Hydrogen (L_mf): Latent heat of water vapor formed by combustion of H2:
   Typically 6.5% to 8.5% for natural gas and refinery fuel gas.
3. Moisture in Combustion Air (L_ma): Typically 0.20% to 0.35%.
4. Combustibles / Unburned Carbon Monoxide Loss (L_co): ~0.01% per 100 ppm CO in flue gas.
5. Surface Radiation and Convection Losses (L_rad per ABMA standard curve): Typically 1.0% to 1.5% for large refinery heaters.
Excess Oxygen Optimization:
Refinery fired heaters typically operate at 3.0% to 4.5% excess O2 (~15-25% excess air). Trimming damper controls to 2.0% excess O2 reduces fuel consumption by 0.75% to 1.5%, saving substantial energy and tons of CO2 emissions."""
    },
    {
        "doc_id": "std-iec-61511",
        "title": "IEC 61511 / ISA-84 Functional Safety & Layer of Protection Analysis (LOPA)",
        "text": """IEC 61511 / ANSI/ISA-84.00.01 Functional Safety: Safety Instrumented Systems for the Process Industry Sector:
Layer of Protection Analysis (LOPA) Methodology:
- Initiating Event Frequency (f_init): Annual frequency of hardware failure, external impact, or operator error (events/year).
- Target Mitigated Event Frequency (TMEF): Tolerable risk threshold per corporate risk matrix:
  Typically 1.0e-4 / year for injury, 1.0e-5 / year for severe fatality, 1.0e-6 / year for catastrophic multi-fatality.
- Independent Protection Layers (IPLs): Must satisfy Specificity, Independence, Dependability, and Auditability.
  Common credits: Basic Process Control System (BPCS) trip = PFD 0.10 (RRF 10); Operator alarm response (10-minute rule) = PFD 0.10; ASME Sec VIII certified relief valve = PFD 0.01 (RRF 100).
- Required Safety Integrity Level (SIL Allocation):
  Required Risk Reduction Factor (RRF) = f_init / TMEF.
  - SIL 1: PFD 1.0e-2 to 1.0e-1 (RRF 10 to 100)
  - SIL 2: PFD 1.0e-3 to 1.0e-2 (RRF 100 to 1,000)
  - SIL 3: PFD 1.0e-4 to 1.0e-3 (RRF 1,000 to 10,000)
  - SIL 4: PFD < 1.0e-4 (RRF > 10,000 - requires inherent safe redesign)."""
    },
    {
        "doc_id": "std-iec-60812",
        "title": "IEC 60812 Failure Mode and Effects Analysis (FMEA & FMECA)",
        "text": """IEC 60812 Failure Modes and Effects Analysis (FMEA and FMECA):
Systematic Evaluation of Industrial Machinery Failure Modes:
- Severity Ranking (S): 1 (Negligible) to 10 (Catastrophic process shutdown, environmental spill, injury).
- Occurrence Ranking (O): 1 (Extremely unlikely, > 10 years MTBF) to 10 (Frequent, recurrent weekly failure).
- Detection Ranking (D): 1 (Automated online DCS sensor with interlock) to 10 (Undetectable latent failure until catastrophic loss).
- Risk Priority Number (RPN):
  RPN = Severity * Occurrence * Detection (Scale 1 to 1000)
- Criticality Thresholds:
  - RPN >= 200 or Severity >= 9: Mandatory corrective action plan (CAPA) with engineering redesign or dual redundancy.
  - RPN 100 to 199: Condition monitoring enhancement (continuous vibration, thermography, oil analysis).
  - RPN < 100: Acceptable risk managed under routine preventive maintenance schedule."""
    },
    {
        "doc_id": "std-osha-psm",
        "title": "OSHA 1910.119 Process Safety Management (PSM) of Highly Hazardous Chemicals",
        "text": """OSHA 29 CFR 1910.119 Process Safety Management of Highly Hazardous Chemicals:
Mandatory Statutory Framework for Petroleum Refineries and Chemical Plants:
- 14 Key PSM Elements:
  1. Process Safety Information (PSI): Complete technical documentation of hazardous chemicals, process chemistry, and equipment design codes.
  2. Process Hazard Analysis (PHA): Systematic HAZOP, LOPA, or What-If evaluations updated every 5 years.
  3. Operating Procedures: Standard written steps for startup, normal run, temporary run, emergency shutdown.
  4. Mechanical Integrity (MI): Rigorous inspection, testing, and quality assurance for pressure vessels, piping, relief valves, interlocks, and pumps.
  5. Management of Change (MOC): Written authorization and technical review prior to any physical or operational parameter change.
  6. Pre-Startup Safety Review (PSSR): Formal field verification before introducing hydrocarbons to new or modified units.
  7. Incident Investigation: Root cause analysis (RCA) with 5-Whys methodology within 48 hours of any near-miss or release."""
    },
    {
        "doc_id": "std-tema-class-r",
        "title": "TEMA Class R Tubular Heat Exchanger Design & Rating Standards",
        "text": """Tubular Exchanger Manufacturers Association (TEMA 10th Edition) Class R:
Standards for Petroleum and Related Processing Applications (Severe Service):
- Minimum shell diameter, tube wall thicknesses, and tie rod counts.
- Thermal Rating & Log Mean Temperature Difference (LMTD):
  Delta_T_lm = ((T_h_in - T_c_out) - (T_h_out - T_c_in)) / ln((T_h_in - T_c_out) / (T_h_out - T_c_in))
  Corrected MTD: Delta_T_m = F_t * Delta_T_lm (where F_t is the multipass configuration factor).
- Overall Heat Transfer Coefficient (U):
  1 / U_design = 1 / h_outside + R_f_outside + (D_o * ln(D_o / D_i)) / (2 * k_tube) + (D_o / D_i) * (R_f_inside + 1 / h_inside)
- Standard TEMA Class R Fouling Allowances (R_f):
  - Heavy crude oil / slurry: 0.00035 to 0.0005 m^2-K/W
  - Treated cooling tower water: 0.00018 to 0.00035 m^2-K/W
  - Clean hydrocarbon gases / naphtha: 0.00018 m^2-K/W
- Hydraulic Limits: Shell-side pressure drop typically <= 70 kPa (10 psi), tube-side <= 100 kPa (14.5 psi)."""
    },
    {
        "doc_id": "std-api-510",
        "title": "API 510 Pressure Vessel Inspection Code — Remaining Life & Corrosion Rate",
        "text": """API Standard 510 (10th Edition) Pressure Vessel Inspection Code: In-service Inspection, Rating, Repair, and Alteration:
Corrosion Rate Determination:
- Short-Term Corrosion Rate: C_st = (t_previous - t_current) / (years_between_inspections)
- Long-Term Corrosion Rate: C_lt = (t_initial - t_current) / (years_in_service)
- Governing Corrosion Rate: C_gov = max(C_st, C_lt)
Remaining Service Life (RL):
RL (years) = (t_current - t_minimum) / C_gov
Where t_minimum is calculated per ASME Section VIII Div 1 UG-27.
Inspection Interval Rules (Clause 7.1.1):
Internal inspection or on-stream examination interval shall not exceed one-half the remaining life of the vessel or 10 years, whichever is less.
When remaining life is less than 4 years, inspection intervals may be adjusted to equal the remaining life up to a maximum of 2 years.
Maximum Allowable Working Pressure Rating (MAWPr):
MAWPr = (S * E * t_current) / (R + 0.6 * t_current)"""
    },
    {
        "doc_id": "std-nace-mr0175",
        "title": "NACE MR0175 / ISO 15156 Petroleum Materials in H2S-Containing Environments",
        "text": """NACE MR0175 / ISO 15156 Petroleum and Natural Gas Industries — Materials for use in H2S-containing environments in oil and gas production:
Sulfide Stress Cracking (SSC) & Hydrogen-Induced Cracking (HIC) Assessment:
- Sour Service Threshold: Gas systems with H2S partial pressure >= 0.05 psia (0.3 kPa) or liquid multiphase with sour dissolved gas.
- H2S Partial Pressure: P_H2S = Total_Pressure * (H2S_mole_percent / 100).
- SSC Severity Regions (Part 2, Figure 1):
  - Region 0: Non-sour environment (P_H2S < 0.05 psia).
  - Region 1: Low sour severity (P_H2S 0.05 to 0.5 psia, pH >= 5.5).
  - Region 2: Moderate sour severity (pH 4.0 to 5.5).
  - Region 3: Severe sour severity (P_H2S > 1.5 psia or low pH < 4.0).
- Metallurgical Requirements for Carbon & Low-Alloy Steels:
  - Maximum allowable hardness: 22 HRC (Rockwell C) or 248 HV (Vickers) per Table A.1.
  - Mandatory Post-Weld Heat Treatment (PWHT) to relieve residual stresses and temper HAZ.
  - Nickel content limited to <= 1.0 wt% to prevent sulfide cracking acceleration."""
    },
    {
        "doc_id": "std-api-682",
        "title": "API 682 Pumps — Shaft Sealing Systems for Centrifugal and Rotary Pumps",
        "text": """API Standard 682 (4th Edition) / ISO 21049 Shaft Sealing Systems for Centrifugal and Rotary Pumps:
Mechanical Seal Configurations & Standard Piping Flush Plans:
- Plan 11: Recirculation from pump discharge through orifice to seal chamber. Standard flush plan for clean general refinery services.
- Plan 21: Discharge recirculation through cooler to seal chamber. Used for hot hydrocarbons to prevent seal face boiling.
- Plan 23: Closed loop cooling via pumping ring through external heat exchanger. Maximizes energy efficiency in hot water and light hydrocarbons.
- Plan 31: Discharge recirculation through cyclone separator. Removes abrasive solids before entering seal chamber.
- Plan 53A/B/C: Pressurized dual barrier fluid seal system. Used for toxic, flammable, and high-volatility fluids (benzene, LPG, sour crude) where zero atmospheric leakage is mandatory.
- Alert Threshold: Barrier pressure loss or seal temperature rise > 15°C above baseline indicates impending seal failure."""
    },
    {
        "doc_id": "std-asme-b311",
        "title": "ASME B31.1 Power Piping Code — Steam Headers & Boiler External Piping",
        "text": """ASME B31.1 Power Piping Code (2022 Edition):
Piping Systems in Electric Power Generating Stations, Industrial Plants, and District Heating:
- Boiler External Piping (BEP): Piping connecting the boiler drum to the first isolation or stop valve. Governed strictly by ASME Section I requirements and certified with ASME Code stamping.
- Non-Boiler External Piping (NBEP): Balance of plant steam headers, condensate lines, and feed water systems.
- Minimum wall thickness calculation per Paragraph 104.1.2:
  t_m = (P * D_o) / (2 * (S * E + P * y)) + A
  Where y is the temperature coefficient (0.4 for ferritic steels < 480°C).
- Thermal Expansion and Flexibility Analysis:
  Steam headers operating at 400°C to 540°C experience thermal expansion rates of 5 to 8 mm per meter of pipe run.
  Expansion loops, spring hangers, and anchors must be designed to keep expansion stress range within S_A allowable limits."""
    },
    {
        "doc_id": "std-nfpa-30",
        "title": "NFPA 30 Flammable and Combustible Liquids Code — Storage Tank Farms",
        "text": """NFPA 30 Flammable and Combustible Liquids Code (2021 Edition):
Design and Safety Protection for Petroleum Tank Farms:
- Liquid Classification: Class I (Flash point < 37.8°C / 100°F), Class II, Class III.
- Secondary Containment (Dike Impoundment):
  The volumetric capacity of the diked area shall not be less than the greatest amount of liquid that can be released from the largest tank within the diked area (100% capacity), assuming a full tank, plus freeboard allowance for a 24-hour 25-year rainfall event (typically 110% total volume).
- Tank Spacing: Distance between adjacent floating roof tanks shall be at least 1/6 the sum of adjacent diameters (minimum 0.9 m / 3 ft).
- Venting Requirements: Normal breathing venting sized per API 2000; emergency relief venting to prevent overpressure tank rupture during external pool fire exposure."""
    },
    {
        "doc_id": "std-api-571",
        "title": "API 571 Damage Mechanisms Affecting Fixed Equipment in Refining Industry",
        "text": """API Recommended Practice 571 (3rd Edition, 2020) Damage Mechanisms Affecting Fixed Equipment in the Refining Industry:
Comprehensive Catalog of 66 Industrial Degradation Mechanisms:
1. Sulfidic Corrosion (High-Temperature H2/H2S and Crude):
   Accelerates rapidly at temperatures > 230°C (450°F) in carbon steels. Evaluated via McConomy and Couper-Gorman curves.
2. Naphthenic Acid Corrosion (NAC):
   Occurs in crude distillation furnaces, transfer lines, and vacuum towers processing crude with Total Acid Number (TAN) > 0.5 mg KOH/g at temperatures 220°C to 400°C.
3. Chloride Stress Corrosion Cracking (Cl- SCC):
   Affects 300-series austenitic stainless steels exposed to moisture, oxygen, and chlorides at temperatures > 60°C (140°F).
4. Ammonium Salt Fouling and Corrosion:
   Deposition of NH4Cl and NH4HS salts in hydroprocessing reactor effluents causing localized under-deposit gouging.
5. High-Temperature Hydrogen Attack (HTHA):
   Evaluated per Nelson curves in API 941; methane formation within grain boundaries causing internal fissuring and loss of ductility."""
    },
    {
        "doc_id": "std-api-521-depressure",
        "title": "API 521 § 5.7 Emergency Vapor Depressuring & Cryogenic Blowdown Systems",
        "text": """API Standard 521 (7th Edition, 2020) Section 5.7: Vapor Depressuring Systems and Emergency Blowdown:
Depressuring Criterion:
- Depressuring systems shall be designed to reduce the vessel internal pressure to 50% of the design pressure or 6.9 bar gauge (100 psig), whichever is lower, within 15 minutes (900 seconds) under fire exposure or emergency trip.
- Joule-Thomson Cryogenic Chilling: High-velocity expansion of hydrocarbon or hydrogen-rich gas across restriction orifices causes severe auto-refrigeration.
- Minimum Design Metal Temperature (MDMT) per ASME Section VIII Div 1 UCS-66: The lowest transient metal temperature of the vessel shell and blowdown line must remain at or above the MDMT.
- If metal temperature drops below MDMT, mandatory Charpy V-notch impact testing at minimum design temperature or metallurgical upgrade to 3.5% Ni / 304L/316L stainless steel is required to prevent catastrophic brittle failure."""
    },
    {
        "doc_id": "std-api-684-rotordynamics",
        "title": "API 684 / API 617 Rotordynamics & Critical Speed Campbell Diagrams",
        "text": """API Standard 684 (2nd Edition) & API 617 (8th Edition) Axial and Centrifugal Compressors and Expander-Compressors:
Rotordynamic Lateral and Torsional Critical Speeds:
- Separation Margins:
  1. If first lateral critical speed Nc1 is below operating speed: Nc1 shall be at least 16% below minimum operating speed.
  2. If second lateral critical speed Nc2 is above operating speed: Nc2 shall be at least 26% above maximum continuous speed.
- Campbell Diagram Resonance Verification: Interference check verifying that excitation harmonics (1X unbalance, 2X misalignment, blade pass frequency Z*N) do not coincide within +/- 10% of any rotor natural frequency across the operating range.
- Shaft Misalignment Severity: Evaluated via 2X/1X vibration velocity ratio and axial vibration; excessive misalignment derates bearing L10h fatigue life per ISO 281."""
    },
    {
        "doc_id": "std-iec-60079-hazloc",
        "title": "IEC 60079 Explosive Atmospheres & Hazardous Area Classification (Ex-d / Ex-e)",
        "text": """IEC 60079-0 (General Requirements), IEC 60079-1 (Flameproof 'd'), and IEC 60079-7 (Increased Safety 'e'):
Equipment Protection in Flammable Vapor / Gas Environments:
- Zone Classification: Zone 0 (continuous hazard), Zone 1 (likely in normal operation), Zone 2 (unlikely/short duration).
- Gas Groups and Maximum Experimental Safe Gap (MESG):
  1. Group IIA: Propane/Methane (MESG > 0.9 mm)
  2. Group IIB: Ethylene (0.5 mm <= MESG <= 0.9 mm)
  3. Group IIC: Hydrogen / Acetylene (MESG < 0.5 mm) - highest explosion severity.
- Temperature Classes (T-Class): Maximum enclosure surface temperature shall not exceed:
  T1: 450°C, T2: 300°C, T3: 200°C, T4: 135°C, T5: 100°C, T6: 85°C.
- Thermal Safety Margin: Surface temperature must maintain at least 50°C safety margin below auto-ignition temperature (AIT) of surrounding atmosphere.
- Enclosure Ingress Protection: IP66 or IP67 required for outdoor refinery environments."""
    },
    {
        "doc_id": "std-isa-182-alarms",
        "title": "ANSI/ISA-18.2 & EEMUA 191 Alarm Management & Alarm Flood Mitigation",
        "text": """ANSI/ISA-18.2-2016 Management of Alarm Systems for Process Industries & EEMUA Publication 191:
Alarm System Performance Metrics and Control Room Human Factors:
- Target Alarm Rates:
  1. Normal Steady-State: < 1 alarm per 10 minutes (manageable by operator).
  2. Alarm Flood Threshold: > 10 alarms per 10 minutes (requires automated suppression).
- Alarm Rationalization Lifecycle:
  1. First-Out Identification: Isolates the primary trip initiator from downstream consequential cascade alarms.
  2. Chattering Suppression: Automatically debounces alarms transitioning > 3 times in 60 seconds by applying 2% to 5% deadband hysteresis.
  3. Standing Alarm Suppression: Shelves stale standing alarms inactive for > 24 hours.
5. Priority Distribution: Recommended target: Critical/P1 <= 5%, High/P2 <= 15%, Medium/Low/P3 >= 80%."""
    },
    {
        "doc_id": "std-api-579-lefm",
        "title": "API 579-1 / ASME FFS-1 Part 9 Linear Elastic Fracture Mechanics (LEFM) & Paris Law",
        "text": """API 579-1 / ASME FFS-1 Fitness-For-Service Part 9: Assessment of Crack-Like Flaws:
Linear Elastic Fracture Mechanics (LEFM) & Sub-Critical Fatigue Crack Propagation:
- Paris-Erdogan Fatigue Law: da/dN = C * (Delta_K)^m
- Stress Intensity Factor Range: Delta_K = Y * Delta_sigma * sqrt(pi * a)
  Where Y is the boundary correction factor for semi-elliptical surface cracks in cylindrical shells:
  Y = 1.12 - 0.231*(a/W) + 10.55*(a/W)^2 - 21.72*(a/W)^3 + 30.39*(a/W)^4
- Critical Crack Depth (ac): Determined by setting K_I = K_IC / 1.25 (allowable toughness with safety margin):
  ac = (1 / pi) * [ (K_IC / 1.25) / (Y * Delta_sigma) ]^2
- Cumulative Cycles to Rupture: N_f = [2 / (C * Y^m * Delta_sigma^m * pi^(m/2))] * [a0^(1 - m/2) - ac^(1 - m/2)]
- Fitness-for-Service Acceptance Criteria:
  Level 2 requires final crack depth at end of inspection interval to not exceed 50% of critical depth (ac) and not exceed 20% of nominal wall thickness."""
    },
    {
        "doc_id": "std-asme-thermal-shock",
        "title": "ASME Section VIII Div 2 Part 5 & Section III NB-3200 Pressurized Thermal Shock (PTS)",
        "text": """ASME Boiler & Pressure Vessel Code Section VIII Div 2 Part 5 (Design by Analysis) & Section III Subsection NB-3200:
Pressurized Thermal Shock (PTS) and Elastic Shakedown Boundary Assessment:
- Biot Number: Bi = (h * t_w) / k_m
  Where h is the inner quench film coefficient (W/m²K), t_w is wall thickness (m), and k_m is metal thermal conductivity (W/mK).
- Peak Transient Thermal Shock Surface Stress:
  sigma_th = [E * alpha * Delta_T / (1 - nu)] * [Bi / (Bi + 1.2)]
  Where E is Young's modulus, alpha is thermal expansion coefficient, Delta_T is quench differential, and nu is Poisson's ratio.
- Combined Primary + Secondary Stress: sigma_total = sigma_hoop + sigma_th
- Shakedown & Ratcheting Criterion:
  sigma_total <= 3 * S_m (where S_m is the allowable design stress intensity).
  Satisfying the 3*Sm limit guarantees that after initial cyclic plastic strain, the structure shakes down to purely elastic behavior, preventing progressive plastic ratcheting and catastrophic low-cycle thermal fatigue."""
    },
    {
        "doc_id": "std-api-2218-fireproofing",
        "title": "API 2218 & UL 1709 Passive Fireproofing for Hydrocarbon Processing Plants",
        "text": """API Recommended Practice 2218 (3rd Edition) & UL 1709 Rapid Hydrocarbon Fire Exposure:
Fireproofing Practices in Petroleum and Petrochemical Processing Plants:
- Fire Curve: UL 1709 Rapid Temperature Rise Fire Test reaches 1093°C (2000°F) within 5 minutes and maintains severe heat flux of 204 kW/m².
- Critical Steel Collapse Temperature: Structural carbon and low-alloy steels lose > 50% of yield strength at 538°C (1000°F).
- Passive Fireproofing Materials and Thermal Diffusivity (alpha):
  1. Dense Concrete (Portland/aggregate): alpha = 5.0e-7 m²/s
  2. Lightweight Cementitious (Vermiculite/Perlite): alpha = 3.6e-7 m²/s
  3. Epoxy Intumescent Coatings: alpha = 3.2e-7 m²/s
- 1D Fourier Thermal Diffusion Model: t_endurance = [(Delta_x / (2 * 0.505))^2] / alpha
- Statutory Fire Ratings:
  1-Hour Rating: Minimum fireproofing thickness for secondary pipe racks.
  2-Hour Rating: Mandatory for vessel skirts, structural columns supporting operating weight > 4500 kg.
  3-Hour Rating: Standard for high-hazard hydrocracking units, toxic inventory columns, and pressurized sphere legs."""
    },
    {
        "doc_id": "std-hei-condensers",
        "title": "HEI Standards for Steam Surface Condensers & ASME PTC 12.2 Steam Power Plant Performance",
        "text": """Heat Exchange Institute (HEI) Standards for Steam Surface Condensers (12th Edition) & ASME PTC 12.2:
Surface Condenser Thermal and Vacuum Performance Rating:
- Thermal Condensation Duty: Q = m_steam * (h_exhaust - h_condensate)
- Circulating Water Temperature Rise: Delta_T_cw = Q / (m_cw * Cp_water)
- Saturation Pressure and Vacuum: Saturation temperature T_sat determined from measured condenser back-pressure via Antoine relation.
- Terminal Temperature Difference (TTD): TTD = T_sat - T_cw_out. Normal design TTD is between 3°C and 8°C.
- Subcooling: Delta_T_sub = T_sat - T_condensate. Subcooling > 2.0°C indicates excessive air leakage or air removal system failure.
- Cleanliness Factor (CF): CF = (U_actual / U_clean_HEI) * 100%. HEI clean overall heat transfer coefficient accounts for tube OD, water velocity, material correction factor (Titanium = 0.81, Admiralty = 1.00), and water inlet temperature.
- Turbine Heat Rate Impact: A 10 mbar deterioration in condenser vacuum imposes an approximate 1.2% heat rate (fuel consumption) penalty on steam turbine performance."""
    },
    {
        "doc_id": "std-api-650-seismic",
        "title": "API 650 Appendix E & ASCE 7 Seismic Design & Hydrodynamic Sloshing of Storage Tanks",
        "text": """API Standard 650 (13th Edition) Appendix E: Seismic Design of Storage Tanks & ASCE 7-22:
Hydrodynamic Sloshing and Structural Stability of Flat-Bottom Storage Tanks:
- Two-Response Spectrum Model:
  1. Impulsive Mode (Period Ti): Rigid liquid mass oscillating synchronously with tank shell.
  2. Convective Mode (Period Tc): Free liquid sloshing wave motion governed by:
     Tc = 2*pi * sqrt[ (D/2) / (1.84 * g * tanh(1.84 * H_L / (D/2))) ]
- Slosh Wave Height (d_max): d_max = 0.5 * D * Ac * I. If d_max exceeds available freeboard (H_tank - H_liquid), sloshing wave impacts the floating or fixed roof, causing tearing or product release.
- Overturning Moment (M_rw) and Base Shear (V_total = sqrt(Vi² + Vc²)).
- Shell Compression and Elephant's Foot Buckling: Peak shell compressive stress at bottom course must remain below classical elastic-plastic buckling threshold (API 650 E.6.2.2).
- Anchorage Ratio J: J = M_rw / (w_t * pi * R²). If J > 1.54, mechanical anchor bolts or holding straps are mandatory to prevent tank uplift."""
    },
    {
        "doc_id": "std-iso-13374-fdd",
        "title": "ISO 13374 & VDI 2888 Condition Monitoring, Sensor Validation, and Fault Detection & Diagnostics",
        "text": """ISO 13374 (Condition Monitoring and Diagnostics of Machine Systems) & VDI 2888:
Automated Sensor Drift, Reliability Indexing, and Fault Detection and Diagnostics (FDD):
- Sensor Calibration Drift: Linear drift rate (units/sample) and cumulative deviation from calibrated zero/span:
  Drift% = (|Delta_x| / Span) * 100%
- Statutory Calibration Tolerance: Process safety loops require recalibration when drift exceeds 2.0% of calibrated span.
- Redundant Channel Cross-Validation: Dual or triple-redundant sensors (1oo2, 2oo3) are evaluated using Mean Absolute Error (MAE) and voting residuals.
- Frozen Sensor Diagnostic: Sensors exhibiting near-zero standard deviation (< 1e-4) over active process dynamics are flagged as frozen, open-circuit, or stuck transmitter electronics.
- Sensor Reliability Index: Exponential health score R = 100 * exp(-|Delta_x| / Tol) indicating remaining instrument measurement confidence."""
    },
    {
        "doc_id": "std-ieee-1584-arcflash",
        "title": "IEEE 1584-2018 & NFPA 70E Arc Flash Hazard & Electrical Safety in Industrial Facilities",
        "text": """IEEE 1584-2018 Guide for Performing Arc-Flash Hazard Calculations & NFPA 70E (2024 Edition):
Electrical Arc Flash Hazard Assessment & Personal Protective Equipment (PPE):
- Arcing Current (Ia): Determined from bolted three-phase fault current (Ibf), system nominal voltage (0.208 kV to 15 kV), electrode gap, and enclosure dimensions.
- Incident Energy (E): Radiant and convective energy at working distance D (typically 914 mm / 36 in for switchgear):
  E = (4.184 / 20) * Cf * En * (t / 0.2) * (610 / D)^x (cal/cm²)
- Arc Flash Boundary (AFB): Distance from arcing point at which incident energy drops to 1.2 cal/cm² (onset of second-degree burn).
- NFPA 70E PPE Categories:
  1. Cat 1: <= 4 cal/cm² (Arc-rated shirt and pants)
  2. Cat 2: <= 8 cal/cm² (Arc flash suit, face shield / balaclava)
  3. Cat 3: <= 25 cal/cm² (Full arc flash suit, hood, insulated gloves)
  4. Cat 4: <= 40 cal/cm² (Multi-layer arc flash suit, hood, hearing protection)
  5. Incident energy > 40 cal/cm²: Dangerous; energized electrical work is strictly prohibited."""
    },
    {
        "doc_id": "std-asme-ptc43-acid-dewpoint",
        "title": "ASME PTC 4.3 & Verhoff-Banchero Flue Gas Acid Dew Point & Air Preheater Cold-End Corrosion",
        "text": """ASME PTC 4.3 Air Heaters & Verhoff-Banchero Acid Gas Condensation Formulation:
Flue Gas Sulfuric Acid Dew Point and Cold-End Corrosion Prevention:
- Sulfuric Acid Dew Point (T_dew_H2SO4):
  1000/T = 2.276 - 0.02943*ln(P_H2O) - 0.0858*ln(P_SO3) + 0.0062*ln(P_H2O)*ln(P_SO3) (Kelvin)
  Where P_H2O and P_SO3 are partial pressures in mmHg.
- Cold-End Acid Margin: Metal temperature of air preheater tubes and flue gas ducting must maintain at least 15°C margin above the calculated acid dew point (T_metal >= T_dew + 15°C).
- Corrosion Mechanism: Below the acid dew point, concentrated H2SO4 (70-85 wt%) condenses on carbon steel surfaces, producing rapid localized thinning rates up to 5 mm/year and catastrophic basket collapse."""
    },
    {
        "doc_id": "std-iec-61882-hazop",
        "title": "IEC 61882:2016 Hazard and Operability Studies (HAZOP) & Process Hazard Analysis (PHA)",
        "text": """IEC 61882:2016 Hazard and operability studies (HAZOP studies) - Application guide & OSHA 1910.119 PSM:
Systematic Process Parameter Deviations & Safeguard Evaluation:
- Standard Guide Words: MORE, LESS, NONE, REVERSE, AS WELL AS, PART OF, OTHER THAN.
- Process Parameters: Flow, Pressure, Temperature, Level, Composition, Phase.
- Risk Assessment Scoring: Risk = Severity (1 to 5) x Likelihood (1 to 5).
  1. Low Risk (1-4): Acceptable with standard engineering controls.
  2. Medium Risk (5-9): Action items required for next turnaround cycle.
  3. High / Critical Risk (10-25): Mandatory high-integrity safety instrumented functions (SIF / SIS per IEC 61511) or independent protection layers (IPL)."""
    },
    {
        "doc_id": "std-iso-13849-functional-safety",
        "title": "ISO 13849-1 & IEC 62061 Machinery Functional Safety Performance Level (PL)",
        "text": """ISO 13849-1:2023 Safety of machinery — Safety-related parts of control systems & IEC 62061:
Machinery Safety Integrity & Performance Level (PL) Verification:
- Designated Architecture Categories:
  1. Category B & 1: Single-channel architecture, MTTFd capped at 10 years, no diagnostic coverage required.
  2. Category 2: Single-channel with periodic testing and check channel.
  3. Category 3: Dual-channel redundant architecture, single fault does not lead to loss of safety function.
  4. Category 4: Dual-channel redundant architecture with high diagnostic coverage (DCavg >= 99%) detecting accumulation of faults.
- Diagnostic Coverage (DCavg): Low (60-90%), Medium (90-99%), High (>= 99%).
- Common Cause Failure (CCF): Minimum 65 points required on Annex F checklist (separation, diversity, overvoltage protection).
- Performance Levels (PL a to PL e) and equivalent IEC 62061 SIL claims (SIL 1 to SIL 3)."""
    },
    {
        "doc_id": "std-eemua-158-flare-aiv",
        "title": "EEMUA 158 & API 520 Part II Acoustical Induced Vibration (AIV) in Flare Piping Systems",
        "text": """EEMUA Publication 158 / API Standard 520 Part II / API Standard 521 § 5.8:
Acoustically Induced Vibration (AIV) and High-Cycle Fatigue in Pressure Relief Systems:
- Sound Power Level (Lw): Calculated per Carucci-Mueller acoustic generation model at pressure-reducing devices and valve trims.
- Screening Limit: If Lw >= 155 dB, pipe branch junctions and welded attachments are prone to acoustic fatigue cracking.
- High Risk Boundary: Lw >= 160 dB requires mandatory pipe wall thickening (Schedule 80/160), contoured forged tees, full-encirclement reinforcement pads, or multiple-stage acoustic trim.
- Gas Velocity & Mach Limit: Tailpipe discharge Mach number must not exceed 0.70; main flare sub-headers and collectors must not exceed Mach 0.50."""
    },
    {
        "doc_id": "std-api-670-machinery-protection",
        "title": "API Standard 670 Machinery Protection Systems & Proximity Probe Diagnostics",
        "text": """API Standard 670 (5th Edition) Machinery Protection Systems & ISO 7919-2 Rotating Machines:
Non-Contacting Proximity Probe System Calibration & Automatic Trip Logic:
- Transducer Sensitivity: Standard 200 mV/mil (7.874 mV/μm) eddy-current proximity probe systems.
- DC Gap Voltage: Normal operating linear range is -9.0 V to -11.0 V DC (mechanical gap approx 1.0 mm).
- Dual Orthogonal Probes: Probes mounted 90° apart (X and Y) at each radial bearing for complete 2D orbit visualization.
- Two-Out-of-Two (2oo2) Voting: Automatic machinery emergency trip requires confirmation from both orthogonal channels (X and Y) or validated hardware channel health diagnostics to prevent spurious trips.
- Keyphasor Transducer: Phase reference probe for 1X vibration amplitude and phase lag analysis."""
    },
    {
        "doc_id": "std-api-537-flare-tips",
        "title": "API 537 & ISO 25457 Flare Details, Radiation Contours & Smokeless Steam Optimization",
        "text": """API Standard 537 (3rd Edition) / ISO 25457 Flare Details for Petroleum and Petrochemical Industries & API 521 § 5.7:
Flare Thermal Radiation Modeling and Environmental Steam Optimization:
- Brzustowski & Sommer Flame Coordinate Formulation: Models the curved centerline of a wind-tilted flame using momentum-flux ratios.
- Ground Radiation Design Thresholds:
  1. 1.58 kW/m² (500 BTU/hr-ft²): Continuous exposure limit for operating personnel without special protective gear.
  2. 4.73 kW/m² (1500 BTU/hr-ft²): Permissible for short duration (2-3 minutes) escape with appropriate clothing.
  3. 9.46 kW/m² (3000 BTU/hr-ft²): Maximum exposure for equipment and structures before paint blistering and thermal damage.
- Smokeless Steam Ratio: EPA 40 CFR 63.670 compliant steam injection ratio (typically 0.28 - 0.40 kg steam per kg hydrocarbon) adjusted by carbon-to-hydrogen mass ratio to prevent soot formation while preserving 98% combustion efficiency."""
    },
    {
        "doc_id": "std-asme-app1-conical-shells",
        "title": "ASME Section VIII Div 1 Mandatory Appendix 1-5 Conical Reducer Transitions",
        "text": """ASME Boiler & Pressure Vessel Code Section VIII Division 1 Mandatory Appendix 1-5 & UG-32(g):
Rules for Conical Reducer Sections and Knuckle Junction Transitions:
- Conical Shell Required Thickness under Internal Pressure:
  t = (P * D_L) / (2 * cos(alpha) * (S*E - 0.6*P)) + c
  Where alpha is the half-apex angle, limited to <= 30 degrees for standard non-knuckle transitions.
- Large End Junction Reinforcement: When alpha exceeds delta = 30 * sqrt(P / (S*E)), localized circumferential compression induces knuckle buckling risk, mandating an increased shell thickness or a reinforcement ring.
- Hydrostatic Test Pressure (UG-99): Standard 1.30 x MAWP corrected by the temperature stress ratio."""
    },
    {
        "doc_id": "std-iso-1940-rotor-balancing",
        "title": "ISO 1940-1 & ANSI S2.19 Mechanical Vibration — Balance Quality of Rigid Rotors",
        "text": """ISO 1940-1:2003 / ANSI S2.19 Balance Quality Requirements of Rotors in a Constant (Rigid) State:
Dynamic Balancing Criteria & Permissible Residual Unbalance:
- Balance Quality Grade G (mm/s):
  1. G 0.4: Gyroscopes and high-precision machine tool spindles.
  2. G 1.0: Turbo-generator sets, steam and gas turbines.
  3. G 2.5: Process compressors, refinery centrifugal pumps, and electric motor armatures.
  4. G 6.3: General machinery and process fans.
- Permissible Specific Unbalance (e_per in g*mm/kg or micrometers): e_per = 1000 * G / omega.
- Total Permissible Unbalance: U_per = e_per * M_rotor, split symmetrically between Drive End (DE) and Non-Drive End (NDE) balance planes.
- Trial Weight Selection: In-situ trim balancing using 2-plane influence coefficient matrix methods."""
    },
    {
        "doc_id": "std-nfpa-68-explosion-venting",
        "title": "NFPA 68 & NFPA 69 Deflagration Venting & Industrial Explosion Protection",
        "text": """NFPA 68 (2023 Edition) Standard on Explosion Protection by Deflagration Venting & NFPA 69:
Deflagration Pressure Relief for Silos, Dust Collectors, and Process Enclosures:
- Dust Explosion Classes:
  1. St 1: Kst <= 200 bar*m/s (Weak to moderate deflagration severity).
  2. St 2: 200 < Kst <= 300 bar*m/s (Strong deflagration severity).
  3. St 3: Kst > 300 bar*m/s (Very strong deflagration severity e.g. aluminum powder).
- Vent Area (Av) Equation: Sized to ensure internal deflagration pressure does not exceed the vessel's reduced design pressure P_red:
  A_v0 = 1e-4 * (1 + 1.54 * P_stat^1.33) * K_st * V^0.75 * sqrt(P_max / P_red - 1)
- Duct Inertia Penalty: Vent discharge ducts exceeding 3 meters introduce significant backpressure, requiring enlargement of vent relief area and verification of structural recoil thrust forces."""
    },
    {
        "doc_id": "std-asme-b313-appendix-x-thermal-flexibility",
        "title": "ASME B31.3 Appendix X & § 319 Piping Flexibility Analysis & Thermal Expansion Stress",
        "text": """ASME B31.3 Process Piping § 319 & Appendix X (Piping Flexibility Analysis):
Rules for Thermal Expansion, Cold Spring, and Allowable Displacement Stress Range:
- Thermal Growth Calculation: Delta_L = L * alpha * (T_op - T_amb).
- Allowable Displacement Stress Range (SA) per § 302.3.5:
  S_A = f * [1.25 * (S_c + S_h) - S_L]
  Where S_c is cold allowable stress, S_h is hot allowable stress, S_L is sustained longitudinal stress (pressure + weight), and f is cyclic stress range reduction factor (f = 1.0 for <= 7000 cycles).
- Guided Cantilever & Expansion Loop Sizing: Loop absorbed deflection delta_y = Delta_L / 2.
  Thermal displacement stress: S_E = (1.5 * E * D_o * delta_y) / H^2 * (H / (H + W)).
- Anchor Reaction Forces: Thrust force F_anchor = 3 * E * I * delta_y / H^3.
- Compliance: S_E <= S_A guarantees prevention of low-cycle plastic fatigue and anchor nozzle overload."""
    },
    {
        "doc_id": "std-api-661-air-cooled-heat-exchangers",
        "title": "API Standard 661 & ISO 13706 Air-Cooled Heat Exchangers (Fin-Fan Coolers)",
        "text": """API Standard 661 (7th Edition) / ISO 13706 Petroleum, Petrochemical and Natural Gas Industries — Air-Cooled Heat Exchangers:
Thermal & Mechanical Rating of Fin-Fan Coolers:
- Surface Areas: Bare external tube area and extended finned area with fin surface enhancement factor (typical 18x to 23x).
- Crossflow LMTD Correction: Effective Delta_Tm = Ft * LMTD where crossflow correction factor Ft is typically 0.92 - 0.96 for multi-pass arrangements.
- Airside Static Pressure Drop: Total bundle resistance including fin tube matrix (typically 120 - 220 Pa) and plenum losses.
- Fan Aerodynamics: Fan volumetric flow, fan diameter (3.0 - 4.5 m), blade tip speed limits (maximum 61 m/s per API 661 for acoustic noise control).
- Fan Shaft Power Demand: BHP = (Q_air * Delta_P_static) / (eta_fan * 1000). Direct or belt drive electric motor sizing."""
    },
    {
        "doc_id": "std-iec-60079-10-1-hazardous-area",
        "title": "IEC 60079-10-1:2020 & API RP 505 Hazardous Area Classification for Flammable Gases",
        "text": """IEC 60079-10-1 (3rd Edition 2020) & API RP 505 / NFPA 497 Classification of Areas — Explosive Gas Atmospheres:
Methodology for Determination of Hazardous Zones and Release Dispersion Boundaries:
- Release Grade Classification:
  1. Continuous: Flammable atmosphere present continuously or for long periods (> 1000 hr/yr) -> Zone 0.
  2. Primary: Expected to occur periodically during normal operations (10 to 1000 hr/yr) -> Zone 1.
  3. Secondary: Not expected in normal operation, rare and brief (< 10 hr/yr) -> Zone 2.
- Release Rate Modeling (Wg): Sonic choked jet discharge through leak orifice (Cd = 0.62) or subsonic orifice expansion.
- Hazardous Boundary Distance (rz): r_z = k * sqrt(W_g / (LEL_mass * u_w)) where u_w is ambient/ventilation air velocity.
- Electrical Apparatus Protection: Equipment protection levels (Ga, Gb, Gc), gas explosion groups (IIA, IIB, IIC), and temperature classification (T1 to T6)."""
    },
    {
        "doc_id": "std-norsok-m710-rgd-elastomers",
        "title": "NORSOK M-710 Rev 3 & ISO 23936-2 Rapid Gas Decompression (RGD) Qualification of Elastomers",
        "text": """NORSOK Standard M-710 (Revision 3) & ISO 23936-2 Petroleum and Natural Gas Industries — Materials for use in contact with media related to oil and gas production:
Qualification of Non-Metallic Sealing Materials and Rapid Gas Decompression (RGD) Resistance:
- Gas Absorption: Henry's Law solubility under high pressures (150 to 350 bar) in methane, carbon dioxide, and sour gas mixtures.
- Decompression Stress Mechanism: When ambient depressurization rate (e.g. 70 bar/min) exceeds molecular gas diffusion through the polymer matrix, trapped dissolved gas creates localized internal tensile cavitation stress.
- Gent-Lindley Cavitation Criterion: Void growth occurs when internal stress exceeds 2.5 * G (elastomer shear modulus).
- NORSOK Crack Ratings:
  Rating 0000: Completely crack-free cross section (undamaged).
  Rating 1000: Micro-voids localized, maximum crack length < 0.5 mm, passing criterion.
  Rating 2000 - 4000: Severe blistering and structural rupture, failed qualification."""
    }
]

def main():
    print("=" * 60)
    print("INDRA Sovereign AI — Expanding Knowledge Base to 54 Standard Documents")
    print("=" * 60)

    os.makedirs(STORE_PATH, exist_ok=True)
    kb = KnowledgeBase()
    
    # Clear and repopulate docs
    kb._docs = {}
    for doc in DOCUMENTS:
        kb.ingest_document(
            doc_id=doc["doc_id"],
            title=doc["title"],
            text=doc["text"],
            extra_meta={
                "size": f"{len(doc['text']) / 1024:.1f} KB",
                "status": "indexed",
                "source": "Sovereign Engineering Standards Repository"
            }
        )
        print(f"  [+] Indexed: {doc['doc_id']} — {doc['title']}")

    kb._rebuild_index()
    kb._save()

    stats = kb.get_collection_stats()
    print("\n[SUCCESS] Knowledge Base Expanded Successfully!")
    print(f"  Total Unique Documents: {stats['document_count']}")
    print(f"  Total Indexed Chunks:   {stats['total_chunks']}")
    print(f"  Index Type:             {stats['index_type']}")
    print(f"  Air-Gapped Status:      {stats['is_air_gapped']}")

    # Verification test
    test_queries = [
        "ASME B31.3 pipe wall thickness formula",
        "API 617 compressor anti surge control line margin",
        "API 579 fitness for service local thin area RSF",
        "IEC 61511 LOPA SIL target mitigated event frequency",
        "TEMA Class R heat exchanger fouling factor",
        "NACE MR0175 sour service H2S partial pressure hardness 22 HRC",
        "API 650 tank shell 1-foot method hydrotest",
        "ASME PTC 4 fired heater thermal efficiency excess oxygen",
        "API 510 pressure vessel remaining life half life inspection interval",
    ]
    print("\n--- Verifying Semantic BM25 Search across Domains ---")
    for q in test_queries:
        res = kb.search(q, top_k=1)
        top = res[0] if res else {"title": "NONE", "relevance_score": 0.0}
        print(f"  Query: '{q[:40]}...' -> Match: {top['title']} (Score: {top['relevance_score']})")

if __name__ == "__main__":
    main()
