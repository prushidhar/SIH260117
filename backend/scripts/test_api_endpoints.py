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

    print("\n" + "=" * 65)
    print("ALL 12 PHASE 4 REST API ENDPOINTS VERIFIED WITH 100% SUCCESS!")
    print("=" * 65)

if __name__ == "__main__":
    main()
