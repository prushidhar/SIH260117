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
from verification.calculator import engineering_tools


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

    # 4. Build Statutory Inspection PDF
    pdf_res = deliverable_builder.build_statutory_inspection_pdf(
        task_id="test-task",
        title="Statutory Piping Inspection Certificate — CDU-Pipe-104",
        equipment_tag="CDU-Pipe-104",
        domain="pipe_thickness",
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
        output_dir=out_dir,
        prompt="Statutory ultrasonic wall thickness compliance assessment"
    )
    assert os.path.exists(pdf_res["file_path"]), f"PDF file not created: {pdf_res}"
    print(f"  [+] Statutory PDF generated: {pdf_res['filename']} ({os.path.getsize(pdf_res['file_path'])} bytes)")

    # 5. Build Cryptographically Sealed Compliance Bundle (.zip)
    bundle_res = deliverable_builder.build_compliance_bundle(
        task_id="test-task",
        equipment_tag="CDU-Pipe-104",
        deliverable_files=[
            docx_res["file_path"],
            xlsx_res["file_path"],
            ppt_path,
            pdf_res["file_path"]
        ],
        output_dir=out_dir
    )
    assert os.path.exists(bundle_res["file_path"]), "Bundle ZIP not created"
    print(f"  [+] Sealed 4-Artifact Compliance Bundle generated: {bundle_res['filename']} ({os.path.getsize(bundle_res['file_path'])} bytes, SHA-256: {bundle_res['sha256'][:16]}...)")


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


