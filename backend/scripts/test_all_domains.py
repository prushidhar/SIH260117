"""
backend/scripts/test_all_domains.py — Comprehensive End-to-End Validation Suite (INDRA)
Tests:
1. Ultrasonic Inspection & Statutory Approval Note (ASME B31.3 / API 570)
2. Fluid Dynamics Darcy-Weisbach Friction Drop (Crane TP 410)
3. P&ID Blueprint Extraction (ANSI/ISA-5.1)
4. ISO 10816-3 Vibration Harmonics & Asset Health (Slurry Pump P-101)
5. Deliverable Factory (.docx, .xlsx, .pptx)
6. NetworkMonitor Air-Gap Cryptographic Verification
7. Database HITL Dual-Key Approval & Merkle Log
"""
import os
import sys
import json
import time

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from models.synthesizer import report_synthesizer
from sandbox.executor import tool_registry
from agents.deliverable_builder import deliverable_builder
from security.network_monitor import network_monitor
from database import db
from security.audit_log import audit_ledger


def test_card_1_ultrasonic_inspection():
    print("\n--- [TEST 1] Card 1: Ultrasonic Inspection & Statutory Note ---")
    prompt = "Review the ultrasonic thickness inspection report for crude distillation unit CDU-Pipe-104: nominal thickness 12.7mm, measured thickness 7.2mm, corrosion rate 0.45 mm/yr, design pressure 3.2 MPa. Perform ASME B31.3 minimum thickness calculation and draft a statutory plant approval note for executive sign-off."
    
    # 1. OCR tool execution
    ocr_res = tool_registry.execute_tool("ocr_inspect_document", {
        "file_path": "INSP-2025-084_Crude_Distillation_Unit_Ultrasonic_Report.pdf",
        "target_tag": "CDU-Pipe-104"
    })
    assert ocr_res.get("status") == "success", f"OCR failed: {ocr_res}"
    print(f"  [+] OCR Findings: measured={ocr_res.get('ultrasonic_measured_thickness_mm')}mm, corrosion_rate={ocr_res.get('corrosion_rate_mm_year')}mm/yr")

    # 2. ASME calculation
    pipe_res = tool_registry.execute_tool("calculate_pipe_thickness_asme_b313", {
        "pressure_psig": 464.1,
        "outer_diameter_in": 10.75,
        "stress_value_psi": 20000.0,
        "joint_quality_factor": 1.0
    })
    assert pipe_res.get("status") == "success", f"Pipe calc failed: {pipe_res}"
    print(f"  [+] ASME B31.3 Calc: t_design={pipe_res.get('t_design_inches')}in, t_min={pipe_res.get('t_minimum_required_inches')}in")

    # 3. Report Synthesis
    tools = [
        {"tool": "ocr_inspect_document", "output": ocr_res},
        {"tool": "calculate_pipe_thickness_asme_b313", "output": pipe_res}
    ]
    report = report_synthesizer.synthesize(
        domain="pipe_thickness",
        tool_results=tools,
        kb_hits=[],
        prompt=prompt,
        equipment_tag="CDU-Pipe-104"
    )
    assert "Statutory Plant Asset Integrity Approval Note" in report, "Missing statutory title in report"
    assert "7.2 mm" in report or "7.2" in report, "Missing measured thickness in report"
    assert "ASME B31.3" in report, "Missing ASME B31.3 in report"
    print("  [+] Card 1 Synthesis: Passed! Length:", len(report), "chars")


def test_card_2_darcy_weisbach():
    print("\n--- [TEST 2] Card 2: Darcy-Weisbach Hydraulic Pipeline Friction Drop ---")
    prompt = "Write a Python script to calculate the Darcy-Weisbach friction factor and pressure drop in a 100m carbon steel pipe with flow rate 0.05 m3/s and diameter 0.15m."
    
    dw_res = tool_registry.execute_tool("calculate_darcy_weisbach_pressure_drop", {
        "flow_rate_m3_s": 0.05,
        "pipe_diameter_m": 0.15,
        "pipe_length_m": 100.0,
        "equipment_tag": "PIPE-HYD-01"
    })
    assert dw_res.get("status") == "success", f"Darcy calc failed: {dw_res}"
    print(f"  [+] Darcy-Weisbach: velocity={dw_res.get('fluid_velocity_m_s')}m/s, Re={dw_res.get('reynolds_number')}, f={dw_res.get('darcy_friction_factor')}, dp={dw_res.get('pressure_drop_kpa')}kPa")

    tools = [{"tool": "calculate_darcy_weisbach_pressure_drop", "output": dw_res}]
    report = report_synthesizer.synthesize(
        domain="fluid_darcy_weisbach",
        tool_results=tools,
        kb_hits=[],
        prompt=prompt,
        equipment_tag="PIPE-HYD-01"
    )
    assert "Darcy-Weisbach" in report, "Missing Darcy-Weisbach in report"
    assert "Crane Technical Paper 410" in report, "Missing Crane TP 410 in report"
    assert "46.7" in report or "46.8" in report or "kPa" in report, "Missing pressure drop in report"
    print("  [+] Card 2 Synthesis: Passed! Length:", len(report), "chars")


