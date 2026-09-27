import json
import os

path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "equipment.json")

with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

new_assets = [
    {
        "tag": "R-401",
        "name": "Hydrocracking Heavy Wall Reactor",
        "unit": "Hydrocracking Unit (HCU-100)",
        "type": "High-Pressure Reactor",
        "service": "Exothermic hydrotreating / hydrocracking heavy gas oil",
        "description": "Heavy-wall 2.25Cr-1Mo-V reactor operating under severe high-pressure hydrogen service with automated API 579 Paris-law crack growth monitoring.",
        "design_pressure_psig": 2540.0,
        "design_temp_c": 450.0,
        "wall_thickness_mm": 150.0,
        "material": "SA-336 Gr F22V (2.25Cr-1Mo-V Vanadium Modified Steel)",
        "asme_rating": "ASME Section VIII Division 2 Class 2",
        "status": "OPERATIONAL",
        "telemetry": {
            "internal_pressure_bar": 165.2,
            "bed_inlet_temp_c": 395.4,
            "bed_peak_temp_c": 418.6,
            "hydrogen_partial_pressure_bar": 142.0,
            "delta_t_quench_c": 28.5,
            "cyclic_stress_range_mpa": 145.0,
            "subcritical_crack_depth_mm": 5.2,
            "acoustic_emission_hits_per_hr": 3.0
        }
    },
    {
        "tag": "PTS-101",
        "name": "Emergency High-Pressure Quench Sparger",
        "unit": "Hydrocracking Unit (HCU-100)",
        "type": "Thermal Shock Injection Sparger",
        "service": "Fast-acting cold hydrogen / gas oil emergency runaway quench",
        "description": "ASME Section III NB-3200 / Section VIII Div 2 pressurized thermal shock quench nozzle subject to extreme rapid temperature transients.",
        "design_pressure_psig": 2600.0,
        "design_temp_c": 440.0,
        "wall_thickness_mm": 95.0,
        "material": "Alloy 800H / SA-182 F347H Clad",
        "asme_rating": "ASME Section VIII Div 2 Part 5 PTS-Rated",
        "status": "OPERATIONAL",
        "telemetry": {
            "nozzle_metal_temp_c": 382.0,
            "quench_fluid_temp_c": 26.5,
            "biot_number": 10.15,
            "transient_thermal_stress_mpa": 298.4,
            "combined_peak_stress_mpa": 421.2,
            "shakedown_margin_pct": 14.9,
            "injection_valve_position_pct": 0.0,
            "header_pressure_bar": 172.0
        }
    },
    {
        "tag": "SK-201",
        "name": "Main Fractionator Column Support Skirt",
        "unit": "Distillation Complex (CDU/VDU)",
        "type": "Structural Support Skirt",
        "service": "Primary load-bearing skirt for 48m distillation column",
        "description": "Heavy cylindrical steel support skirt protected by 65mm lightweight cementitious passive fireproofing per API 2218 / UL 1709.",
        "design_pressure_psig": 15.0,
        "design_temp_c": 350.0,
        "wall_thickness_mm": 32.0,
        "material": "SA-516 Gr 70 Carbon Steel with UL 1709 Fireproofing",
        "asme_rating": "API 2218 Class A / UL 1709 3-Hour Fireproofed",
        "status": "OPERATIONAL",
        "telemetry": {
            "jacket_surface_temp_c": 36.5,
            "skirt_metal_temp_c": 42.1,
            "fireproofing_thickness_mm": 65.0,
            "fire_endurance_certified_hrs": 3.42,
            "jacket_integrity_pct": 98.5,
            "wind_load_deflection_mm": 1.8,
            "anchor_bolt_tension_kn": 420.0
        }
    },
    {
        "tag": "HIPPS-101",
        "name": "High-Integrity Pressure Protection System",
        "unit": "Offshore Pipeline Reception Terminal",
        "type": "Safety Instrumented System (SIS)",
        "service": "Subsea pipeline overpressure isolation in < 2.0 seconds",
        "description": "IEC 61508 / IEC 61511 certified SIL-4 safety loop featuring 2oo3 voting pressure transmitters and dual fail-closed fast-acting ball valves.",
        "design_pressure_psig": 3750.0,
        "design_temp_c": 85.0,
        "material": "Inconel 625 / Duplex 2205 Body",
        "asme_rating": "ASME Class 1500 / SIL-4 Certified",
        "status": "OPERATIONAL",
        "telemetry": {
            "pt_101a_pressure_bar": 182.4,
            "pt_101b_pressure_bar": 182.1,
            "pt_101c_pressure_bar": 182.5,
            "voting_logic_state": "2oo3_NORMAL",
            "valve_a_stroke_time_s": 1.45,
            "valve_b_stroke_time_s": 1.52,
            "partial_stroke_test_status": "PASS_RECENT",
            "pfd_avg": 2.4e-5
        }
    },
    {
        "tag": "FLARE-101",
        "name": "Multi-Point Ground Flare High-Pressure Sonic Header",
        "unit": "Relief & Flare Complex",
        "type": "Smokeless Sonic Ground Flare Header",
        "service": "Smokeless emergency combustion of hydrocarbon blowdown streams",
        "description": "API 537 / API 521 staged Coanda-effect sonic flare tip system designed for 1200 t/h emergency flaring with continuous flame detection.",
        "design_pressure_psig": 150.0,
        "design_temp_c": 850.0,
        "material": "Alloy 625 / 310S Stainless Steel",
        "asme_rating": "API 537 / ASME Section VIII",
        "status": "OPERATIONAL",
        "telemetry": {
            "header_pressure_mbar": 42.0,
            "pilot_flame_temp_c": 920.0,
            "optical_flame_sensor_status": "ALL_12_PILOTS_HEALTHY",
            "purge_gas_flow_nm3_h": 125.0,
            "sound_pressure_level_dba": 78.5,
            "smokeless_capacity_pct": 100.0,
            "flare_gas_mw": 28.4
        }
    }
]

existing_tags = {x["tag"] for x in data}
for a in new_assets:
    if a["tag"] not in existing_tags:
        data.append(a)

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Success! Total assets in registry: {len(data)}")