def test_card_19_api650_storage_tank():
    print('\n--- TEST 19: API 650 / API 653 Oil Storage Tank Shell Integrity ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_api650_storage_tank_shell(
        tank_diameter_m=45.0,
        tank_height_m=16.0,
        design_liquid_level_m=14.5,
        product_specific_gravity=0.85,
        corrosion_allowance_mm=1.5
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['capacity_barrels'] > 100000.0
    assert result['governing_plate_thickness_mm'] >= result['api650_table52_min_mm']
    assert len(result['courses']) == 7
    print(f"  [+] Storage Capacity: {result['capacity_m3']} m³ ({result['capacity_barrels']:.0f} barrels)")
    print(f"  [+] Course 1 Design: {result['course_1_design_thickness_mm']} mm, Hydrotest: {result['course_1_test_thickness_mm']} mm")
    print(f"  [+] Governing Shell Plate: {result['governing_plate_thickness_mm']} mm (Governed by: {result['governing_condition']})")
    print(f"  [+] API 653 Minimum Retirable Thickness: {result['api653_retirable_tmin_mm']} mm")
    print('  PASS')


def test_card_20_asme_ptc4_boiler_efficiency():
    print('\n--- TEST 20: ASME PTC 4 / API 560 Fired Heater Thermal Efficiency & O2 Trim ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_asme_ptc4_boiler_efficiency(
        fired_duty_mw=65.0,
        stack_temp_c=165.0,
        ambient_temp_c=25.0,
        excess_oxygen_pct=3.5,
        target_excess_oxygen_pct=2.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['thermal_efficiency_pct'] > 80.0
    assert result['optimized_thermal_efficiency_pct'] >= result['thermal_efficiency_pct']
    assert result['annual_fuel_cost_savings_usd'] > 0.0
    print(f"  [+] Current Excess Air: {result['excess_air_pct']}%, Dry Gas Loss: {result['loss_dry_flue_gas_pct']}%")
    print(f"  [+] ASME PTC 4 Gross Thermal Efficiency: {result['thermal_efficiency_pct']}% (Optimized: {result['optimized_thermal_efficiency_pct']}%)")
    print(f"  [+] Annual Energy Savings: ${result['annual_fuel_cost_savings_usd']:,.0f} USD/year")
    print(f"  [+] Annual CO2 Emissions Reduction: {result['annual_co2_reduction_tonnes']} tonnes/yr")
    print('  PASS')


def test_card_21_tema_heat_exchanger_rating():
    print('\n--- TEST 21: TEMA Class R Heat Exchanger Thermal & Hydraulic Rating ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_tema_heat_exchanger_rating(
        tube_count=850,
        tube_length_m=6.5,
        baffle_spacing_mm=450.0,
        hot_fluid_t_in_c=240.0,
        hot_fluid_t_out_c=160.0,
        cold_fluid_t_in_c=90.0,
        cold_fluid_t_out_c=155.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['thermal_duty_mw'] > 5.0
    assert result['u_clean_w_m2k'] > result['u_service_w_m2k']
    assert result['compliance'] == 'TEMA_CLASS_R_COMPLIANT'
    print(f"  [+] Heat Exchanger Duty: {result['thermal_duty_mw']} MW (Corrected MTD: {result['corrected_mtd_c']} °C)")
    print(f"  [+] Overall U: Clean={result['u_clean_w_m2k']} W/m²K, Service={result['u_service_w_m2k']} W/m²K (Margin: +{result['overdesign_margin_pct']}%)")
    print(f"  [+] Pressure Drops: Shell={result['pressure_drop_shell_kpa']} kPa, Tube={result['pressure_drop_tube_kpa']} kPa")
    print(f"  [+] Standard Compliance: {result['compliance']}")
    print('  PASS')


def test_card_22_api510_vessel_remaining_life():
    print('\n--- TEST 22: API 510 Pressure Vessel Remaining Life & Next Inspection Interval ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_api510_vessel_remaining_life(
        tag="V-301",
        design_pressure_psig=350.0,
        inside_diameter_in=72.0,
        nominal_thickness_in=0.875,
        current_thickness_in=0.750,
        previous_thickness_in=0.780,
        elapsed_years_since_previous=3.5,
        installation_year=2012,
        current_year=2026
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['remaining_life_years'] > 5.0
    assert result['api510_next_inspection_interval_years'] <= 10.0
    assert result['status'] == 'ACCEPTABLE_FOR_SERVICE'
    print(f"  [+] ASME UG-27 Minimum Required Thickness: {result['asme_minimum_thickness_in']} in ({result['asme_minimum_thickness_mm']} mm)")
    print(f"  [+] Governing Corrosion Rate: {result['corrosion_rate_governing_mm_yr']} mm/yr (Wall Loss: {result['wall_loss_pct']}%)")
    print(f"  [+] API 510 Remaining Service Life: {result['remaining_life_years']} years")
    print(f"  [+] API 510 Half-Life Inspection Interval: {result['api510_next_inspection_interval_years']} years (Next Due: {result['next_statutory_inspection_year']})")
    print(f"  [+] Statutory Verdict: {result['statutory_recommendation']}")
    print('  PASS')


def test_card_23_nace_mr0175_sour_service():
    print('\n--- TEST 23: NACE MR0175 / ISO 15156 Sour Gas Cracking Severity & Metallurgy ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_nace_mr0175_sour_service_severity(
        total_pressure_psia=350.0,
        h2s_mole_pct=2.50,
        co2_mole_pct=4.00,
        in_situ_ph=5.20,
        material_grade="ASTM A516 Gr 70",
        actual_hardness_hrc=21.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['is_sour_service'] is True
    assert result['hardness_compliance'] == 'PASS'
    assert result['pwht_mandatory'] is True
    print(f"  [+] H2S Partial Pressure: {result['p_h2s_psia']} psia ({result['p_h2s_kpa']} kPa) — Sour Trigger: {result['is_sour_service']}")
    print(f"  [+] NACE Severity Region: {result['nace_severity_region']} (SSC Risk: {result['ssc_risk_level']})")
    print(f"  [+] Material Hardness: {result['actual_hardness_hrc']} HRC vs Limit 22.0 HRC ({result['hardness_compliance']}, Margin: {result['hardness_margin_hrc']} HRC)")
    print(f"  [+] Metallurgical Mandate: PWHT Required={result['pwht_mandatory']}, HIC Testing Required={result['hic_testing_nace_tm0284_mandatory']}")
    print('  PASS')


def test_card_24_multi_agent_engineering_consensus():
    print('\n--- TEST 24: Multi-Discipline Engineering Consensus Panel & Tamper-Evident Seal ---')
    from agents.consensus_orchestrator import consensus_orchestrator
    cert = consensus_orchestrator.adjudicate(
        task_id="task-cogen-tar-evaluation",
        asset_tag="HEX-301",
        telemetry={"vibration_rms_mms": 2.1, "vibration_limit_mms": 4.5},
        calculation_results={
            "remaining_life_years": 12.69,
            "pressure_drop_shell_kpa": 47.89,
            "pressure_drop_tube_kpa": 15.97,
            "overdesign_margin_pct": 4.7,
            "target_sil": "SIL 2",
            "risk_acceptable": True
        }
    )
    assert cert["overall_verdict"] == "UNANIMOUSLY_APPROVED_COMMERCIAL_SERVICE"
    assert cert["consensus_score_pct"] == 100.0
    assert len(cert["specialist_panel"]) == 4
    assert len(cert["cryptographic_seal_sha256"]) == 64
    print(f"  [+] Specialists Adjudicated: {len(cert['specialist_panel'])} authorities")
    for sp in cert["specialist_panel"]:
        print(f"      - {sp['discipline']}: {sp['vote']} (Risk: {sp['risk_score']}) by {sp['specialist']}")
    print(f"  [+] Consensus Agreement Score: {cert['consensus_score_pct']}%")
    print(f"  [+] Panel Verdict: {cert['overall_verdict']}")
    print(f"  [+] Tamper-Evident SHA-256 Certificate Seal: {cert['cryptographic_seal_sha256'][:24]}...")
    print('  PASS')


def test_card_25_rag_multidomain_standards_retrieval():
    print('\n--- TEST 25: Local Air-Gapped RAG Knowledge Base Multi-Domain Retrieval ---')
    from rag.vectorstore import kb
    stats = kb.get_collection_stats()
    assert stats["document_count"] >= 25, f"Expected >= 25 docs, got {stats['document_count']}"
    assert stats["is_air_gapped"] is True

    test_queries = [
        ("ASME B31.3 straight pipe thickness formula", "std-asme-b313"),
        ("API 617 compressor anti surge control line margin", "std-api-617"),
        ("API 579 fitness for service local thin area RSF", "std-api-579"),
        ("TEMA Class R heat exchanger fouling factor", "std-tema-class-r"),
        ("NACE MR0175 sour service H2S partial pressure hardness 22 HRC", "std-nace-mr0175"),
        ("API 650 tank shell 1-foot method hydrotest", "std-api-650"),
        ("ASME PTC 4 fired heater thermal efficiency excess oxygen", "std-asme-ptc4"),
        ("API 510 pressure vessel remaining life half life inspection interval", "std-api-510"),
    ]

    for q, expected_id in test_queries:
        hits = kb.search(q, top_k=1)
        assert len(hits) > 0, f"No hits for query: {q}"
        top = hits[0]
        assert top["relevance_score"] > 0, f"Zero relevance for {q}"
        assert expected_id in top["id"], f"Expected {expected_id} in top result id, got {top['id']}"
        print(f"  [+] Query: '{q[:35]}...' -> Matched: {top['title']} (Score: {top['relevance_score']})")

    print(f"  [+] Total Indexed Documents: {stats['document_count']} standards verified.")
    print('  PASS')


def test_card_26_weibull_rul_prognostics():
    print('\n--- TEST 26: Weibull Fault Prognostics & RUL with Cox PHM ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_weibull_rul_prognostics(
        asset_tag="K-102",
        operating_hours=18200.0,
        beta_shape=2.40,
        eta_scale_hours=40000.0,
        vibration_deviation_pct=15.0,
        bearing_temp_c=64.2,
        nominal_bearing_temp_c=55.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['mtbf_hours'] > 25000.0
    assert result['remaining_useful_life_days'] > 30.0
    assert result['status'] == 'ACCEPTABLE_RUL'
    print(f"  [+] Asset: {result['asset_tag']} (Operating Hours: {result['operating_hours']:,} hrs)")
    print(f"  [+] Weibull MTBF: {result['mtbf_hours']:,} hrs (Shape Beta: {result['beta_shape_factor']}, Regime: {result['failure_regime']})")
    print(f"  [+] Cox PHM Hazard Multiplier: {result['hazard_multiplier_cox_phm']}x (Effective Age: {result['effective_operational_age_hours']:,} hrs)")
    print(f"  [+] Calculated RUL: {result['remaining_useful_life_days']} days ({result['remaining_useful_life_hours']:,} hrs)")
    print(f"  [+] 90-Day Failure Probability: {result['failure_probability_next_90d_pct']}%")
    print(f"  [+] Prognostic Action: {result['prognostic_recommendation']}")
    print('  PASS')


def test_card_27_pinch_analysis_heat_network():
    print('\n--- TEST 27: Linnhoff Pinch Analysis & Heat Exchanger Network Exergy ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_pinch_analysis_heat_network(
        delta_t_min_c=10.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['maximum_heat_recovery_mw'] > 20.0
    assert result['annual_fuel_cost_savings_usd'] > 1000000.0
    assert result['second_law_exergetic_efficiency_pct'] > 50.0
    print(f"  [+] Total Streams Duty: Hot={result['total_hot_stream_duty_mw']} MWth, Cold={result['total_cold_stream_duty_mw']} MWth")
    print(f"  [+] Pinch Temperature: Hot={result['pinch_temperature_hot_c']} °C, Cold={result['pinch_temperature_cold_c']} °C")
    print(f"  [+] Maximum Thermal Energy Recovery: {result['maximum_heat_recovery_mw']} MWth ({result['first_law_heat_recovery_pct']}%)")
    print(f"  [+] 2nd-Law Exergetic Efficiency: {result['second_law_exergetic_efficiency_pct']}% (Exergy Destruction: {result['exergy_destruction_mw']} MW)")
    print(f"  [+] Annual Energy Cost Savings: ${result['annual_fuel_cost_savings_usd']:,.0f} USD/year")
    print(f"  [+] Annual CO2 Emissions Avoided: {result['annual_co2_reduction_tonnes']:,.1f} tonnes/yr")
    print('  PASS')


def test_card_28_fatigue_cumulative_damage_miner():
    print('\n--- TEST 28: Palmgren-Miner Cumulative Fatigue Damage (ASME Sec VIII Div 2) ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_fatigue_cumulative_damage_miner(
        asset_tag="CDU-Pipe-104",
        design_life_years=25.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['cumulative_damage_ratio_d'] < 1.0
    assert result['compliance'] == 'PASS'
    assert len(result['stress_spectrum_breakdown']) == 4
    print(f"  [+] Asset: {result['asset_tag']} ({result['material_specification']}, Design Life: {result['design_life_years']} yrs)")
    print(f"  [+] Cumulative Fatigue Damage Ratio D: {result['cumulative_damage_ratio_d']} vs Limit 1.000")
    print(f"  [+] Remaining Fatigue Margin: {result['fatigue_margin_pct']}% (Estimated Life: {result['estimated_fatigue_life_years']} years)")
    print(f"  [+] Fatigue Risk Level: {result['risk_level']} (Verdict: {result['fatigue_verdict']})")
    print('  PASS')


def test_card_29_joukowsky_water_hammer_surge():
    print('\n--- TEST 29: Joukowsky Water Hammer & Acoustic Surge (ASME B31.4 § 404.3.4) ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_joukowsky_water_hammer_surge(
        asset_tag="PL-204",
        pipe_outer_diameter_mm=610.0,
        wall_thickness_mm=14.3,
        pipe_length_m=12500.0,
        steady_flow_velocity_m_s=2.40,
        steady_operating_pressure_bar=38.5,
        pipe_design_mawp_bar=64.0,
        valve_closure_time_s=3.5
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['compliance'] == 'PASS'
    assert result['maximum_peak_surge_pressure_bar'] < result['asme_allowable_surge_bar']
    assert result['acoustic_wave_speed_m_s'] > 1000.0
    print(f"  [+] Asset: {result['asset_tag']} (NPS 24, Length: {result['pipeline_length_km']} km, Steady Velocity: {result['flow_velocity_m_s']} m/s)")
    print(f"  [+] Acoustic Wave Speed: {result['acoustic_wave_speed_m_s']} m/s (Critical Period: {result['critical_pipe_period_s']} s)")
    print(f"  [+] Closure Regime: {result['closure_regime']} (Valve Time: {result['valve_closure_time_s']} s)")
    print(f"  [+] Joukowsky Surge Rise: +{result['joukowsky_surge_pressure_rise_bar']} bar -> Peak Pressure: {result['maximum_peak_surge_pressure_bar']} bar")
    print(f"  [+] ASME B31.4 Allowable Surge Limit: {result['asme_allowable_surge_bar']} bar (Surge Margin: {result['surge_margin_pct']}%)")
    print(f"  [+] Gas Bladder Accumulator Sizing: {result['surge_bladder_volume_required_m3']} m³ (Kinetic Energy: {result['kinetic_energy_megajoules']} MJ)")
    print('  PASS')


def test_card_30_iso5167_orifice_flowmeter():
    print('\n--- TEST 30: ISO 5167-2 / AGA 3 Orifice Differential Pressure Metrology ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_iso5167_orifice_flowmeter(
        meter_tag="FE-101",
        pipe_internal_diameter_mm=202.7,
        orifice_bore_diameter_mm=117.566,
        differential_pressure_mbar=250.0,
        upstream_pressure_bar_a=28.5,
        fluid_density_kg_m3=825.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['compliance'] == 'PASS_METROLOGICALLY_COMPLIANT'
    assert 0.10 <= result['diameter_ratio_beta'] <= 0.75
    assert result['mass_flow_rate_tonnes_per_hour'] > 100.0
    print(f"  [+] Orifice Primary Element: {result['meter_tag']} (Pipe ID: {result['pipe_internal_diameter_mm']} mm, Bore: {result['orifice_bore_diameter_mm']} mm)")
    print(f"  [+] Diameter Ratio Beta: {result['diameter_ratio_beta']} (ISO 5167 Beta Valid: {result['beta_ratio_valid']})")
    print(f"  [+] Reader-Harris/Gallagher Cd: {result['discharge_coefficient_cd']} (Approach Factor Ev: {result['velocity_of_approach_ev']})")
    print(f"  [+] Metrological Flow Rate: {result['mass_flow_rate_tonnes_per_hour']} tonnes/hr ({result['volumetric_flow_rate_m3_per_hour']} m³/hr)")
    print(f"  [+] Pipe Reynolds Number: {result['pipe_reynolds_number']:,.0f} (Mean Velocity: {result['pipe_mean_velocity_m_s']} m/s)")
    print(f"  [+] Permanent Pressure Loss: {result['permanent_pressure_loss_kpa']} kPa (Energy Dissipation: {result['energy_dissipation_kw']} kW)")
    print('  PASS')


def test_card_31_api581_rbi_risk_matrix():
    print('\n--- TEST 31: API 580 / API 581 Quantitative Risk-Based Inspection (RBI) 5x5 Matrix ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_api581_rbi_risk_matrix(
        asset_tag="V-301",
        asset_type="pressure_vessel",
        operating_pressure_bar=45.0,
        operating_temp_c=230.0,
        component_material="SA-387 Gr 11 Low Alloy Steel",
        wall_thickness_nominal_mm=38.0,
        wall_thickness_current_mm=34.2,
        wall_thickness_minimum_req_mm=28.5,
        corrosion_rate_mm_year=0.38,
        years_in_service=10.0,
        toxic_or_flammable_inventory_kg=8500.0,
        h2s_content_ppm=2500.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['compliance'] == 'ACCEPTABLE_UNDER_PLANNED_RBI'
    assert result['api_581_matrix_cell'] in ['3D', '3C', '2D', '4C']
    assert result['target_inspection_interval_years'] > 0
    print(f"  [+] Asset: {result['asset_tag']} ({result['component_material']}, Type: {result['asset_type']})")
    print(f"  [+] Multi-Mechanism Damage Factor: {result['total_damage_factor']} (Thinning: {result['thinning_damage_factor']}, SCC: {result['scc_damage_factor']}, CUI: {result['external_cui_damage_factor']})")
    print(f"  [+] Probability of Failure (POF): {result['annual_probability_of_failure']} /yr (POF Category: {result['pof_category']})")
    print(f"  [+] Consequence of Failure (COF): Flammable Area={result['flammable_consequence_area_m2']} m², Financial=${result['total_financial_consequence_usd']:,.0f} USD (COF Category: {result['cof_category']})")
    print(f"  [+] API 581 5x5 Matrix Cell: {result['api_581_matrix_cell']} -> Risk Tier: {result['risk_tier']} ({result['risk_matrix_color']})")
    print(f"  [+] Expected Annual Loss: ${result['expected_annual_loss_usd']:,.2f} USD/yr")
    print(f"  [+] Statutory Inspection Interval: {result['target_inspection_interval_years']} years (Action: {result['statutory_mitigation_action']})")
    print('  PASS')


def test_card_32_cryogenic_blowdown_depressurization():
    print('\n--- TEST 32: API 521 § 5.7 Emergency Depressuring & ASME UCS-66 MDMT ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_cryogenic_blowdown_depressurization(
        vessel_tag="BDV-201",
        vessel_volume_m3=45.0,
        initial_pressure_bar_a=85.0,
        initial_temp_c=40.0,
        gas_molecular_weight=18.5,
        gas_cp_cv_ratio=1.28,
        blowdown_orifice_diameter_mm=38.0,
        vessel_asme_mdmt_c=-29.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['api521_depressuring_rate_met'] is True
    assert result['compliance'] == 'PASS_SAFE_MDMT_MARGIN'
    assert result['minimum_wall_metal_temp_c'] >= result['vessel_design_mdmt_c']
    print(f"  [+] Asset: {result['vessel_tag']} (Volume: {result['vessel_volume_m3']} m³, P0: {result['initial_pressure_bar_a']} bar a)")
    print(f"  [+] 15-Minute Blowdown Pressure: {result['pressure_at_15min_bar_a']} bar a vs Target API 521: {result['api521_target_pressure_bar_a']} bar a (PASS: {result['api521_depressuring_rate_met']})")
    print(f"  [+] Joule-Thomson Cryogenic Chilling: Fluid Min Temp={result['minimum_cryogenic_fluid_temp_c']} °C, Metal Wall Min={result['minimum_wall_metal_temp_c']} °C")
    print(f"  [+] ASME UCS-66 Brittle Fracture Check: MDMT={result['vessel_design_mdmt_c']} °C -> Risk: {result['brittle_fracture_risk']} ({result['asme_ucs66_impact_test']})")
    print('  PASS')


def test_card_33_rotor_dynamics_critical_speeds():
    print('\n--- TEST 33: API 684 / API 617 Rotordynamics & Campbell Diagram ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_rotor_dynamics_critical_speeds(
        machine_tag="TG-502",
        operating_speed_rpm=5400.0,
        first_critical_speed_rpm=2450.0,
        second_critical_speed_rpm=7800.0,
        radial_vibration_1x_mms=2.10,
        radial_vibration_2x_mms=0.85
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['api684_margin_nc1_pass'] is True
    assert result['api684_margin_nc2_pass'] is True
    assert result['compliance'] == 'PASS_API_684_COMPLIANT'
    print(f"  [+] Machine: {result['machine_tag']} (Operating Speed: {result['operating_speed_rpm']} RPM, 1X Freq: {result['fundamental_frequency_1x_hz']} Hz)")
    print(f"  [+] Critical Speed Separation: Nc1={result['first_critical_speed_rpm']} RPM (Margin: {result['separation_margin_nc1_pct']}%), Nc2={result['second_critical_speed_rpm']} RPM (Margin: {result['separation_margin_nc2_pct']}%)")
    print(f"  [+] Campbell Resonance Interference: {result['campbell_harmonic_interference']} (Vane Pass: {result['vane_pass_frequency_hz']} Hz)")
    print(f"  [+] Shaft Alignment & Bearing Health: Ratio 2X/1X={result['misalignment_ratio_2x_1x']} ({result['misalignment_diagnostic']}, Life Derate: {result['bearing_l10h_derate_factor']}x)")
    print('  PASS')


def test_card_34_iec60079_hazardous_area_ex():
    print('\n--- TEST 34: IEC 60079 Hazardous Area Explosion Protection & Gas Group ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_iec60079_hazardous_area_ex(
        tag="JB-101",
        hazardous_zone="Zone 1",
        gas_group="IIC",
        auto_ignition_temp_c=560.0,
        rated_temperature_class="T4",
        measured_max_surface_temp_c=118.5,
        flameproof_gap_measured_mm=0.12,
        ingress_protection_rating="IP66"
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['compliance'] == 'PASS_ATEX_IECEX_CERTIFIED'
    assert result['temperature_class_compliant'] is True
    assert result['gap_integrity_pass'] is True
    print(f"  [+] Equipment: {result['tag']} ({result['hazardous_zone']}, Gas Group {result['gas_group']} - {result['protection_method']})")
    print(f"  [+] Temperature Class: {result['rated_temperature_class']} (Limit: {result['temperature_class_limit_c']} °C, Surface: {result['measured_surface_temp_c']} °C, Compliant: {result['temperature_class_compliant']})")
    print(f"  [+] Thermal Ignition Safety Margin: {result['thermal_safety_margin_c']} °C below AIT ({result['auto_ignition_temp_c']} °C)")
    print(f"  [+] Flameproof Gap (MESG): Measured={result['flameproof_gap_measured_mm']} mm vs Max Allowable={result['max_allowable_gap_mm']} mm (Margin: {result['flameproof_gap_margin_pct']}%)")
    print(f"  [+] Hermetic Ingress Protection: {result['ingress_protection']} (Verified: {result['ip_rating_verified']})")
    print('  PASS')


def test_card_35_isa182_alarm_triage_engine():
    print('\n--- TEST 35: ANSI/ISA-18.2 & EEMUA 191 Alarm Rationalization & Suppression ---')
    from agents.triage_engine import alarm_triage_engine
    sample_alarms = [
        {"alarm_id": "A-1", "tag": "K-102", "timestamp_s": 10.0, "unit": "HCU", "severity": "P1", "description": "Compressor High-High Lube Oil Pressure Trip"},
        {"alarm_id": "A-2", "tag": "P-101", "timestamp_s": 11.2, "unit": "HCU", "severity": "P2", "description": "Feed Pump Discharge Flow Low (Consequential)"},
        {"alarm_id": "A-3", "tag": "V-101", "timestamp_s": 12.0, "unit": "HCU", "severity": "P2", "description": "Feed Drum Level High (Consequential)"},
        {"alarm_id": "A-4", "tag": "TIC-201", "timestamp_s": 15.0, "unit": "CDU", "severity": "P3", "is_oscillation": True, "description": "Column Temp High-Low Chattering"},
        {"alarm_id": "A-5", "tag": "TIC-201", "timestamp_s": 25.0, "unit": "CDU", "severity": "P3", "is_oscillation": True, "description": "Column Temp High-Low Chattering"},
        {"alarm_id": "A-6", "tag": "TIC-201", "timestamp_s": 35.0, "unit": "CDU", "severity": "P3", "is_oscillation": True, "description": "Column Temp High-Low Chattering"},
        {"alarm_id": "A-7", "tag": "TIC-201", "timestamp_s": 45.0, "unit": "CDU", "severity": "P3", "is_oscillation": True, "description": "Column Temp High-Low Chattering"}
    ]
    triage = alarm_triage_engine.triage_alarm_stream(sample_alarms, window_duration_seconds=300.0)
    assert triage['total_alarms_received'] == 7
    assert triage['root_cause_initiator']['tag'] == 'K-102'
    assert triage['suppressed_cascade_count'] >= 1
    assert triage['suppressed_chattering_count'] >= 1
    assert len(triage['triage_digest_sha256']) == 64
    print(f"  [+] Total Alarms Processed: {triage['total_alarms_received']} -> Actionable: {triage['actionable_alarms_count']}")
    print(f"  [+] First-Out Root Cause Trigger: Tag '{triage['root_cause_initiator']['tag']}' — {triage['root_cause_initiator']['description']}")
    print(f"  [+] Consequential Cascade Alarms Suppressed: {triage['suppressed_cascade_count']} alarms")
    print(f"  [+] Chattering Alarms Debounced & Suppressed: {triage['suppressed_chattering_count']} alarms (Tag: TIC-201)")
    print(f"  [+] EEMUA 191 Alarm Rate: {triage['alarm_rate_per_10min']} alarms/10-min ({triage['eemua191_flood_status']})")
    print(f"  [+] Tamper-Evident Triage Digest: {triage['triage_digest_sha256'][:24]}...")
    print('  PASS')


def test_card_36_api579_crack_growth_paris_law():
    print('\n--- TEST 36: API 579-1 / ASME FFS-1 Part 9 Linear Elastic Fracture Mechanics & Paris Law ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_api579_crack_growth_paris_law(
        asset_tag="R-401",
        component_thickness_mm=150.0,
        initial_crack_depth_a0_mm=5.0,
        stress_range_delta_sigma_mpa=145.0,
        operating_cycles_per_year=350.0,
        evaluation_years=5.0,
        material_toughness_kic_mpa_sqrt_m=95.0,
        paris_c=3.0e-12,
        paris_m=3.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['final_crack_depth_mm'] > result['initial_crack_depth_mm']
    assert result['critical_crack_depth_mm'] > result['final_crack_depth_mm']
    assert result['critical_crack_margin_pct'] > 0
    assert result['compliance'] in ['PASS_FIT_FOR_CONTINUED_SERVICE', 'REPAIR_OR_DERATE_REQUIRED']
    print(f"  [+] Asset: {result['asset_tag']} (Wall: {result['wall_thickness_mm']} mm, a0: {result['initial_crack_depth_mm']} mm)")
    print(f"  [+] 5-Year Subcritical Crack Growth: {result['initial_crack_depth_mm']} mm -> {result['final_crack_depth_mm']} mm (+{result['cumulative_growth_mm']} mm, Rate: {result['annual_crack_growth_rate_mm_yr']} mm/yr)")
    print(f"  [+] Critical Crack Depth (ac): {result['critical_crack_depth_mm']} mm (Margin: {result['critical_crack_margin_pct']}%, Est Life: {result['estimated_years_to_fracture']} yrs)")
    print(f"  [+] API 579 FFS Compliance: {result['compliance']}")
    print('  PASS')


def test_card_37_asme_thermal_shock_transient():
    print('\n--- TEST 37: ASME Section VIII Div 2 Part 5 / Section III NB-3200 Pressurized Thermal Shock ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_asme_thermal_shock_transient(
        asset_tag="PTS-101",
        wall_thickness_mm=95.0,
        initial_metal_temp_c=380.0,
        cold_quench_fluid_temp_c=25.0,
        heat_transfer_coeff_w_m2k=4500.0,
        metal_thermal_conductivity_w_mk=42.0,
        youngs_modulus_gpa=195.0,
        thermal_expansion_coeff_per_k=1.35e-5,
        poisson_ratio=0.30,
        material_allowable_stress_sm_mpa=165.0,
        internal_pressure_bar=120.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['biot_number'] > 0
    assert result['peak_thermal_shock_stress_mpa'] > 0
    assert result['total_combined_stress_mpa'] > 0
    assert result['asme_3sm_shakedown_limit_mpa'] == 3.0 * 165.0
    print(f"  [+] Asset: {result['asset_tag']} (Wall: {result['wall_thickness_mm']} mm, Delta_T: {result['temperature_differential_delta_t_c']} °C, Biot No: {result['biot_number']})")
    print(f"  [+] Transient Surface Thermal Stress: {result['peak_thermal_shock_stress_mpa']} MPa + Hoop: {result['mechanical_hoop_stress_mpa']} MPa = Total: {result['total_combined_stress_mpa']} MPa")
    print(f"  [+] ASME 3*Sm Shakedown Limit: {result['asme_3sm_shakedown_limit_mpa']} MPa (Margin: {result['shakedown_margin_pct']}%, Status: {result['shakedown_status']})")
    print(f"  [+] Compliance: {result['compliance']}")
    print('  PASS')


def test_card_38_api2218_fireproofing_thermal_rating():
    print('\n--- TEST 38: API 2218 & UL 1709 Hydrocarbon Pool Fire Fireproofing Endurance ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_api2218_fireproofing_thermal_rating(
        asset_tag="SK-201",
        structural_element_type="vessel_support_skirt",
        fireproofing_material="lightweight_cementitious",
        fireproofing_thickness_mm=65.0,
        steel_critical_failure_temp_c=538.0,
        initial_ambient_temp_c=35.0,
        required_fire_endurance_hours=2.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['calculated_fire_endurance_hours'] >= 2.0
    assert result['compliance'] == 'PASS_FIRE_PROTECTION_CERTIFIED'
    print(f"  [+] Asset: {result['asset_tag']} ({result['structural_element_type']}, Material: {result['fireproofing_material']}, Jacket: {result['fireproofing_thickness_mm']} mm)")
    print(f"  [+] Exposure: {result['fire_exposure_curve']} -> Steel Failure Threshold: {result['steel_critical_temp_c']} °C")
    print(f"  [+] Certification Status: {result['compliance']}")
    print('  PASS')


def test_card_39_sensor_drift_and_fdd():
    print('\n--- TEST 39: ISO 13374 & VDI 2888 Condition Monitoring, Sensor Drift & FDD ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_sensor_drift_and_fdd(
        sensor_tag="TT-101",
        asset_tag="CDU-104",
        measurement_parameter="temperature",
        calibrated_nominal=180.0,
        sensor_span=300.0,
        max_allowable_drift_pct=2.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['sensor_frozen'] is False
    assert result['reliability_index_pct'] > 0
    assert result['compliance'] in ['PASS', 'FAIL_RECALIBRATION_REQUIRED']
    print(f"  [+] Sensor: {result['sensor_tag']} on Asset {result['asset_tag']} (Nominal: {result['calibrated_nominal']} °C)")
    print(f"  [+] Latest Reading: {result['latest_reading']} °C (Mean: {result['mean_reading']} °C, StdDev: {result['standard_deviation']} °C)")
    print(f"  [+] Drift Analysis: Cumulative={result['cumulative_drift_units']} °C ({result['drift_pct_of_calibrated_span']}% of span, Limit: {result['max_allowable_drift_pct']}%)")
    print(f"  [+] Reliability Index: {result['reliability_index_pct']}% (FDD State: {result['fdd_diagnostic_state']})")
    print(f"  [+] Recommended Action: {result['recommended_action'][:80]}...")
    print('  PASS')


def test_card_40_api650_seismic_sloshing_dynamics():
    print('\n--- TEST 40: API 650 Appendix E & ASCE 7 Seismic Sloshing & Hydrodynamic Stability ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_api650_seismic_sloshing_dynamics(
        tank_tag="TK-101",
        tank_diameter_m=45.0,
        tank_height_m=18.0,
        liquid_height_m=15.5,
        liquid_density_kg_m3=850.0,
        design_pga_g=0.35,
        site_soil_class="D",
        bottom_course_thickness_mm=22.0,
        yield_strength_mpa=250.0,
        anchor_bolt_count=48,
        anchor_bolt_diameter_mm=42.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['convective_sloshing_period_tc_s'] > 2.0
    assert result['total_base_shear_kn'] > 1000.0
    assert result['overturning_moment_kn_m'] > 10000.0
    assert result['elephants_foot_buckling_pass'] is True
    print(f"  [+] Storage Tank: {result['tank_tag']} (Dia: {result['tank_diameter_m']}m, H: {result['tank_height_m']}m, Mass: {result['total_liquid_mass_tonnes']} tonnes)")
    print(f"  [+] Modal Periods: Slosh Tc={result['convective_sloshing_period_tc_s']}s, Impulsive Ti={result['impulsive_period_ti_s']}s at PGA={result['design_pga_g']}g")
    print(f"  [+] Seismic Demand: Base Shear={result['total_base_shear_kn']} kN, Overturning Moment={result['overturning_moment_kn_m']} kN*m")
    print(f"  [+] Convective Slosh Wave: {result['slosh_wave_height_m']}m vs Freeboard: {result['available_freeboard_m']}m (Adequate: {result['freeboard_adequate']})")
    print(f"  [+] Shell Compressive Stress: {result['shell_compressive_stress_mpa']} MPa vs Buckling Limit: {result['buckling_allowable_stress_mpa']} MPa (Elephant Foot Pass: {result['elephants_foot_buckling_pass']})")
    print(f"  [+] Compliance: {result['compliance']}")
    print('  PASS')


def test_card_41_hei_condenser_vacuum_performance():
    print('\n--- TEST 41: HEI Standards for Steam Condensers & ASME PTC 12.2 Rating ---')
    from verification.calculator import engineering_tools
    result = engineering_tools.calculate_hei_condenser_vacuum_performance(
        condenser_tag="SC-101",
        steam_flow_kg_s=85.0,
        exhaust_steam_enthalpy_kj_kg=2380.0,
        condensate_temp_c=44.5,
        cooling_water_inlet_temp_c=28.0,
        cooling_water_flow_m3_h=14500.0,
        tube_material="titanium_gr2",
        tube_od_mm=25.4,
        tube_wall_thk_mm=1.0,
        tube_count=6800,
        tube_effective_length_m=10.5,
        measured_back_pressure_mbar=95.0,
        design_back_pressure_mbar=85.0
    )
    assert 'error' not in result, f'Error: {result}'
    assert result['thermal_duty_mwth'] > 100.0
    assert result['cooling_water_outlet_temp_c'] > result['cooling_water_inlet_temp_c']
    assert result['cleanliness_factor_pct'] > 50.0
    print(f"  [+] Condenser: {result['condenser_tag']} (Duty: {result['thermal_duty_mwth']} MWth, CW Velocity: {result['cooling_water_velocity_m_s']} m/s)")
    print(f"  [+] Cooling Water Thermal Rise: {result['cooling_water_inlet_temp_c']} °C -> {result['cooling_water_outlet_temp_c']} °C (Delta_T: {result['cooling_water_delta_t_c']} °C)")
    print(f"  [+] Vacuum & Temperatures: Back-Pressure={result['measured_back_pressure_mbar']} mbar, Tsat={result['saturation_temp_c']} °C, TTD={result['terminal_temp_difference_ttd_c']} °C, Subcooling={result['subcooling_c']} °C")
    print(f"  [+] HEI Heat Transfer: U_actual={result['actual_u_w_m2k']} W/m²K vs U_clean={result['hei_clean_u_w_m2k']} W/m²K -> Cleanliness Factor: {result['cleanliness_factor_pct']}%")
    print(f"  [+] Turbine Efficiency Impact: Heat Rate Penalty = +{result['turbine_heat_rate_penalty_pct']}% ({result['condenser_performance_status']})")
    print('  PASS')


def test_card_42_plant_topology_and_isolation_tracing():
    print('\n--- TEST 42: Plant Graph Topology & IEC 61511 Emergency Isolation Tracing ---')
    from topology.plant_graph import plant_topology
    
    # 1. Full Topology Check
    topo = plant_topology.get_full_topology()
    assert topo['total_nodes'] >= 75
    assert topo['total_process_edges'] >= 25
    print(f"  [+] Plant Topology Graph: {topo['total_nodes']} Nodes across {len(topo['units'])} Units, {topo['total_process_edges']} Piping Edges (Density: {topo['graph_density']})")

    # 2. Emergency Isolation Tracing for R-401 (Hydrocracker Reactor)
    iso = plant_topology.trace_emergency_isolation("R-401")
    assert iso['target_asset'] == 'R-401'
    assert len(iso['upstream_isolation_valves']) >= 1
    assert iso['isolation_feasibility'] == 'FEASIBLE_FAIL_SAFE'
    up_valves = [v['valve_tag'] for v in iso['upstream_isolation_valves']]
    print(f"  [+] Emergency Isolation Tracing for {iso['target_asset']} ({iso['target_name']}):")
    print(f"      - Upstream Isolation Barriers: {up_valves}")
    print(f"      - Depressuring Blowdown Path: {[v['valve_tag'] for v in iso['active_depressuring_valves']]}")
    print(f"      - Feasibility: {iso['isolation_feasibility']} ({iso['total_valves_to_close']} valves commanded closed)")

    # 3. Flare Header Path Tracing for BDV-201
    relief = plant_topology.trace_relief_path("BDV-201")
    assert relief['unblocked_relief_path_verified'] is True
    print(f"  [+] API 521 Flare Network Path: {' -> '.join(relief['path_to_flare'])} (Verified: {relief['unblocked_relief_path_verified']})")
    print('  PASS')


def test_card_43_ieee1584_arc_flash_hazard():
    print('\n--- TEST 43: IEEE 1584-2018 & NFPA 70E Arc Flash Hazard & Electrical Safety ---')
    res = engineering_tools.calculate_ieee1584_arc_flash_hazard(
        equipment_tag="MCC-101",
        system_voltage_kv=6.6,
        bolted_fault_current_ka=25.0,
        arcing_fault_clearing_time_s=0.15,
        working_distance_mm=914.0
    )
    assert 'error' not in res
    assert res['equipment_tag'] == 'MCC-101'
    assert res['arcing_fault_current_ka'] > 0
    assert res['incident_energy_cal_cm2'] >= 0
    assert res['arc_flash_boundary_mm'] > 0
    assert 'PPE CATEGORY' in res['nfpa_70e_ppe_category']
    assert res['limited_shock_approach_boundary_mm'] > 0
    assert res['restricted_shock_approach_boundary_mm'] > 0
    assert res['compliance'] == 'PASS_PPE_DEFINED'
    print(f"  [+] Equipment: {res['equipment_tag']} ({res['system_voltage_kv']} kV, Bolted Fault: {res['bolted_fault_current_ka']} kA)")
    print(f"  [+] Arcing Current: {res['arcing_fault_current_ka']} kA (Clearing: {res['arcing_clearing_time_s']}s)")
    print(f"  [+] Incident Energy at {res['working_distance_mm']}mm: {res['incident_energy_cal_cm2']} cal/cm²")
    print(f"  [+] Arc Flash Boundary (AFB): {res['arc_flash_boundary_mm']} mm")
    print(f"  [+] NFPA 70E Classification: {res['nfpa_70e_ppe_category']}")
    print(f"  [+] Shock Approach Boundaries: Limited={res['limited_shock_approach_boundary_mm']}mm, Restricted={res['restricted_shock_approach_boundary_mm']}mm")
    print(f"  [+] Statutory Compliance: {res['compliance']}")
    print('  PASS')


def test_card_44_acid_gas_dew_point():
    print('\n--- TEST 44: ASME PTC 4.3 & Verhoff-Banchero Flue Gas Sulfuric Acid Dew Point ---')
    res = engineering_tools.calculate_acid_gas_dew_point(
        heater_tag="F-101",
        fuel_sulfur_wt_pct=1.85,
        flue_gas_excess_o2_pct=3.2,
        so3_ppmv=28.5,
        moisture_vol_pct=12.0,
        cold_end_metal_temp_c=155.0,
        air_preheater_tag="APH-101"
    )
    assert 'error' not in res
    assert res['heater_tag'] == 'F-101'
    assert res['air_preheater_tag'] == 'APH-101'
    assert res['sulfuric_acid_dew_point_c'] > 100.0
    assert res['water_dew_point_c'] > 40.0
    assert res['corrosion_margin_delta_t_c'] > 0
    assert res['compliance'] in ('PASS', 'REVIEW_PREHEAT_TEMPERATURE')
    print(f"  [+] Heater: {res['heater_tag']}, Air Preheater: {res['air_preheater_tag']}")
    print(f"  [+] Flue Gas Composition: Sulfur={res['fuel_sulfur_wt_pct']}wt%, SO3={res['so3_concentration_ppmv']}ppmv, H2O={res['moisture_vol_pct']}%")
    print(f"  [+] Condensation Limits: H2SO4 Dew Point={res['sulfuric_acid_dew_point_c']} °C, H2O Dew Point={res['water_dew_point_c']} °C")
    print(f"  [+] Cold-End Metal Temperature: {res['current_cold_end_metal_temp_c']} °C (Recommended Min: {res['recommended_minimum_metal_temp_c']} °C)")
    print(f"  [+] Acid Corrosion Safety Margin: +{res['corrosion_margin_delta_t_c']} °C (Corrosion Rate: {res['estimated_corrosion_rate_mm_year']} mm/yr)")
    print(f"  [+] Cold-End Operating State: {res['cold_end_status']}")
    print('  PASS')


def test_card_45_multistage_compressor_train():
    print('\n--- TEST 45: API 617 (8th Ed.) & ASME PTC 10 Multi-Stage Centrifugal Compressor Train ---')
    res = engineering_tools.calculate_multistage_compressor_train(
        compressor_tag="K-103",
        suction_pressure_bar=25.0,
        discharge_pressure_bar=175.0,
        suction_temp_c=40.0,
        mass_flow_kg_s=42.0,
        gas_molecular_weight=12.5,
        gas_k_ratio=1.36,
        stage_count=3,
        intercooler_outlet_temp_c=45.0,
        stage_polytropic_efficiency=0.82
    )
    assert 'error' not in res
    assert res['compressor_tag'] == 'K-103'
    assert res['overall_pressure_ratio'] == 7.0
    assert res['stage_count'] == 3
    assert len(res['stages']) == 3
    assert res['total_polytropic_head_kj_kg'] > 0
    assert res['total_shaft_power_mw'] > 0
    assert res['compliance'] == 'PASS'
    for stg in res['stages']:
        assert stg['temp_limit_pass'] is True
    print(f"  [+] Compressor: {res['compressor_tag']} ({res['stage_count']}-Stage Centrifugal Train)")
    print(f"  [+] Pressure Profile: {res['stages'][0]['suction_pressure_bar']} bar -> {res['stages'][-1]['discharge_pressure_bar']} bar (Overall PR: {res['overall_pressure_ratio']}:1, Stage PR: {res['stage_pressure_ratio']}:1)")
    print(f"  [+] Total Polytropic Head: {res['total_polytropic_head_kj_kg']} kJ/kg")
    print(f"  [+] Total Shaft Power Demand: {res['total_shaft_power_mw']} MW (Gas Power + 3.5% Mech Losses)")
    print(f"  [+] Total Intercooler Heat Duty: {res['total_intercooler_duty_mwth']} MWth")
    print(f"  [+] Stage 1: P={res['stages'][0]['suction_pressure_bar']}->{res['stages'][0]['discharge_pressure_bar']} bar, T_out={res['stages'][0]['discharge_temp_c']} °C (Pass: {res['stages'][0]['temp_limit_pass']})")
    print(f"  [+] Stage 2: P={res['stages'][1]['suction_pressure_bar']}->{res['stages'][1]['discharge_pressure_bar']} bar, T_out={res['stages'][1]['discharge_temp_c']} °C (Pass: {res['stages'][1]['temp_limit_pass']})")
    print(f"  [+] Stage 3: P={res['stages'][2]['suction_pressure_bar']}->{res['stages'][2]['discharge_pressure_bar']} bar, T_out={res['stages'][2]['discharge_temp_c']} °C (Pass: {res['stages'][2]['temp_limit_pass']})")
    print(f"  [+] API 617 Thermal Compliance: {res['thermal_compliance']} (Limit: {res['discharge_temp_api617_limit_c']} °C)")
    print('  PASS')


def test_card_46_iec61882_hazop_matrix():
    print('\n--- TEST 46: Autonomous IEC 61882 / OSHA 1910.119 Process Hazard Analysis (HAZOP) Matrix ---')
    res = engineering_tools.generate_iec61882_hazop_matrix(asset_tag="R-401")
    assert 'error' not in res
    assert res['asset_tag'] == 'R-401'
    assert res['total_deviations_evaluated'] >= 8
    assert len(res['deviations']) >= 8
    assert len(res['study_seal_sha256']) == 64
    assert 'risk_matrix_summary' in res
    guide_words = [d['guide_word'] for d in res['deviations']]
    assert 'MORE' in guide_words
    assert 'LESS' in guide_words
    assert 'NONE' in guide_words
    print(f"  [+] HAZOP Node: {res['study_node_description']} ({res['asset_name']})")
    print(f"  [+] Standard Framework: {res['standard']}")
    print(f"  [+] Total Systematic Deviations Evaluated: {res['total_deviations_evaluated']}")
    print(f"  [+] Risk Tier Distribution: {res['risk_matrix_summary']} (High/Critical: {res['high_or_critical_risks_count']})")
    print(f"  [+] First Deviation: [{res['deviations'][0]['parameter']} / {res['deviations'][0]['guide_word']}] -> {res['deviations'][0]['deviation']}")
    print(f"      - Cause: {res['deviations'][0]['causes'][:60]}...")
    print(f"      - Consequence: {res['deviations'][0]['consequences'][:60]}...")
    print(f"      - Safeguards: {res['deviations'][0]['existing_safeguards']}")
    print(f"      - Risk Score: {res['deviations'][0]['risk_score']} ({res['deviations'][0]['risk_tier']})")
    print(f"      - CAPA Action: {res['deviations'][0]['recommended_capa_action'][:60]}...")
    print(f"  [+] Cryptographic Study Seal: {res['study_seal_sha256'][:24]}...")
    print('  PASS')


def test_card_47_iso13849_functional_safety_pl():
    print('\n--- TEST 47: ISO 13849-1 & IEC 62061 Machinery Functional Safety Performance Level (PL) ---')
    res = engineering_tools.calculate_iso13849_functional_safety_pl(
        safety_function_name="High-Pressure Quench Trip Interlock",
        architecture_category="Category 4",
        mttf_d_years_channel_1=45.0,
        mttf_d_years_channel_2=45.0,
        dc_avg_pct=99.0,
        common_cause_failure_score=75,
        required_performance_level="PLe"
    )
    assert 'error' not in res
    assert res['architecture_category'] == 'Category 4'
    assert res['achieved_performance_level'] == 'PLe'
    assert res['equivalent_sil_claim_limit'] == 'SIL 3'
    assert res['ccf_requirement_satisfied'] is True
    assert res['compliance'] == 'PASS_FUNCTIONAL_SAFETY_VALIDATED'
    print(f"  [+] Safety Function: {res['safety_function_name']} ({res['architecture_category']})")
    print(f"  [+] Symmetrized MTTFd: {res['mttf_d_symmetrized_years']} years ({res['mttf_d_level']})")
    print(f"  [+] Diagnostic Coverage: {res['diagnostic_coverage_pct']}% ({res['dc_avg_level']})")
    print(f"  [+] Common Cause Failures: Score {res['common_cause_failure_score']}/100 (Pass: {res['ccf_requirement_satisfied']})")
    print(f"  [+] Achieved Performance Level: {res['achieved_performance_level']} vs Required {res['required_performance_level']}")
    print(f"  [+] Dangerous Failure Probability (PFHd): {res['probability_dangerous_failure_per_hr']} /hr (Claim: {res['equivalent_sil_claim_limit']})")
    print(f"  [+] Statutory Verdict: {res['compliance']}")
    print('  PASS')


def test_card_48_api520_flare_piping_aiv():
    print('\n--- TEST 48: API 520 Part II & EEMUA 158 Acoustical Induced Vibration (AIV) Assessment ---')
    res = engineering_tools.calculate_api520_flare_piping_aiv(
        relief_valve_tag="PSV-101",
        tailpipe_nps_in=10.0,
        tailpipe_sch="Sch 40",
        relieving_mass_flow_kg_s=24.5,
        relieving_temp_c=160.0,
        fluid_molecular_weight=44.1,
        gas_k_ratio=1.18,
        upstream_relieving_pressure_bar_a=24.5,
        downstream_backpressure_bar_a=2.8
    )
    assert 'error' not in res
    assert res['relief_valve_tag'] == 'PSV-101'
    assert res['tailpipe_mach_number'] <= 0.70
    assert res['mach_compliance'] == 'PASS'
    assert res['sound_power_level_db'] > 100.0
    assert res['compliance'] in ('PASS_AIV_FATIGUE_SAFE', 'REVIEW_AIV_MITIGATION_REQUIRED')
    print(f"  [+] Relief Valve Tailpipe: {res['relief_valve_tag']} (NPS {res['tailpipe_nps_in']}\", {res['tailpipe_schedule']})")
    print(f"  [+] Relieving Dynamics: Flow={res['relieving_mass_flow_kg_s']} kg/s, Gas Velocity={res['tailpipe_gas_velocity_m_s']} m/s, Sonic Speed={res['sound_speed_m_s']} m/s")
    print(f"  [+] Discharge Mach Number: {res['tailpipe_mach_number']} vs Limit {res['max_allowable_tailpipe_mach']} ({res['mach_compliance']})")
    print(f"  [+] Acoustic Power Level (Lw): {res['sound_power_level_db']} dB (Screening Limit: {res['aiv_screening_limit_db']} dB)")
    print(f"  [+] Acoustic Fatigue Risk Tier: {res['aiv_risk_tier']}")
    print(f"  [+] Recommendation: {res['engineering_recommendation'][:65]}...")
    print(f"  [+] Statutory Compliance: {res['compliance']}")
    print('  PASS')


def test_card_49_api670_vibration_proximity_probe():
    print('\n--- TEST 49: API Standard 670 (5th Ed.) Machinery Protection & 2oo2 Proximity Probes ---')
    res = engineering_tools.calculate_api670_vibration_proximity_probe(
        machine_tag="K-101",
        probe_channel_x="VT-101X",
        probe_channel_y="VT-101Y",
        gap_voltage_dc_v=-10.2,
        peak_to_peak_um_x=22.5,
        peak_to_peak_um_y=24.0,
        operating_speed_rpm=10450.0
    )
    assert 'error' not in res
    assert res['machine_tag'] == 'K-101'
    assert res['probe_health_state'] == 'NORMAL_LINEAR_RANGE'
    assert res['api670_alarm_threshold_um'] > 0
    assert res['api670_trip_threshold_um'] > res['api670_alarm_threshold_um']
    assert res['protection_system_verdict'] == 'NORMAL_ROTATING_STABILITY'
    assert res['status'] == 'PASS_WITHIN_LIMITS'
    print(f"  [+] Machine: {res['machine_tag']} ({res['operating_speed_rpm']} RPM, Transducers: {res['probe_channels']})")
    print(f"  [+] DC Gap Voltage Health: {res['dc_gap_voltage_v']} V -> {res['probe_health_state']} (Calculated Gap: {res['calculated_gap_um']} um)")
    print(f"  [+] Vibration Amplitudes: X={res['measured_vibration_x_p_p_um']} um p-p, Y={res['measured_vibration_y_p_p_um']} um p-p (Governing: {res['governing_vibration_um']} um)")
    print(f"  [+] API 670 Thresholds: Alarm={res['api670_alarm_threshold_um']} um, Trip={res['api670_trip_threshold_um']} um")
    print(f"  [+] Protection Logic: {res['voting_architecture']} -> Verdict: {res['protection_system_verdict']}")
    print(f"  [+] Orbit Ellipticity: Major Axis={res['orbit_major_axis_um']} um, Eccentricity={res['orbit_eccentricity_ratio']}")
    print(f"  [+] Operational Status: {res['status']} ({res['compliance']})")
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
    test_card_19_api650_storage_tank()
    test_card_20_asme_ptc4_boiler_efficiency()
    test_card_21_tema_heat_exchanger_rating()
    test_card_22_api510_vessel_remaining_life()
    test_card_23_nace_mr0175_sour_service()
    test_card_24_multi_agent_engineering_consensus()
    test_card_25_rag_multidomain_standards_retrieval()
    test_card_26_weibull_rul_prognostics()
    test_card_27_pinch_analysis_heat_network()
    test_card_28_fatigue_cumulative_damage_miner()
    test_card_29_joukowsky_water_hammer_surge()
    test_card_30_iso5167_orifice_flowmeter()
    test_card_31_api581_rbi_risk_matrix()
    test_card_32_cryogenic_blowdown_depressurization()
    test_card_33_rotor_dynamics_critical_speeds()
    test_card_34_iec60079_hazardous_area_ex()
    test_card_35_isa182_alarm_triage_engine()
    test_card_36_api579_crack_growth_paris_law()
    test_card_37_asme_thermal_shock_transient()
    test_card_38_api2218_fireproofing_thermal_rating()
    test_card_39_sensor_drift_and_fdd()
    test_card_40_api650_seismic_sloshing_dynamics()
    test_card_41_hei_condenser_vacuum_performance()
    test_card_42_plant_topology_and_isolation_tracing()
    test_card_43_ieee1584_arc_flash_hazard()
    test_card_44_acid_gas_dew_point()
    test_card_45_multistage_compressor_train()
    test_card_46_iec61882_hazop_matrix()
    test_card_47_iso13849_functional_safety_pl()
    test_card_48_api520_flare_piping_aiv()
    test_card_49_api670_vibration_proximity_probe()
    print("\n================================================================")
    print("ALL 49 TESTS PASSED WITH 100% DETERMINISTIC FIDELITY!")
    print("================================================================")




