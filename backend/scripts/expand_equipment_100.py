import json
import os

EQUIPMENT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "equipment.json")

new_items = [
    {
        "tag": "K-201",
        "name": "Multi-Cylinder Reciprocating Make-Up Hydrogen Compressor",
        "unit": "Hydrocracker Unit (HCU)",
        "type": "Reciprocating Process Compressor",
        "service": "High Pressure Hydrogen Make-Up Service",
        "description": "API Standard 618 (5th Edition) / ISO 13707 double-acting 2-cylinder reciprocating compressor with pulsation suppression dampener bottles rated for 14.8 bar a discharge.",
        "design_pressure_psig": 250.0,
        "design_temp_c": 165.0,
        "piston_bore_diameter_mm": 380.0,
        "stroke_length_mm": 250.0,
        "crankshaft_speed_rpm": 450.0,
        "number_of_cylinders": 2,
        "cylinder_clearance_volume_pct": 12.5,
        "suction_pressure_bar_a": 3.5,
        "discharge_pressure_bar_a": 14.8,
        "material": "Forged Carbon Steel Cylinder with Nitrided 4140 Piston Rods",
        "asme_rating": "API 618 5th Edition Design Approach 2",
        "status": "OPERATIONAL",
        "telemetry": {
            "operating_speed_rpm": 450.0,
            "actual_suction_flow_m3_h": 2152.8,
            "discharge_temp_c": 139.7,
            "indicated_power_kw": 284.5,
            "shaft_bhp_kw": 309.2,
            "volumetric_efficiency_pct": 70.3,
            "pulsation_bottle_m3": 0.45,
            "status": "VIBRATION_LOW"
        }
    },
    {
        "tag": "B-101",
        "name": "Industrial High-Pressure Water-Tube Power Boiler",
        "unit": "Utility Steam Generation Plant",
        "type": "Natural Circulation Water-Tube Boiler",
        "service": "High Pressure Superheated Steam Generation",
        "description": "ASME Section I Power Boiler rated for 120 tonne/hour continuous steam generation at 95 bar g with natural thermosiphon circulation and downcomer-riser loop.",
        "design_pressure_psig": 1450.0,
        "design_temp_c": 320.0,
        "steam_drum_pressure_barg": 95.0,
        "steam_production_tonne_h": 120.0,
        "riser_tubes_count": 180,
        "downcomers_count": 4,
        "downcomer_height_m": 22.0,
        "material": "SA-106 Gr B / SA-210 Gr A1 Seamless Boiler Tubes",
        "asme_rating": "ASME Boiler and Pressure Vessel Code Section I (PG)",
        "status": "OPERATIONAL",
        "telemetry": {
            "steam_generation_tonne_h": 120.0,
            "steam_pressure_barg": 95.0,
            "circulation_ratio": 5.8,
            "thermosiphon_head_kpa": 48.2,
            "dnb_safety_margin": 1.93,
            "drum_water_level_pct": 52.4,
            "status": "CIRCULATION_STABLE"
        }
    },
    {
        "tag": "F-101-RAD-01",
        "name": "Crude Charge Fired Heater Radiant Section Tube Pass",
        "unit": "Crude Distillation Unit (CDU-I)",
        "type": "Fired Heater Radiant Tube Circuit",
        "service": "Heavy Crude Oil High-Temperature Heating",
        "description": "API Standard 530 / ISO 13704 radiant coil tube pass constructed from 6.625-inch OD ASTM A335 Gr P9 alloy with Larson-Miller creep rupture evaluation for 580°C metal temperature.",
        "design_pressure_psig": 450.0,
        "design_temp_c": 620.0,
        "tube_od_in": 6.625,
        "nominal_thickness_in": 0.280,
        "corrosion_allowance_in": 0.0625,
        "material": "ASTM A335 Gr P9 (9Cr-1Mo High Temperature Ferritic Alloy)",
        "asme_rating": "API Standard 530 / ASME B31.3",
        "status": "OPERATIONAL",
        "telemetry": {
            "tube_metal_temp_c": 574.5,
            "heat_flux_kw_m2": 42.0,
            "hoop_stress_mpa": 45.7,
            "thermal_gradient_stress_mpa": 32.1,
            "creep_rupture_life_years": 40.5,
            "creep_damage_fraction": 0.28,
            "status": "CREEP_QUALIFIED"
        }
    },
    {
        "tag": "P-801",
        "name": "Heavy Vacuum Residue Rotary Twin-Screw Transfer Pump",
        "unit": "Vacuum Distillation Unit (VDU)",
        "type": "Positive Displacement Rotary Twin-Screw Pump",
        "service": "High-Viscosity Hot Vacuum Residue / Bitumen Transfer",
        "description": "API Standard 676 (3rd Edition) / ISO 14847 horizontal twin-screw double-volute positive displacement pump for 450 cSt bitumen service at 28 bar differential pressure.",
        "design_pressure_psig": 450.0,
        "design_temp_c": 220.0,
        "differential_pressure_bar": 28.0,
        "operating_viscosity_cst": 450.0,
        "screw_rotor_diameter_mm": 160.0,
        "screw_pitch_mm": 85.0,
        "operating_speed_rpm": 1450.0,
        "material": "Cast Steel Casing with Nitrided Alloy Steel Screw Rotors",
        "asme_rating": "API Standard 676 / ISO 14847",
        "status": "OPERATIONAL",
        "telemetry": {
            "delivered_flow_m3_h": 186.8,
            "volumetric_efficiency_pct": 96.6,
            "differential_pressure_bar": 28.0,
            "shaft_power_kw": 179.8,
            "npsh_margin_m": 4.2,
            "casing_vibration_mms": 1.8,
            "status": "OPTIMAL_VISCOUS_TRANSFER"
        }
    },
    {
        "tag": "BDV-301",
        "name": "Low-Temperature Flare Blowdown Emergency Isolation Valve",
        "unit": "Cryogenic Ethylene Refrigeration Unit",
        "type": "Emergency Depressuring Valve (BDV)",
        "service": "Cryogenic Hydrocarbon Vapor Blowdown to Flare",
        "description": "API Standard 521 § 5.7 and IEC 61511 SIL 3 certified fail-open cryogenic emergency blowdown valve rated for -46°C low-temperature chilling during rapid depressuring.",
        "design_pressure_psig": 600.0,
        "design_temp_c": -50.0,
        "valve_size_in": 6.0,
        "flange_class": 300,
        "material": "ASTM A352 Gr LCC Low-Temperature Carbon Steel",
        "asme_rating": "ASME B16.34 / API 521 / IEC 61511 SIL 3",
        "status": "OPERATIONAL",
        "telemetry": {
            "valve_position_pct": 0.0,
            "actuator_air_pressure_bar": 6.2,
            "upstream_pressure_barg": 28.5,
            "depressuring_chill_temp_c": -38.4,
            "proof_test_interval_days": 180,
            "status": "ARMED_FAIL_OPEN"
        }
    }
]

with open(EQUIPMENT_PATH, "r", encoding="utf-8") as f:
    current_data = json.load(f)

current_tags = {item["tag"] for item in current_data}
added = 0
for it in new_items:
    if it["tag"] not in current_tags:
        current_data.append(it)
        added += 1

with open(EQUIPMENT_PATH, "w", encoding="utf-8") as f:
    json.dump(current_data, f, indent=2)

print(f"Successfully added {added} new equipment assets! Total equipment items now: {len(current_data)}")
