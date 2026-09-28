import json
import os

path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "equipment.json")

with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

new_assets = [
    {
        "tag": "MCC-101",
        "name": "Medium-Voltage Motor Control Center (6.6 kV)",
        "unit": "Electrical Substation & Power Distribution (SUB-100)",
        "type": "Medium-Voltage Switchgear",
        "service": "6.6 kV power distribution for heavy refinery pump drivers P-101, P-201, and compressors K-101, K-102",
        "description": "Arc-resistant switchgear compliant with IEEE 1584-2018 and NFPA 70E with 25 kA bolted fault rating and 150 ms relay trip clearing.",
        "design_voltage_kv": 6.6,
        "design_temp_c": 50.0,
        "asme_rating": "IEEE 1584 / NFPA 70E / IEC 62271-200",
        "status": "OPERATIONAL",
        "telemetry": {
            "bus_voltage_kv": 6.58,
            "total_load_current_amps": 640.0,
            "busbar_temp_c": 48.5,
            "bolted_fault_rating_ka": 25.0,
            "incident_energy_cal_cm2": 6.85,
            "arc_flash_boundary_mm": 1820.0,
            "ppe_category": "PPE CATEGORY 2 (8 cal/cm²)"
        }
    },
    {
        "tag": "APH-101",
        "name": "Crude Charge Furnace Air Preheater",
        "unit": "Crude Distillation Unit (CDU-100)",
        "type": "Air Preheater",
        "service": "Waste heat recovery from furnace F-101 flue gas to combustion air",
        "description": "Tubular heat exchanger operating in the cold-end flue gas boundary with automated sulfuric acid dew point monitoring per ASME PTC 4.3.",
        "design_pressure_psig": 15.0,
        "design_temp_c": 280.0,
        "material": "Corten A Cold-End Corrosion Resistant Steel",
        "asme_rating": "ASME PTC 4.3 / API 560",
        "status": "OPERATIONAL",
        "telemetry": {
            "flue_gas_inlet_temp_c": 245.0,
            "flue_gas_outlet_temp_c": 142.0,
            "air_outlet_temp_c": 185.0,
            "sulfuric_acid_dew_point_c": 126.8,
            "cold_end_corrosion_margin_c": 15.2,
            "draft_loss_mbar": 4.2
        }
    },
    {
        "tag": "K-103",
        "name": "Flash Gas Centrifugal Compressor Train",
        "unit": "Hydrocracking Unit (HCU-100)",
        "type": "Centrifugal Compressor Train",
        "service": "3-stage compression of intermediate flash gas with interstage cooling",
        "description": "API 617 3-stage barrel compressor with equal pressure ratio optimization, water-cooled intercoolers, and continuous vibration monitoring.",
        "design_pressure_psig": 2600.0,
        "design_temp_c": 180.0,
        "material": "SA-350 LF2 Forged Carbon Steel",
        "asme_rating": "API 617 (8th Ed.) / ASME PTC 10",
        "status": "OPERATIONAL",
        "telemetry": {
            "suction_pressure_bar": 25.0,
            "discharge_pressure_bar": 175.0,
            "total_shaft_power_mw": 8.42,
            "stage1_discharge_temp_c": 98.4,
            "stage2_discharge_temp_c": 102.1,
            "stage3_discharge_temp_c": 106.8,
            "shaft_vibration_mms": 1.85
        }
    },
    {
        "tag": "SRU-101",
        "name": "Claus Sulfur Recovery Thermal Reactor",
        "unit": "Sulfur Recovery Complex (SRU-300)",
        "type": "Thermal Reaction Furnace",
        "service": "High-temperature thermal oxidation of acid gas (H2S + NH3) to elemental sulfur",
        "description": "Refractory-lined reaction furnace operating at 1250°C converting hazardous refinery sour gas per NFPA 86 and ISO 10418.",
        "design_pressure_psig": 30.0,
        "design_temp_c": 1450.0,
        "material": "High Alumina 90% Refractory / SA-516 Gr 70 Shell",
        "asme_rating": "ASME Section VIII Div 1 / NFPA 86",
        "status": "OPERATIONAL",
        "telemetry": {
            "combustion_chamber_temp_c": 1285.0,
            "burner_air_to_acid_gas_ratio": 1.42,
            "shell_skin_temp_c": 165.0,
            "sulfur_production_t_d": 120.0,
            "flame_scanner_intensity_pct": 98.0
        }
    },
    {
        "tag": "SWGR-201",
        "name": "Plant Main 11 kV Substation Switchgear",
        "unit": "Electrical Substation & Power Distribution (SUB-100)",
        "type": "Metal-Clad Medium Voltage Switchgear",
        "service": "Primary 11 kV utility grid tie-in and main turbine generator sync bus",
        "description": "Type 2B arc-resistant metal-clad switchgear with 40 kA interrupting capacity and SF6 vacuum circuit breakers per IEC 62271-200.",
        "design_voltage_kv": 11.0,
        "design_temp_c": 55.0,
        "asme_rating": "IEC 62271-200 / IEEE 1584",
        "status": "OPERATIONAL",
        "telemetry": {
            "bus_voltage_kv": 11.02,
            "grid_tie_power_mw": 32.5,
            "generator_sync_status": "LOCKED_SYNCHRONOUS",
            "ambient_temp_c": 32.0,
            "sf6_pressure_bar": 5.8
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
