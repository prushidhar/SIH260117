"""
backend/scripts/test_api_endpoints.py
Validates the newly added Phase 4 REST endpoints in backend/main.py:
1. /health
2. /api/engineering/tools
3. /api/engineering/calculate
4. /api/engineering/consensus
5. /api/audit/verify
6. /api/audit/export
7. /api/kb/query
8. /api/equipment/{tag}/integrity
"""
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app

def main():
    print("=" * 65)
    print("INDRA Sovereign AI Workbench — Phase 4 REST API Verification")
    print("=" * 65)

    client = TestClient(app)

    # 1. Health Check
    res_health = client.get("/health")
    assert res_health.status_code == 200, f"Health failed: {res_health.text}"
    health_data = res_health.json()
    assert health_data.get("air_gapped") is True
    print(f"[+] /health: OK (Tools: {health_data.get('tools_count')}, Air-Gapped: {health_data.get('air_gapped')})")

    # 2. Engineering Tools Catalog
    res_tools = client.get("/api/engineering/tools")
    assert res_tools.status_code == 200
    tools_data = res_tools.json()
    assert tools_data.get("total_tools") >= 37
    print(f"[+] /api/engineering/tools: OK ({tools_data.get('total_tools')} tools cataloged)")

    # 3. Direct Calculation Endpoint (TEMA Rating)
    res_calc = client.post("/api/engineering/calculate", json={
        "tool": "calculate_tema_heat_exchanger_rating",
        "args": {
            "tube_count": 850,
            "tube_length_m": 6.5,
            "baffle_spacing_mm": 450.0,
            "hot_fluid_t_in_c": 240.0,
            "cold_fluid_t_in_c": 90.0
        }
    })
    assert res_calc.status_code == 200
    calc_data = res_calc.json()
    assert calc_data.get("evidence_locked") is True
    assert calc_data.get("result", {}).get("compliance") == "TEMA_CLASS_R_COMPLIANT"
    print(f"[+] /api/engineering/calculate: OK (Tool: {calc_data.get('tool')}, Status: {calc_data.get('result', {}).get('compliance')}, Time: {calc_data.get('elapsed_ms')}ms)")

    # 4. Multi-Agent Consensus Adjudication Endpoint
    res_consensus = client.post("/api/engineering/consensus", json={
        "asset_tag": "HEX-301",
        "telemetry": {"vibration_rms_mms": 2.1, "vibration_limit_mms": 4.5},
        "calculation_results": {"remaining_life_years": 12.0, "pressure_drop_shell_kpa": 48.5, "pressure_drop_tube_kpa": 16.2, "overdesign_margin_pct": 4.7}
    })
    assert res_consensus.status_code == 200
    consensus_data = res_consensus.json()
    assert consensus_data.get("overall_verdict") == "UNANIMOUSLY_APPROVED_COMMERCIAL_SERVICE"
    assert len(consensus_data.get("cryptographic_seal_sha256")) == 64
    print(f"[+] /api/engineering/consensus: OK (Verdict: {consensus_data.get('overall_verdict')}, Score: {consensus_data.get('consensus_score_pct')}%, SHA-256: {consensus_data.get('cryptographic_seal_sha256')[:16]}...)")

    # 5. Cryptographic Merkle Ledger Verification Endpoint
    res_audit = client.get("/api/audit/verify")
    assert res_audit.status_code == 200
    audit_data = res_audit.json()
    assert audit_data.get("is_chain_valid") is True
    print(f"[+] /api/audit/verify: OK (Valid: {audit_data.get('is_chain_valid')}, Blocks: {audit_data.get('total_blocks')}, Head: {audit_data.get('head_hash')[:16]}...)")

    # 6. Audit Ledger Export Endpoint
    res_export = client.get("/api/audit/export")
    assert res_export.status_code == 200
    export_data = res_export.json()
    assert export_data.get("is_verified") is True
    assert len(export_data.get("chain")) == audit_data.get("total_blocks")
    print(f"[+] /api/audit/export: OK (Exported {len(export_data.get('chain'))} verified blocks)")

    # 7. Semantic KB Query Endpoint
    res_kb = client.post("/api/kb/query", json={
        "query": "ASME Section VIII Div 1 UG-27 cylindrical shell thickness",
        "top_k": 3
    })
    assert res_kb.status_code == 200
    kb_data = res_kb.json()
    assert kb_data.get("total_hits") > 0
    top_hit = kb_data.get("results")[0]
    print(f"[+] /api/kb/query: OK (Query: '{kb_data.get('query')[:30]}...' -> Top Match: '{top_hit.get('title')}', Score: {top_hit.get('relevance_score')})")

    # 8. Equipment Integrity Evaluation Endpoint
    res_integ = client.get("/api/equipment/HEX-301/integrity")
    assert res_integ.status_code == 200
    integ_data = res_integ.json()
    assert integ_data.get("evidence_locked") is True
    assert "calculation_results" in integ_data
    assert "consensus_adjudication" in integ_data
    print(f"[+] /api/equipment/HEX-301/integrity: OK (Verdict: {integ_data.get('consensus_adjudication', {}).get('overall_verdict')})")

    # 9. Air-Gap Cryptographic Attestation Endpoint
    res_attest = client.get("/api/security/airgap/attestation")
    assert res_attest.status_code == 200
    attest_data = res_attest.json()
    assert attest_data.get("airgap_certified") is True
    assert len(attest_data.get("hmac_signature_sha256")) == 64
    print(f"[+] /api/security/airgap/attestation: OK (ID: {attest_data.get('attestation_id')}, Airgap: {attest_data.get('airgap_certified')}, Level: {attest_data.get('security_level')})")

    # 10. Multi-Asset RBI Portfolio Endpoint
    res_rbi = client.post("/api/rbi/portfolio", json={
        "asset_tags": ["V-301", "V-101", "V-201"]
    })
    assert res_rbi.status_code == 200
    rbi_data = res_rbi.json()
    assert rbi_data.get("total_assets_evaluated") == 3
    assert len(rbi_data.get("portfolio")) == 3
    print(f"[+] /api/rbi/portfolio: OK (Evaluated: {rbi_data.get('total_assets_evaluated')} assets, Distribution: {rbi_data.get('matrix_distribution')})")

    # 11. Alarm Triage & Flood Suppression Endpoint
    res_triage = client.post("/api/alarms/triage", json={
        "alarms": [
            {"alarm_id": "ALM-1", "tag": "K-102", "timestamp_s": 5.0, "unit": "HCU", "severity": "P1", "description": "Trip"},
            {"alarm_id": "ALM-2", "tag": "P-101", "timestamp_s": 6.0, "unit": "HCU", "severity": "P2", "description": "Cascade"}
        ]
    })
    assert res_triage.status_code == 200
    triage_data = res_triage.json()
    assert triage_data.get("total_alarms_received") == 2
    assert triage_data.get("root_cause_initiator", {}).get("tag") == "K-102"
    print(f"[+] /api/alarms/triage: OK (Root Cause: {triage_data.get('root_cause_initiator', {}).get('tag')}, Flood Status: {triage_data.get('eemua191_flood_status')})")

    # 12. Cryogenic Blowdown Simulation Endpoint
    res_blowdown = client.post("/api/blowdown/simulate", json={
        "vessel_tag": "BDV-201",
        "initial_pressure_bar_a": 85.0,
        "orifice_diameter_mm": 38.0
    })
    assert res_blowdown.status_code == 200
    bd_data = res_blowdown.json()
    assert bd_data.get("api521_depressuring_rate_met") is True
    print(f"[+] /api/blowdown/simulate: OK (Tag: {bd_data.get('vessel_tag')}, 15min P: {bd_data.get('pressure_at_15min_bar_a')} bar, Metal T: {bd_data.get('minimum_wall_metal_temp_c')} C)")

    # 13. API 579 Crack Growth Paris Law Endpoint
    res_crack = client.post("/api/engineering/crack-growth", json={
        "asset_tag": "R-401",
        "component_thickness_mm": 150.0,
        "initial_crack_depth_a0_mm": 5.0,
        "stress_range_delta_sigma_mpa": 145.0,
        "operating_cycles_per_year": 350.0,
        "evaluation_years": 5.0,
        "material_toughness_kic_mpa_sqrt_m": 95.0
    })
    assert res_crack.status_code == 200
    crack_data = res_crack.json()
    assert crack_data.get("compliance") == "PASS_FIT_FOR_CONTINUED_SERVICE"
    assert crack_data.get("final_crack_depth_mm") > 5.0
    print(f"[+] /api/engineering/crack-growth: OK (Tag: {crack_data.get('asset_tag')}, 5yr Depth: {crack_data.get('final_crack_depth_mm')}mm, Critical: {crack_data.get('critical_crack_depth_mm')}mm, Margin: {crack_data.get('critical_crack_margin_pct')}%)")

    # 14. SCADA OPC-UA / Modbus Telemetry Streamer Endpoint
    res_scada = client.post("/api/scada/telemetry/stream", json={
        "asset_tag": "P-101",
        "noise_amplitude_pct": 0.50
    })
    assert res_scada.status_code == 200
    scada_data = res_scada.json()
    assert scada_data.get("link_status") == "ONLINE_AIR_GAPPED_LOOPBACK"
    assert len(scada_data.get("opc_ua_nodes", [])) > 0
    assert len(scada_data.get("frame_checksum_sha256", "")) == 64
    print(f"[+] /api/scada/telemetry/stream: OK (Tag: {scada_data.get('asset_tag')}, Channels: {scada_data.get('total_channels')}, Seq: {scada_data.get('sequence_number')}, Checksum: {scada_data.get('frame_checksum_sha256')[:16]}...)")

    # 15. Plant Topology Graph Endpoint
    res_topo = client.get("/api/topology/graph")
    assert res_topo.status_code == 200
    topo_data = res_topo.json()
    assert topo_data.get("total_nodes") >= 75
    assert topo_data.get("total_process_edges") >= 30
    print(f"[+] /api/topology/graph: OK ({topo_data.get('total_nodes')} Assets, {topo_data.get('total_process_edges')} Interconnections, Density: {topo_data.get('graph_density')})")

    # 16. Emergency Isolation Tracing Endpoint
    res_iso = client.post("/api/topology/trace/isolation", json={
        "target_asset": "R-401"
    })
    assert res_iso.status_code == 200
    iso_data = res_iso.json()
    assert iso_data.get("isolation_feasibility") == "FEASIBLE_FAIL_SAFE"
    assert len(iso_data.get("upstream_isolation_valves", [])) >= 1
    print(f"[+] /api/topology/trace/isolation: OK (Asset: {iso_data.get('target_asset')}, Upstream Valves: {[v['valve_tag'] for v in iso_data.get('upstream_isolation_valves', [])]}, Feasibility: {iso_data.get('isolation_feasibility')})")

    # 17. Trip Cascade Consequence Propagation Endpoint
    res_casc = client.post("/api/topology/trace/consequence", json={
        "initiating_asset": "P-101",
        "max_depth": 3
    })
    assert res_casc.status_code == 200
    casc_data = res_casc.json()
    assert casc_data.get("total_assets_impacted") >= 2
    print(f"[+] /api/topology/trace/consequence: OK (Initiator: {casc_data.get('initiating_asset')}, Impacted Assets: {casc_data.get('total_assets_impacted')}, Risk: {casc_data.get('risk_assessment')})")

    # 18. Autonomous IEC 61882 HAZOP Matrix Generator Endpoint
    res_hazop = client.post("/api/safety/hazop/matrix", json={
        "asset_tag": "R-401"
    })
    assert res_hazop.status_code == 200
    hazop_data = res_hazop.json()
    assert hazop_data.get("asset_tag") == "R-401"
    assert hazop_data.get("total_deviations_evaluated", 0) >= 8
    assert len(hazop_data.get("study_seal_sha256", "")) == 64
    print(f"[+] /api/safety/hazop/matrix: OK (Asset: {hazop_data.get('asset_tag')}, Deviations: {hazop_data.get('total_deviations_evaluated')}, High/Crit: {hazop_data.get('high_or_critical_risks_count')}, Seal: {hazop_data.get('study_seal_sha256')[:16]}...)")

    # 19. IEEE 1584 Arc Flash Hazard Evaluation Endpoint
    res_arc = client.post("/api/electrical/arc-flash", json={
        "equipment_tag": "MCC-101",
        "system_voltage_kv": 6.6,
        "bolted_fault_current_ka": 25.0,
        "arcing_fault_clearing_time_s": 0.15,
        "working_distance_mm": 914.0
    })
    assert res_arc.status_code == 200
    arc_data = res_arc.json()
    assert arc_data.get("equipment_tag") == "MCC-101"
    assert "PPE CATEGORY" in arc_data.get("nfpa_70e_ppe_category", "")
    assert arc_data.get("compliance") == "PASS_PPE_DEFINED"
    print(f"[+] /api/electrical/arc-flash: OK (Tag: {arc_data.get('equipment_tag')}, Arcing I: {arc_data.get('arcing_fault_current_ka')} kA, Incident E: {arc_data.get('incident_energy_cal_cm2')} cal/cm², AFB: {arc_data.get('arc_flash_boundary_mm')} mm, PPE: {arc_data.get('nfpa_70e_ppe_category')})")

    # 20. ASME PTC 4.3 Flue Gas Acid Dew Point Endpoint
    res_acid = client.post("/api/thermal/acid-dewpoint", json={
        "heater_tag": "F-101",
        "fuel_sulfur_wt_pct": 1.85,
        "flue_gas_excess_o2_pct": 3.2,
        "so3_ppmv": 28.5,
        "moisture_vol_pct": 12.0,
        "cold_end_metal_temp_c": 155.0,
        "air_preheater_tag": "APH-101"
    })
    assert res_acid.status_code == 200
    acid_data = res_acid.json()
    assert acid_data.get("heater_tag") == "F-101"
    assert acid_data.get("air_preheater_tag") == "APH-101"
    assert acid_data.get("sulfuric_acid_dew_point_c", 0) > 100.0
    assert acid_data.get("corrosion_margin_delta_t_c", 0) > 0
    print(f"[+] /api/thermal/acid-dewpoint: OK (Heater: {acid_data.get('heater_tag')}, APH: {acid_data.get('air_preheater_tag')}, H2SO4 Dew Point: {acid_data.get('sulfuric_acid_dew_point_c')} °C, Margin: +{acid_data.get('corrosion_margin_delta_t_c')} °C, Status: {acid_data.get('cold_end_status')})")

    # 21. ISO 13849-1 Machinery Functional Safety Performance Level (PL) Endpoint
    res_pl = client.post("/api/safety/functional-safety/pl", json={
        "safety_function_name": "High-Pressure Quench Trip Interlock",
        "architecture_category": "Category 4",
        "mttf_d_years_channel_1": 45.0,
        "mttf_d_years_channel_2": 45.0,
        "dc_avg_pct": 99.0,
        "common_cause_failure_score": 75,
        "required_performance_level": "PLe"
    })
    assert res_pl.status_code == 200
    pl_data = res_pl.json()
    assert pl_data.get("achieved_performance_level") == "PLe"
    assert pl_data.get("equivalent_sil_claim_limit") == "SIL 3"
    assert pl_data.get("compliance") == "PASS_FUNCTIONAL_SAFETY_VALIDATED"
    print(f"[+] /api/safety/functional-safety/pl: OK (Cat: {pl_data.get('architecture_category')}, Achieved PL: {pl_data.get('achieved_performance_level')}, SIL Claim: {pl_data.get('equivalent_sil_claim_limit')}, PFHd: {pl_data.get('probability_dangerous_failure_per_hr')})")

    # 22. API 520 / EEMUA 158 Acoustical Induced Vibration (AIV) Endpoint
    res_aiv = client.post("/api/safety/flare/aiv", json={
        "relief_valve_tag": "PSV-101",
        "tailpipe_nps_in": 10.0,
        "tailpipe_sch": "Sch 40",
        "relieving_mass_flow_kg_s": 24.5,
        "relieving_temp_c": 160.0
    })
    assert res_aiv.status_code == 200
    aiv_data = res_aiv.json()
    assert aiv_data.get("relief_valve_tag") == "PSV-101"
    assert aiv_data.get("mach_compliance") == "PASS"
    print(f"[+] /api/safety/flare/aiv: OK (Tag: {aiv_data.get('relief_valve_tag')}, NPS: {aiv_data.get('tailpipe_nps_in')}\", Mach: {aiv_data.get('tailpipe_mach_number')}, Lw: {aiv_data.get('sound_power_level_db')} dB, Risk: {aiv_data.get('aiv_risk_tier')})")

    # 23. API 670 Machinery Protection Systems & Proximity Probes Endpoint
    res_api670 = client.post("/api/machinery/api670/probes", json={
        "machine_tag": "K-101",
        "probe_channel_x": "VT-101X",
        "probe_channel_y": "VT-101Y",
        "gap_voltage_dc_v": -10.2,
        "peak_to_peak_um_x": 22.5,
        "peak_to_peak_um_y": 24.0,
        "operating_speed_rpm": 10450.0
    })
    assert res_api670.status_code == 200
    api670_data = res_api670.json()
    assert api670_data.get("machine_tag") == "K-101"
    assert api670_data.get("probe_health_state") == "NORMAL_LINEAR_RANGE"
    assert api670_data.get("protection_system_verdict") == "NORMAL_ROTATING_STABILITY"
    print(f"[+] /api/machinery/api670/probes: OK (Tag: {api670_data.get('machine_tag')}, Probe Health: {api670_data.get('probe_health_state')}, Gap V: {api670_data.get('dc_gap_voltage_v')}V, Governing Vib: {api670_data.get('governing_vibration_um')} um, Verdict: {api670_data.get('protection_system_verdict')})")

    # 24. API 537 / ISO 25457 Flare Thermal Radiation & Smokeless Steam Endpoint
    res_flare = client.post("/api/flare/api537/radiation-steam", json={
        "flare_tag": "FLARE-101",
        "tip_diameter_m": 1.20,
        "flare_height_m": 55.0,
        "relief_gas_flow_kg_s": 38.0,
        "lower_heating_value_mj_kg": 46.5,
        "gas_molecular_weight": 28.5,
        "wind_speed_m_s": 6.0,
        "distance_from_base_m": 120.0,
        "steam_assist_enabled": True,
        "soot_index_c_to_h_ratio": 0.35
    })
    assert res_flare.status_code == 200
    flare_data = res_flare.json()
    assert flare_data.get("flare_tag") == "FLARE-101"
    assert "flame_length_m" in flare_data
    assert "radiation_at_specified_distance_kw_m2" in flare_data
    assert flare_data.get("compliance") == "PASS"
    print(f"[+] /api/flare/api537/radiation-steam: OK (Tag: {flare_data.get('flare_tag')}, Flame L: {flare_data.get('flame_length_m')}m, Rad: {flare_data.get('radiation_at_specified_distance_kw_m2')} kW/m2, Steam: {flare_data.get('smokeless_steam_demand_kg_s')} kg/s, Status: {flare_data.get('status')})")

    # 25. ASME Section VIII Div 1 Appendix 1-5 Conical Reducer Transition Endpoint
    res_cone = client.post("/api/vessels/asme/conical-reducer", json={
        "tag": "CONE-101",
        "design_pressure_psig": 250.0,
        "design_temp_c": 180.0,
        "large_diameter_in": 72.0,
        "small_diameter_in": 36.0,
        "half_apex_angle_deg": 25.0,
        "corrosion_allowance_in": 0.125,
        "allowable_stress_psi": 20000.0,
        "joint_efficiency": 1.0,
        "actual_thickness_in": 0.750
    })
    assert res_cone.status_code == 200
    cone_data = res_cone.json()
    assert cone_data.get("tag") == "CONE-101"
    assert cone_data.get("half_apex_compliant") is True
    assert cone_data.get("compliance") == "PASS_CODE_COMPLIANT"
    print(f"[+] /api/vessels/asme/conical-reducer: OK (Tag: {cone_data.get('tag')}, Req t: {cone_data.get('minimum_required_thickness_in')}in, Margin: +{cone_data.get('thickness_margin_pct')}%, MAWP: {cone_data.get('calculated_mawp_psig')} psig, Compliance: {cone_data.get('compliance')})")

    # 26. ISO 1940-1 Rotor Dynamic Balancing & Unbalance Limits Endpoint
    res_bal = client.post("/api/machinery/iso1940/balancing", json={
        "rotor_tag": "BAL-ROTOR-101",
        "balance_grade": "G2.5",
        "rotor_mass_kg": 450.0,
        "operating_speed_rpm": 6000.0,
        "balance_planes": 2,
        "plane_1_correction_radius_mm": 140.0,
        "plane_2_correction_radius_mm": 140.0,
        "measured_initial_unbalance_plane1_g_mm": 45.0,
        "measured_initial_unbalance_plane2_g_mm": 48.0
    })
    assert res_bal.status_code == 200
    bal_data = res_bal.json()
    assert bal_data.get("rotor_tag") == "BAL-ROTOR-101"
    assert bal_data.get("status") == "COMPLIANT_WITHIN_G_TOLERANCE"
    print(f"[+] /api/machinery/iso1940/balancing: OK (Tag: {bal_data.get('rotor_tag')}, Grade: {bal_data.get('balance_quality_grade')}, e_per: {bal_data.get('permissible_specific_unbalance_um')} um, Per-Plane Limit: {bal_data.get('per_plane_permissible_unbalance_g_mm')} g*mm, Verdict: {bal_data.get('status')})")

    # 27. NFPA 68:2023 Explosion Deflagration Venting Endpoint
    res_vent = client.post("/api/safety/nfpa68/explosion-venting", json={
        "enclosure_tag": "SILO-VENT-101",
        "enclosure_volume_m3": 48.0,
        "enclosure_length_m": 6.0,
        "enclosure_hydraulic_diameter_m": 3.2,
        "k_st_bar_m_s": 150.0,
        "p_max_bar_g": 8.5,
        "p_stat_bar_g": 0.10,
        "p_red_max_bar_g": 0.40,
        "vent_duct_length_m": 1.5,
        "panel_mass_kg_m2": 5.0
    })
    assert res_vent.status_code == 200
    vent_data = res_vent.json()
    assert vent_data.get("enclosure_tag") == "SILO-VENT-101"
    assert "St 1" in vent_data.get("dust_explosion_class", "")
    assert vent_data.get("compliance") == "PASS_EXPLOSION_VENTING_CERTIFIED"
    print(f"[+] /api/safety/nfpa68/explosion-venting: OK (Tag: {vent_data.get('enclosure_tag')}, Class: {vent_data.get('dust_explosion_class')}, Av: {vent_data.get('required_vent_area_m2')} m2, Recoil: {vent_data.get('explosion_reaction_recoil_force_kn')} kN, Cert: {vent_data.get('compliance')})")

    print("\n" + "=" * 65)
    print("ALL 27 SOVEREIGN REST API ENDPOINTS VERIFIED WITH 100% SUCCESS!")
    print("=" * 65)

if __name__ == "__main__":
    main()