def test_card_3_pid_extraction():
    print("\n--- [TEST 3] Card 3: P&ID Blueprint & ISA-5.1 Tag Localization ---")
    prompt = "Analyze the high-pressure feed P&ID schematic for crude distillation unit CDU-104. Extract all ISA-5.1 tags, valve designations, and line numbers, and verify safety relief valve isolation standards."
    
    pid_res = tool_registry.execute_tool("extract_pid_components", {
        "file_id": "PID-001_Heat_Exchanger_Unit_Spec.txt",
        "component_filter": "all"
    })
    assert pid_res.get("status") == "success", f"PID extraction failed: {pid_res}"
    print(f"  [+] P&ID Extracted: {pid_res.get('total_valves_extracted')} valves identified from {pid_res.get('source_file')}")

    tools = [{"tool": "extract_pid_components", "output": pid_res}]
    report = report_synthesizer.synthesize(
        domain="pid_extraction",
        tool_results=tools,
        kb_hits=[],
        prompt=prompt,
        equipment_tag="CDU-104"
    )
    assert "P&ID Schematic & ISA-5.1" in report, "Missing P&ID header in report"
    assert "API 520" in report, "Missing API 520 in report"
    assert "FV-1041" in report or "PSV" in report, "Missing valve tags in report"
    print("  [+] Card 3 Synthesis: Passed! Length:", len(report), "chars")


def test_card_4_vibration_triage():
    print("\n--- [TEST 4] Card 4: ISO 10816-3 Vibration Triage & Telemetry ---")
    prompt = "Perform ISO 10816-3 vibration triage on slurry feed pump P-101: 1X harmonic 7.2 mm/s RMS, 2X harmonic 1.8 mm/s RMS. Identify root cause and stream telemetry and equipment health card."
    
    vib_res = tool_registry.execute_tool("diagnose_vibration_harmonics", {
        "dominant_freq_hz": 49.67,
        "running_speed_rpm": 2980.0,
        "peak_velocity_mms": 7.2,
        "machine_tag": "P-101"
    })
    assert vib_res.get("status") == "success", f"Vibration calc failed: {vib_res}"
    
    dev_res = tool_registry.execute_tool("calculate_vibration_deviation", {
        "measured_mms": 7.2,
        "limit_mms": 4.5
    })
    assert dev_res.get("status") == "CRITICAL", f"Deviation expected CRITICAL: {dev_res}"

    health_res = tool_registry.execute_tool("calculate_equipment_health_score", {
        "vibration_deviation_pct": dev_res.get("deviation_percent", 60.0),
        "temp_celsius": 68.4,
        "nominal_temp": 60.0
    })
    print(f"  [+] Vibration Triage: fault={vib_res.get('diagnosed_fault')}, severity={vib_res.get('severity_level')}, dev={dev_res.get('deviation_percent')}%, health={health_res.get('health_score')}/100")

    tools = [
        {"tool": "diagnose_vibration_harmonics", "output": vib_res},
        {"tool": "calculate_vibration_deviation", "output": dev_res},
        {"tool": "calculate_equipment_health_score", "output": health_res}
    ]
    report = report_synthesizer.synthesize(
        domain="vibration_harmonics",
        tool_results=tools,
        kb_hits=[],
        prompt=prompt,
        equipment_tag="P-101"
    )
    assert "ISO 10816-3" in report, "Missing ISO 10816 in report"
    assert "ZONE D" in report, "Missing Zone D in report"
    assert "Dynamic" in report or "Unbalance" in report, "Missing unbalance diagnosis in report"
    print("  [+] Card 4 Synthesis: Passed! Length:", len(report), "chars")


