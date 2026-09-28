import json
import os

path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "equipment.json")

with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

new_assets = [
    {
        "tag": "FLARE-TIP-101",
        "name": "High-Efficiency Smokeless Flare Tip Assembly",
        "unit": "Environmental & Flare Systems (UTL-400)",
        "type": "Sonic Flare Tip Assembly",
        "service": "Hydrocarbon relief depressuring & smokeless combustion",
        "description": "API 537 / ISO 25457 sonic velocity flare tip with automated steam assist ring, flame retention lugs, and continuous pilot telemetry.",
        "design_pressure_psig": 50.0,
        "design_temp_c": 1100.0,
        "asme_rating": "API 537 / API 521 / ISO 25457",
        "status": "OPERATIONAL",
        "telemetry": {
            "tip_temperature_c": 820.0,
            "steam_pressure_bar": 7.5,
            "pilot_flame_signal_mv": 24.5,
            "ground_radiation_kw_m2": 1.76,
            "smokeless_steam_ratio": 0.32
        }
    },
    {
        "tag": "CONE-101",
        "name": "Vacuum Distillation Conical Transition Section",
        "unit": "Vacuum Distillation Unit (VDU-200)",
        "type": "Conical Shell Reducer",
        "service": "Transition between flash zone and wash bed section",
        "description": "72-inch to 36-inch conical reducer transition shell designed per ASME Section VIII Div 1 Appendix 1-5 with 25-degree half-apex angle.",
        "design_pressure_psig": 250.0,
        "design_temp_c": 180.0,
        "material": "SA-516 Gr 70 / 316L Clad",
        "asme_rating": "ASME Section VIII Div 1 Appendix 1-5",
        "status": "OPERATIONAL",
        "telemetry": {
            "current_shell_thickness_in": 0.625,
            "minimum_required_thickness_in": 0.6253,
            "large_diameter_in": 72.0,
            "small_diameter_in": 36.0,
            "half_apex_angle_deg": 25.0,
            "mawp_psig": 249.9
        }
    },
    {
        "tag": "BAL-ROTOR-101",
        "name": "High-Pressure Recycle Gas Compressor Rotor",
        "unit": "Hydrocracking Unit (HCU-100)",
        "type": "Centrifugal Impeller Rotor",
        "service": "ISO 1940-1 Grade G2.5 balanced high-speed rotor",
        "description": "450 kg forged 17-4PH stainless steel compressor rotor balanced to ISO 1940-1 Grade G2.5 at 6000 RPM with residual unbalance monitoring.",
        "design_speed_rpm": 6000.0,
        "design_temp_c": 140.0,
        "asme_rating": "ISO 1940-1:2003 / API 617",
        "status": "OPERATIONAL",
        "telemetry": {
            "operating_speed_rpm": 5980.0,
            "unbalance_plane1_g_mm": 24.5,
            "unbalance_plane2_g_mm": 28.2,
            "permissible_unbalance_g_mm": 99.5,
            "shaft_vibration_mms": 1.42
        }
    },
    {
        "tag": "SILO-VENT-101",
        "name": "Polypropylene Polymer Silo Deflagration Vent",
        "unit": "Petrochemicals & Solids Handling (PETRO-500)",
        "type": "Explosion Deflagration Vent Panel",
        "service": "Combustible dust explosion pressure relief per NFPA 68",
        "description": "48 m3 polymer storage silo equipped with low-inertia rupture panels certified per NFPA 68:2023 for St-1 organic dust explosion containment.",
        "design_pressure_psig": 15.0,
        "design_temp_c": 60.0,
        "asme_rating": "NFPA 68 / NFPA 69 / VDI 3673",
        "status": "OPERATIONAL",
        "telemetry": {
            "silo_internal_pressure_mbar": 12.0,
            "dust_concentration_g_m3": 45.0,
            "vent_panel_burst_pressure_bar": 0.10,
            "recoil_force_kn": 78.2,
            "panel_seal_integrity": "INTACT"
        }
    },
    {
        "tag": "EXP-VENT-201",
        "name": "Pulverized Fuel Milling Enclosure Relief Vent",
        "unit": "Captive Power Generation (CG-100)",
        "type": "Deflagration Pressure Relief Door",
        "service": "Rapid deflagration containment and venting per NFPA 68",
        "description": "Spring-loaded deflagration relief door for coal/petcoke pulverizer mill preventing mechanical overpressurization during startup.",
        "design_pressure_psig": 20.0,
        "design_temp_c": 120.0,
        "asme_rating": "NFPA 68 / NFPA 85",
        "status": "OPERATIONAL",
        "telemetry": {
            "mill_inlet_temp_c": 115.0,
            "vent_seal_differential_mbar": 8.5,
            "mill_vibration_mms": 2.1,
            "safety_interlock_status": "ARMED_HEALTHY"
        }
    }
]

existing_tags = {item.get("tag") for item in data}
for a in new_assets:
    if a["tag"] not in existing_tags:
        data.append(a)

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Total equipment items in registry: {len(data)}")
