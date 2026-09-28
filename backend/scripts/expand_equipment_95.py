import json
import os

EQUIPMENT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "equipment.json")

new_items = [
    {
        "tag": "EXP-PIPE-101",
        "name": "Hydrocracker Hot Effluent Transfer Line with Expansion Loop",
        "unit": "Hydrocracking Unit (HCU)",
        "type": "Process Piping Line",
        "service": "High Temperature Hydrocarbon Vapor & Hydrogen",
        "description": "12-inch NPS Sch 80 Cr-Mo (ASTM A335 Gr P11) hot effluent transfer line with 6m x 4m expansion loop for thermal flexibility absorption per ASME B31.3 § 319.",
        "design_pressure_psig": 650.0,
        "design_temp_c": 380.0,
        "nominal_size_in": 12.0,
        "pipe_od_in": 12.75,
        "pipe_od_mm": 323.85,
        "wall_thickness_mm": 17.48,
        "flange_class": 600,
        "allowable_stress_psi": 16700.0,
        "material": "ASTM A335 Gr P11 (1.25Cr-0.5Mo)",
        "asme_rating": "ASME B31.3 Severe Cyclic / High Temperature Service",
        "status": "OPERATIONAL",
        "telemetry": {
            "operating_temp_c": 350.0,
            "operating_pressure_psig": 580.0,
            "thermal_expansion_mm": 200.5,
            "anchor_thrust_force_kn": 48.2,
            "displacement_stress_range_mpa": 164.7,
            "allowable_stress_range_mpa": 271.3,
            "status": "NORMAL"
        }
    },
    {
        "tag": "AFC-101",
        "name": "Atmospheric Column Overhead Fin-Fan Air Cooler",
        "unit": "Crude Distillation Unit (CDU-II)",
        "type": "Air-Cooled Heat Exchanger (Fin-Fan)",
        "service": "Atmospheric Overhead Naphtha Vapor Condensation",
        "description": "API Standard 661 / ISO 13706 induced-draft air-cooled heat exchanger consisting of 2 bays, 480 high-fin tubes, and 4 direct-drive electric cooling fans rated at 14.5 MWth.",
        "design_pressure_psig": 150.0,
        "design_temp_c": 160.0,
        "heat_duty_mw": 14.5,
        "process_fluid": "Atmospheric Overhead Vapor",
        "process_inlet_temp_c": 125.0,
        "process_outlet_temp_c": 45.0,
        "ambient_design_c": 35.0,
        "tubes_count": 480,
        "bays_count": 2,
        "fans_count": 4,
        "material": "Carbon Steel Tubes with Extruded Aluminum Fins",
        "asme_rating": "ASME Section VIII Div 1 / API 661 7th Ed.",
        "status": "OPERATIONAL",
        "telemetry": {
            "process_flow_kg_s": 32.0,
            "air_mass_flow_kg_s": 436.3,
            "fan_shaft_power_kw": 107.9,
            "lmtd_effective_c": 25.38,
            "u_bare_w_m2_k": 1632.7,
            "static_pressure_drop_pa": 180.0,
            "status": "OPTIMAL_COOLING"
        }
    },
    {
        "tag": "HAC-CELL-101",
        "name": "Compressor House Flammable Atmosphere Classification Cell",
        "unit": "Hydrocarbon Gas Compression Station",
        "type": "Hazardous Area Classification Enclosure",
        "service": "Propane and Light Hydrocarbon Refrigerant Gas",
        "description": "IEC 60079-10-1:2020 and API RP 505 hazardous explosive gas atmosphere classification zone model for high pressure compressor seals, piping manifolds, and mechanical ventilation.",
        "design_pressure_psig": 350.0,
        "design_temp_c": 60.0,
        "gas_mixture": "Propane / Light Hydrocarbon Mix (MW 44.1)",
        "lel_vol_pct": 2.1,
        "uel_vol_pct": 9.5,
        "material": "Reinforced Concrete and Steel Frame with Explosion-Proof Luminaires",
        "asme_rating": "IEC 60079-14 / NEC 500 / API RP 505",
        "status": "CERTIFIED",
        "telemetry": {
            "operating_pressure_bar_g": 24.0,
            "gas_release_rate_g_s": 46.0,
            "ventilation_velocity_m_s": 0.50,
            "dispersion_radius_m": 7.01,
            "iec_zone": "Zone 2",
            "api_division": "Class I, Division 2",
            "gas_group": "IIA",
            "temperature_class": "T3",
            "status": "VENTILATION_MONITORED"
        }
    },
    {
        "tag": "RGD-SEAL-101",
        "name": "High-Pressure Gas Choke Rapid Decompression FFKM Seal",
        "unit": "High-Pressure Gas Wellhead Choke Manifold",
        "type": "Elastomeric Barrier Seal Assembly",
        "service": "Supercritical Sour Gas (85% CH4, 10% CO2, 5% H2S)",
        "description": "NORSOK M-710 Rev 3 and ISO 23936-2 qualified perfluoroelastomer (FFKM 90 Shore A) rapid gas decompression (RGD) resistant seal ring for 280 bar cyclic gas service.",
        "design_pressure_psig": 4060.0,
        "design_temp_c": 160.0,
        "pressure_rating_bar": 280.0,
        "cross_section_mm": 5.33,
        "material": "FFKM (Perfluoroelastomer) 90 Shore A",
        "asme_rating": "NORSOK M-710 / ISO 23936-2 Rating 0000 / 1000",
        "status": "OPERATIONAL",
        "telemetry": {
            "system_pressure_bar_g": 280.0,
            "operating_temp_c": 145.0,
            "decompression_rate_bar_min": 70.0,
            "dissolved_gas_cm3_cm3": 12.6,
            "blistering_margin_factor": 1.12,
            "norsok_rating": "1000",
            "status": "RGD_QUALIFIED"
        }
    },
    {
        "tag": "DEHY-TOWER-102",
        "name": "High Capacity Glycol Contactor Column",
        "unit": "Natural Gas Sweetening & Dehydration Unit",
        "type": "Gas Dehydration Contactor",
        "service": "High Pressure Sour Natural Gas Dehydration",
        "description": "GPSA Engineering Data Book Section 20 structured packing triethylene glycol (TEG) absorption contactor for 85 MMSCFD natural gas dehydration at 1050 psia.",
        "design_pressure_psig": 1200.0,
        "design_temp_c": 90.0,
        "gas_flow_mmscfd": 85.0,
        "contactor_diameter_m": 1.85,
        "material": "SA-516 Gr 70 HIC Tested with 316L Stainless Steel Cladding",
        "asme_rating": "ASME Section VIII Div 1 / NACE MR0175",
        "status": "OPERATIONAL",
        "telemetry": {
            "operating_pressure_psia": 1050.0,
            "inlet_temp_c": 38.0,
            "water_removed_lb_day": 4850.0,
            "outlet_dewpoint_c": -68.5,
            "rich_teg_concentration_pct": 96.2,
            "reboiler_duty_kw": 285.0,
            "status": "OPTIMAL_ABSORPTION"
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