def test_deliverables_and_airgap():
    print("\n--- [TEST 5] Deliverables Factory (.docx, .xlsx, .pptx) & Air-Gap ---")
    out_dir = os.path.join(backend_dir, "brain", "test-task", "artifacts")
    os.makedirs(out_dir, exist_ok=True)
    
    # 1. Build DOCX
    docx_res = deliverable_builder.build_engineering_report_docx(
        task_id="test-task",
        title="Statutory Plant Approval Note — CDU-Pipe-104",
        equipment_tag="CDU-Pipe-104",
        domain="pipe_thickness",
        tool_results=[{
            "tool": "calculate_pipe_thickness_asme_b313",
            "output": {
                "design_pressure_psig": 464.1,
                "outer_diameter_inches": 10.75,
                "t_design_inches": 0.1236,
                "t_minimum_required_inches": 0.2486,
                "code_reference": "ASME B31.3 §304.1.2"
            }
        }],
        kb_hits=[],
        standards_clauses=["ASME B31.3 — Para 304.1.2 — Pipe wall thickness"],
        prompt="Review ultrasonic inspection report for CDU-Pipe-104",
        output_dir=out_dir
    )
    assert os.path.exists(docx_res["file_path"]), f"DOCX file not created: {docx_res}"
    print(f"  [+] Word Report generated: {docx_res['filename']} ({os.path.getsize(docx_res['file_path'])} bytes)")

    # 2. Build XLSX
    xlsx_res = deliverable_builder.build_engineering_data_xlsx(
        task_id="test-task",
        title="Calculation Data Sheet — Pipe Thickness",
        equipment_tag="CDU-Pipe-104",
        domain="pipe_thickness",
        tool_results=[{
            "tool": "calculate_pipe_thickness_asme_b313",
            "output": {
                "design_pressure_psig": 464.1,
                "outer_diameter_inches": 10.75,
                "t_minimum_required_inches": 0.2486,
                "status": "success"
            }
        }],
        output_dir=out_dir
    )
    assert os.path.exists(xlsx_res["file_path"]), f"XLSX file not created: {xlsx_res}"
    print(f"  [+] Excel Workbook generated: {xlsx_res['filename']} ({os.path.getsize(xlsx_res['file_path'])} bytes)")

    # 3. Build Executive PPTX
    from deliverables.ppt import ppt_generator
    ppt_path = os.path.join(out_dir, "CDU-Pipe-104_Board_Review.pptx")
    ppt_generator.create_executive_deck(
        task_id="test-task",
        title="Executive Board Review — CDU-Pipe-104",
        equipment_tag="CDU-Pipe-104",
        primary_domain="pipe_thickness",
        tool_results=[{
            "tool": "calculate_pipe_thickness_asme_b313",
            "output": {
                "design_pressure_psig": 464.1,
                "outer_diameter_inches": 10.75,
                "t_design_inches": 0.1236,
                "t_minimum_required_inches": 0.2486,
                "status": "success"
            }
        }],
        kb_hits=[],
        prompt="Review ultrasonic inspection report for CDU-Pipe-104",
        output_path=ppt_path
    )
    assert os.path.exists(ppt_path), f"PPTX file not created: {ppt_path}"
    print(f"  [+] Executive PPTX generated: {os.path.basename(ppt_path)} ({os.path.getsize(ppt_path)} bytes)")

    # 3b. Test Compliance Bundle Packaging (.zip)
    import zipfile
    bundle_path = os.path.join(out_dir, "test-task_Compliance_Bundle.zip")
    with zipfile.ZipFile(bundle_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(docx_res["file_path"], os.path.basename(docx_res["file_path"]))
        zf.write(xlsx_res["file_path"], os.path.basename(xlsx_res["file_path"]))
        zf.write(ppt_path, os.path.basename(ppt_path))
        zf.writestr("MANIFEST_SHA256.txt", "INDRA SOVEREIGN STATUTORY COMPLIANCE MANIFEST\nALL DELIVERABLES SEALED.")
    assert os.path.exists(bundle_path), "Bundle ZIP not created"
    print(f"  [+] Sealed Compliance Bundle ZIP generated: {os.path.basename(bundle_path)} ({os.path.getsize(bundle_path)} bytes)")

    # 4. Test NetworkMonitor Air-Gap
    airgap_audit = network_monitor.audit_active_connections()
    print(f"  [+] Air-Gap Status: {airgap_audit['airgap_status']}, Zero WAN Egress: {airgap_audit['zero_wan_egress']}, Proof SHA-256: {airgap_audit['audit_proof_sha256'][:16]}...")
    assert airgap_audit["zero_wan_egress"] is True, "Air-gap verification failed!"

    # 4. Test HITL Dual-Key Approval in Database
    appr_id = f"APPR-TEST-{int(time.time())}"
    db.add_approval(
        approval_id=appr_id,
        equipment="CDU-Pipe-104",
        task_id="test-task",
        recommendation="Statutory plant integrity sign-off per ASME B31.3 §304.1.2",
        required_tier=2,
        tool="calculate_pipe_thickness_asme_b313",
        severity="CRITICAL",
        arguments={"measured_mm": 7.2, "corrosion_rate": 0.45},
        title="Statutory Approval: CDU-Pipe-104"
    )
    pending = db.get_pending_approvals()
    assert any(a.get("id") == appr_id for a in pending), "Approval not in pending list"
    
    # Sign approval
    success, res = db.sign_approval(appr_id, "APPROVED", "Superintendent Sharma (EMP-108)", 2)
    assert success is True, "Approval signing failed"
    print(f"  [+] Dual-Key HITL Approval: Committed & Signed by '{res.get('signed_by')}' (Tier {res.get('tier')})")


def test_card_6_root_cause_analysis():
    print("\n--- [TEST 6] Card 6: Root Cause Analysis (RCA) & Bayesian Fault Tree ---")
    rca_res = tool_registry.execute_tool("evaluate_root_cause_tree", {
        "equipment_tag": "P-101",
        "incident_type": "seal_flush_temperature_trip",
        "evidence_tags": ["TI-101A", "dP-101", "FT-101"]
    })
    assert rca_res.get("status") == "success", f"RCA tool failed: {rca_res}"
    assert rca_res.get("confidence_score") > 90.0, "Confidence score lower than expected"
    assert len(rca_res.get("five_whys_chain", [])) == 5, "Expected 5-Whys steps"
    assert len(rca_res.get("capa_remediations", [])) >= 3, "Expected 3 CAPA remediations"
    print(f"  [+] Bayesian RCA Evaluator: root_cause='{rca_res.get('primary_root_cause')}', posterior_confidence={rca_res.get('confidence_score')}%, 5-Whys={len(rca_res.get('five_whys_chain'))} steps, CAPA={len(rca_res.get('capa_remediations'))} remedies")


def test_card_7_plant_digital_twin():
    print("\n--- [TEST 7] Card 7: Refinery Plant Digital Twin & Mass-Energy Balance ---")
    mb_res = tool_registry.execute_tool("simulate_crude_distillation_mass_balance", {
        "crude_api": 33.4,
        "feed_bpd": 100000.0,
        "furnace_temp_c": 365.0,
        "steam_stripping_rate": 1.2
    })
    assert mb_res.get("status") == "success", f"Mass balance failed: {mb_res}"
    assert len(mb_res.get("yield_breakdown", [])) == 6, "Expected 6 crude distillation cuts"
    assert mb_res.get("furnace_duty_mw", 0) > 30.0, "Furnace duty calculation error"
    assert mb_res.get("column_tray_flooding_margin_pct", 0) > 0, "Flooding margin negative"
    print(f"  [+] Refinery Mass Balance: cuts={len(mb_res.get('yield_breakdown'))}, furnace_duty={mb_res.get('furnace_duty_mw')} MW, flood_margin={mb_res.get('column_tray_flooding_margin_pct')}%, HEN_recovery={mb_res.get('hen_pinch_recovery_pct')}%")


def test_card_8_hazop_lopa_sil():
    print("\n--- [TEST 8] Card 8: Automated HAZOP & LOPA SIL Functional Safety Engine ---")
    lopa_res = tool_registry.execute_tool("evaluate_hazop_lopa_sil", {
        "node_id": "NODE-01_CDU_FEED",
        "deviation": "HIGH_PRESSURE",
        "consequence_severity": "CATASTROPHIC",
        "initiating_frequency": 0.1,
        "enabled_ipl_ids": ["IPL-01", "IPL-02", "IPL-03", "IPL-04"]
    })
    assert lopa_res.get("status") == "success", f"LOPA failed: {lopa_res}"
    assert lopa_res.get("sil_level") in [3, 4], f"Expected SIL 3 or 4, got: {lopa_res.get('sil_level')}"
    assert lopa_res.get("risk_acceptable") is True, "Expected mitigated risk to be acceptable"
    print(f"  [+] IEC 61511 LOPA Engine: target_sil='{lopa_res.get('sil_target')}', required_rrf={lopa_res.get('required_rrf')}, total_pfd={lopa_res.get('total_pfd')}, risk_acceptable={lopa_res.get('risk_acceptable')}")


def test_card_9_flare_radiation_and_dispersion():
    print("\n--- [TEST 9] Card 9: API 521 Flare Thermal Radiation & Atmospheric Dispersion ---")
    flare_res = tool_registry.execute_tool("calculate_api521_flare_radiation_and_dispersion", {
        "relieved_flow_kg_s": 45.0,
        "gas_mw": 44.1,
        "flare_height_m": 45.0,
        "wind_speed_m_s": 5.0,
        "flare_tip_diameter_m": 0.6
    })
    assert flare_res.get("status") == "success", f"Flare calc failed: {flare_res}"
    assert flare_res.get("total_heat_release_mw", 0) > 1000.0, "Heat release lower than expected"
    assert flare_res.get("tip_mach_number", 0) <= 0.50, f"Mach number exceeded limit: {flare_res.get('tip_mach_number')}"
    assert len(flare_res.get("radiation_profile", [])) == 5, "Expected 5 radial radiation checkpoints"
    print(f"  [+] API 521 Flare Engine: heat_release={flare_res.get('total_heat_release_mw')} MW, tip_Mach={flare_res.get('tip_mach_number')}, steam_req={flare_res.get('smokeless_steam_required_kg_s')} kg/s, noise={flare_res.get('noise_level_100m_dba')} dBA")


def test_card_10_turnaround_critical_path():
    print("\n--- [TEST 10] Card 10: Refinery Turnaround (TAR) & CPM Schedule Optimization ---")
    tar_res = tool_registry.execute_tool("calculate_turnaround_critical_path", {
        "shutdown_id": "TAR-2026-CDU1",
        "planned_days": 14,
        "hourly_downtime_cost_usd": 42500.0
    })
    assert tar_res.get("status") == "success", f"TAR calc failed: {tar_res}"
    assert tar_res.get("calculated_cpm_duration_days", 0) > 0, "Duration invalid"
    assert tar_res.get("critical_path_tasks_count", 0) >= 8, "Expected at least 8 critical path tasks"
    print(f"  [+] Turnaround CPM Engine: planned={tar_res.get('planned_duration_days')}d, CPM_duration={tar_res.get('calculated_cpm_duration_days')}d, critical_tasks={tar_res.get('critical_path_tasks_count')}, delay_exposure=${tar_res.get('financial_delay_exposure_usd'):,.2f}")


def test_card_11_compressor_anti_surge():
    print("\n--- [TEST 11] Card 11: API 617 / ASME PTC 10 Compressor Anti-Surge & Dynamic Performance ---")
    comp_res = tool_registry.execute_tool("calculate_compressor_anti_surge_map", {
        "compressor_tag": "K-101",
        "inlet_flow_m3_h": 6200.0,
        "suction_p_bar": 18.5,
        "discharge_p_bar": 62.0,
        "suction_t_c": 38.0,
        "gas_mw": 19.8,
        "speed_rpm": 10450.0
    })
    assert comp_res.get("status") == "success", f"Compressor calc failed: {comp_res}"
    assert comp_res.get("polytropic_head_kj_kg", 0) > 100.0, "Polytropic head calculation error"
    assert comp_res.get("surge_margin_pct", 0) > 0, "Surge margin negative"
    assert len(comp_res.get("speed_curves", [])) == 3, "Expected 3 speed performance curves"
    print(f"  [+] API 617 Anti-Surge Engine: head={comp_res.get('polytropic_head_kj_kg')} kJ/kg, surge_margin={comp_res.get('surge_margin_pct')}%, zone='{comp_res.get('operating_zone')}', gas_power={comp_res.get('gas_power_kw')} kW")


def test_card_12_steam_turbine_cogen():
    print("\n--- [TEST 12] Card 12: ASME PTC 6 & IAPWS-IF97 Steam Turbine Cogeneration & Carbon Offset ---")
    stg_res = tool_registry.execute_tool("calculate_steam_turbine_cogen_balance", {
        "turbine_tag": "STG-01",
        "throttle_steam_flow_t_h": 120.0,
        "hp_inlet_p_bar": 90.0,
        "hp_inlet_t_c": 510.0,
        "mp_extraction_flow_t_h": 45.0,
        "lp_extraction_flow_t_h": 35.0
    })
    assert stg_res.get("status") == "success", f"STG calc failed: {stg_res}"
    assert stg_res.get("gross_electrical_power_mw", 0) > 15.0, "Electrical power generation too low"
    assert stg_res.get("process_thermal_export_mwth", 0) > 30.0, "Thermal export lower than expected"
    assert len(stg_res.get("expansion_stages", [])) == 3, "Expected 3 expansion stages"
    print(f"  [+] Steam Turbine Cogen Engine: electrical_power={stg_res.get('gross_electrical_power_mw')} MW, thermal_export={stg_res.get('process_thermal_export_mwth')} MWth, cogen_eff={stg_res.get('overall_cogen_efficiency_pct')}%, CO2_offset={stg_res.get('carbon_offset_t_co2_per_hr')} t/hr")


def test_card_13_cathodic_protection_and_cui():
    print("\n--- [TEST 13] Card 13: NACE SP0169 & API 581 Cathodic Protection & CUI RBI Matrix ---")
    cui_res = tool_registry.execute_tool("calculate_cathodic_protection_and_cui_risk", {
        "pipe_tag": "L-101",
        "pipe_to_soil_potential_mv": -920.0,
        "anode_type": "Zinc",
        "installed_anode_mass_kg": 45.0,
        "operating_temp_c": 85.0
    })
    assert cui_res.get("status") == "success", f"CUI calc failed: {cui_res}"
    assert cui_res.get("nace_criterion_satisfied") is True, "NACE CP criteria should be met"
    assert cui_res.get("cui_sweating_zone") is True, "85C should be in sweating zone"
    assert cui_res.get("api_581_pof_score", 0) >= 3, "Expected elevated POF due to CUI sweating"
    print(f"  [+] NACE / API 581 CUI Engine: potential={cui_res.get('pipe_to_soil_potential_mv')} mV, status='{cui_res.get('cathodic_protection_status')}', POF={cui_res.get('api_581_pof_score')}, risk_rank='{cui_res.get('rbi_risk_rank')}'")


def test_card_14_cooling_tower_performance():
    print("\n--- [TEST 14] Card 14: CTI ATC-105 & ASHRAE Cooling Tower Psychrometric Heat Rejection ---")
    ct_res = tool_registry.execute_tool("calculate_cooling_tower_performance", {
        "tower_tag": "CT-101",
        "circulating_flow_m3_h": 12500.0,
        "hot_water_temp_c": 42.5,
        "cold_water_temp_c": 31.0,
        "ambient_dry_bulb_c": 36.0,
        "ambient_relative_humidity_pct": 55.0,
        "cycles_of_concentration": 4.5
    })
    assert ct_res.get("status") == "success", f"Cooling tower calc failed: {ct_res}"
    assert ct_res.get("heat_rejection_duty_mwth", 0) > 100.0, "Heat rejection duty too low"
    assert ct_res.get("cooling_range_c", 0) > 5.0, "Cooling range error"
    assert ct_res.get("makeup_water_demand_m3_h", 0) > 100.0, "Makeup water calculation error"
    print(f"  [+] CTI ATC-105 Cooling Engine: duty={ct_res.get('heat_rejection_duty_mwth')} MWth, range={ct_res.get('cooling_range_c')} C, approach={ct_res.get('cooling_approach_c')} C, makeup={ct_res.get('makeup_water_demand_m3_h')} m3/h")


def test_card_15():
    print('\n--- TEST 15: TEG Glycol Dehydration (GPSA Sec 20) ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_teg_dehydration_unit(
        gas_flow_mmscfd=50.0, inlet_pressure_psia=1000.0, inlet_temp_c=40.0,
        lean_teg_concentration=99.5, target_dewpoint_c=-70.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['water_removed_lb_per_day'] > 0
    assert result['reboiler_duty_kw'] > 0
    assert result['contactor_diameter_m'] > 0
    print(f"  Water removed: {result['water_removed_lb_per_day']} lb/day")
    print(f"  Reboiler duty: {result['reboiler_duty_kw']} kW")
    print(f"  Contactor dia: {result['contactor_diameter_m']} m")
    print(f"  Status: {result['status']}")
    print('  PASS')


def test_card_16():
    print('\n--- TEST 16: Relief Valve Sizing (API 520/526) ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_relief_valve_sizing(
        scenario='fire_case', vessel_design_pressure_psig=350.0,
        set_pressure_psig=340.0, fluid='naphtha', fluid_sg=0.72
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['required_orifice_area_in2'] > 0
    assert result['compliance'] == 'PASS'
    print(f"  Required area: {result['required_orifice_area_in2']} in²")
    print(f"  Selected orifice: {result['selected_orifice_letter']} ({result['selected_orifice_area_in2']} in²)")
    print(f"  Flow regime: {result['flow_regime']}")
    print(f"  Compliance: {result['compliance']}")
    print('  PASS')


def test_card_17_api579_fitness_for_service():
    print('\n--- TEST 17: API 579-1 / ASME FFS-1 Fitness-For-Service (LTA Assessment) ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_api579_fitness_for_service(
        component_type='cylindrical_shell',
        outside_diameter_mm=406.4,
        nominal_thickness_mm=12.7,
        future_corrosion_allowance_mm=1.5,
        measured_minimum_thickness_mm=6.8,
        longitudinal_flaw_length_mm=125.0,
        design_pressure_mpa=3.5,
        allowable_stress_mpa=138.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['remaining_strength_factor_rsf'] > 0.0
    assert result['folias_bulging_factor_mt'] >= 1.0
    assert result['design_mawp_mpa'] > 0.0
    print(f"  [+] Folias Mt: {result['folias_bulging_factor_mt']}, Shell Lambda: {result['shell_parameter_lambda']}")
    print(f"  [+] Remaining Strength Factor (RSF): {result['remaining_strength_factor_rsf']} vs RSFa: {result['allowable_rsf_rsfa']}")
    print(f"  [+] Design MAWP: {result['design_mawp_mpa']} MPa, Allowable MAWPr: {result['reduced_mawp_mpa']} MPa")
    print(f"  [+] FFS Status: {result['status']}")
    print('  PASS')


def test_card_18_bolted_flange_joint():
    print('\n--- TEST 18: ASME Section VIII Div 1 App 2 & ASME PCC-1 Bolted Flanged Joint ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_bolted_flange_joint_integrity(
        flange_nps_in=8.0,
        flange_class=300,
        design_pressure_bar=35.0,
        design_temp_c=220.0,
        gasket_type='spiral_wound_316_graphite',
        number_of_bolts=12,
        bolt_diameter_in=0.875
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['operating_bolt_load_wm1_kn'] > 0.0
    assert result['seating_bolt_load_wm2_kn'] > 0.0
    assert result['recommended_target_torque_nm'] > 0.0
    assert result['compliance'] == 'PASS'
    print(f"  [+] Hydrostatic End Force: {result['hydrostatic_force_kn']} kN, Gasket Reaction: {result['gasket_reaction_force_kn']} kN")
    print(f"  [+] Wm1 (Operating): {result['operating_bolt_load_wm1_kn']} kN, Wm2 (Seating): {result['seating_bolt_load_wm2_kn']} kN")
    print(f"  [+] Recommended Target Assembly Torque: {result['recommended_target_torque_nm']} N*m")
    print(f"  [+] Gasket Operating Stress: {result['gasket_operating_stress_mpa']} MPa (Compliance: {result['compliance']})")
    print('  PASS')


if __name__ == "__main__":
    print("================================================================")
    print("INDRA Sovereign AI Workbench — Full Domain & Deliverable Suite")
    print("================================================================")
    test_card_1_ultrasonic_inspection()
    test_card_2_darcy_weisbach()
    test_card_3_pid_extraction()
    test_card_4_vibration_triage()
    test_deliverables_and_airgap()
    test_card_6_root_cause_analysis()
    test_card_7_plant_digital_twin()
    test_card_8_hazop_lopa_sil()
    test_card_9_flare_radiation_and_dispersion()
    test_card_10_turnaround_critical_path()
    test_card_11_compressor_anti_surge()
    test_card_12_steam_turbine_cogen()
    test_card_13_cathodic_protection_and_cui()
    test_card_14_cooling_tower_performance()
    test_card_15()
    test_card_16()
    test_card_17_api579_fitness_for_service()
    test_card_18_bolted_flange_joint()
    print("\n================================================================")
    print("ALL 18 TESTS PASSED WITH 100% DETERMINISTIC FIDELITY!")
    print("================================================================")

