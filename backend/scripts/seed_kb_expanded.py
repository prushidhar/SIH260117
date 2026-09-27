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
    }
]

def main():
    print("=" * 60)
    print("INDRA Sovereign AI — Expanding Knowledge Base to 31 Standard Documents")
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
