import json
import os

path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "equipment.json")

with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

new_assets = [
    {
        "tag": "TK-101",
        "name": "Crude Oil Bulk Storage Tank (Floating Roof)",
        "unit": "Offsite Tank Farm (TKF-100)",
        "type": "Atmospheric Storage Tank",
        "service": "Atmospheric crude oil storage with Pontoon external floating roof",
        "description": "API 650 13th Edition 100,000 m3 crude storage tank subject to API 650 Appendix E seismic sloshing and hydrodynamic uplift verification.",
        "design_pressure_psig": 0.5,
        "design_temp_c": 60.0,
        "diameter_m": 45.0,
        "height_m": 18.0,
        "material": "SA-516 Gr 70 / A36 Carbon Steel",
        "asme_rating": "API 650 (13th Ed.) Appendix E Seismic Rated",
        "status": "OPERATIONAL",
        "telemetry": {
            "liquid_level_m": 15.5,
            "liquid_density_kg_m3": 850.0,
            "tank_temperature_c": 38.5,
            "slosh_wave_height_m": 1.28,
            "available_freeboard_m": 2.50,
            "overturning_moment_kn_m": 42500.0,
            "shell_compressive_stress_mpa": 42.1,
            "anchor_bolt_stress_mpa": 68.4
        }
    },
    {
        "tag": "SC-101",
        "name": "Turbine Surface Steam Condenser",
        "unit": "Cogeneration & Utility Complex",
        "type": "Surface Steam Condenser",
        "service": "Steam turbine exhaust vacuum condensation and deaeration",
        "description": "HEI Standards (12th Edition) 2-pass surface condenser with 6800 Titanium Grade 2 tubes operating at 95 mbar back-pressure.",
        "design_pressure_psig": 15.0,
        "design_temp_c": 120.0,
        "tube_material": "Titanium Grade 2",
        "asme_rating": "HEI Standards 12th Ed. / ASME PTC 12.2",
        "status": "OPERATIONAL",
        "telemetry": {
            "steam_flow_kg_s": 85.0,
            "measured_back_pressure_mbar": 95.0,
            "condensate_temp_c": 44.5,
            "cooling_water_inlet_temp_c": 28.0,
            "cooling_water_outlet_temp_c": 37.8,
            "cleanliness_factor_pct": 88.5,
            "terminal_temp_difference_ttd_c": 7.1,
            "subcooling_c": 0.4
        }
    },
    {
        "tag": "T-401",
        "name": "Vacuum Distillation Bottoms Stripper Column",
        "unit": "Distillation Complex (VDU-200)",
        "type": "Fractionation Column",
        "service": "Superheated steam stripping of short residue bottoms",
        "description": "Packed vacuum tower stripping residue to optimize asphalt and vacuum gas oil yields under severe thermal cracking conditions.",
        "design_pressure_psig": 50.0,
        "design_temp_c": 420.0,
        "material": "SA-387 Gr 11 Clad 410S Stainless Steel",
        "asme_rating": "ASME Section VIII Div 1 / API 560",
        "status": "OPERATIONAL",
        "telemetry": {
            "overhead_pressure_mbar_a": 45.0,
            "stripping_steam_flow_t_h": 12.5,
            "bottoms_temp_c": 395.0,
            "level_pct": 52.4,
            "dp_packing_mbar": 8.5
        }
    },
    {
        "tag": "ESDV-501",
        "name": "Reactor Emergency Isolation Ball Valve",
        "unit": "Hydrocracking Unit (HCU-100)",
        "type": "Emergency Shutdown Valve",
        "service": "Fail-closed fast emergency isolation of hydrocracker high-pressure reactor feed",
        "description": "ASME B16.34 Class 1500 metal-seated ball valve with SIL-3 pneumatic actuator capable of complete zero-leakage shutoff in 1.2 seconds.",
        "design_pressure_psig": 3750.0,
        "design_temp_c": 450.0,
        "material": "Forged F347H Stainless Steel / Stellite 6 Overlay",
        "asme_rating": "ASME Class 1500 / IEC 61508 SIL-3 Certified",
        "status": "OPERATIONAL",
        "telemetry": {
            "valve_position_pct": 100.0,
            "pneumatic_header_pressure_bar": 7.2,
            "full_stroke_test_time_s": 1.25,
            "partial_stroke_test_result": "PASS",
            "seat_leakage_rate_ml_min": 0.0
        }
    },
    {
        "tag": "MOV-202",
        "name": "Crude Charge Transfer Isolation Motor Valve",
        "unit": "Crude Distillation Unit (CDU-100)",
        "type": "Motor-Operated Gate Valve",
        "service": "Crude oil charge isolation between pump P-101 and preheat train",
        "description": "ASME B16.34 Class 600 flexible wedge gate valve with explosion-proof Limitorque electric actuator and remote DCS loop control.",
        "design_pressure_psig": 1480.0,
        "design_temp_c": 200.0,
        "material": "ASTM A216 WCB Cast Carbon Steel",
        "asme_rating": "ASME B16.34 Class 600 / API 600",
        "status": "OPERATIONAL",
        "telemetry": {
            "valve_position_pct": 100.0,
            "motor_current_amps": 14.2,
            "actuator_torque_pct": 42.0,
            "stem_vibration_mms": 0.85,
            "open_travel_time_s": 28.0
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
