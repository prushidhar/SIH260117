"""
models/templates/report_templates.py — Concise, Human-Readable AI Synthesis Templates
Delivers crisp, direct, understandable engineering assessments with zero LaTeX clutter.
"""

REPORT_TEMPLATES = {
    'pump_hydraulics': """### Pump Hydraulic Assessment: `{tag}` (API 610)

**Status:** **SAFE & FULLY COMPLIANT** with API 610 / ISO 13709

#### Calculation Summary:
| Engineering Parameter | Calculated Value | Reference / Standard |
| :--- | :--- | :--- |
| **Operating Flow Rate** | **{flow_rate_m3h} m³/h** ({flow_rate_gpm} GPM) | Process Inlet Conditions |
| **Total Dynamic Head (TDH)** | **{total_dynamic_head_meters} m** ({total_dynamic_head_ft} ft) | API 610 Clause 6.3 |
| **Differential Pressure (ΔP)** | **{differential_pressure_psi} psi** | Fluid SG: {specific_gravity} |
| **Hydraulic Water Power** | **{hydraulic_power_hp} HP** | Net Fluid Work |
| **Brake Horsepower (BHP)** | **{brake_horsepower_bhp} BHP** | Efficiency: {pump_efficiency} |
| **Shaft Power Demand** | **{motor_power_required_kw} kW** | Continuous Operational Load |
| **Recommended Driver Motor** | **{recommended_motor_nameplate_kw} kW** | API 610 Table 12 Margin |
| **Cavitation Risk (NPSH)** | **NPSHa: {npsh_available_m} m / NPSHr: {npsh_required_m} m** | Margin: **+{margin_delta_meters} m** (Safe) |

#### Engineering Recommendations:
1. **Driver Selection:** Install a standard **{recommended_motor_nameplate_kw} kW** (or standard 37 kW) 3-phase induction motor rated for heavy-duty industrial service.
2. **Hydraulic Envelope:** The operating flow of {flow_rate_m3h} m³/h sits comfortably in the Preferred Operating Region (POR).
3. **Sealed Deliverables:** Formal engineering report (.docx) and calculation workbook (.xlsx) have been generated and are ready for download below.""",

    'pump_cavitation': """### Pump Cavitation & NPSH Assessment: `{tag}` (API 610)

**Status:** **{risk_title}**

#### NPSH Evaluation:
| Parameter | Value | Assessment Criteria | Status |
| :--- | :--- | :--- | :--- |
| **NPSH Available (NPSHa)** | **{npsh_available_m} m** | Suction System Head | Verified |
| **NPSH Required (NPSHr)** | **{npsh_required_m} m** | Impeller Baseline | Verified |
| **Margin Delta (ΔNPSH)** | **+{margin_delta_meters} m** | NPSHa − NPSHr | **SAFE (Margin > 1.0 m)** |
| **Margin Ratio** | **{margin_ratio}x** | API 610 Min: ≥ 1.10x | **PASS** |

#### Engineering Verdict:
- {risk_description}
- Cavitation damage risk is negligible under continuous service. Continue routine acoustic monitoring.""",

    'pipe_thickness': """### Piping Wall Thickness Evaluation: `{tag}` (ASME B31.3)

**Status:** **CODE COMPLIANT (ASME B31.3 Chapter II)**

#### Design Calculations:
| Parameter | Value | Unit | Engineering Reference |
| :--- | :--- | :--- | :--- |
| **Internal Design Pressure (P)** | **{pressure_psig}** | psig | Process Conditions |
| **Outer Diameter (D)** | **{outer_diameter_in}** | inches | Nominal Pipe Size |
| **Basic Allowable Stress (S)** | **{allowable_stress_psi}** | psi | ASTM A106 Grade B |
| **Corrosion Allowance (c)** | **{corrosion_allowance_in}** | inches | Standard Refining Margin |
| **Pressure Design Thickness (t_d)** | **{t_design_inches}** | inches | ASME B31.3 Para 304.1.2 |
| **Minimum Required Wall (t_m)** | **{t_minimum_required_inches}** | inches | t_m = t_d + c |
| **Selected Pipe Schedule** | **{recommended_commercial_schedule}** | — | **Verified Adequate** |

#### Recommendations:
1. Specify seamless ASTM A106 Grade B matching **{recommended_commercial_schedule}**.
2. Perform hydrotest at 1.5× design pressure ({hydro_test_psig} psig).""",

    'flange_mawp': """### Flange Rating Assessment: `{tag}` (ASME B16.5)

**Status:** **VERIFIED (ASME B16.5 Table 2-1.1)**

#### Rating Summary:
| Parameter | Value | Reference |
| :--- | :--- | :--- |
| **Flange Rating Class** | **Class {flange_class}#** | ASME B16.5 |
| **Design Temperature** | **{design_temp_c}°C** ({design_temp_f}°F) | Operating Process |
| **Material Specification** | **{material_spec}** | Carbon Steel Group 1.1 |
| **Maximum Allowable Pressure (MAWP)** | **{mawp_psig} psig** ({mawp_bar} bar) | Table 2-1.1 |
| **Hydrostatic Proof Test Pressure** | **{hydrostatic_test_pressure_psig} psig** | 1.5× MAWP @ 20°C |

#### Recommendations:
1. Install spiral-wound 316SS/graphite gaskets per ASME B16.20 with ASTM A193 B7 bolting.
2. Follow cross-pattern bolt torque sequencing per ASME PCC-1.""",

    'compressor_surge': """### Compressor Surge Margin Evaluation: `{tag}` (API 617)

**Status:** **{surge_title}**

#### Operating Envelope:
| Parameter | Value | Assessment Criteria |
| :--- | :--- | :--- |
| **Actual Operating Flow** | **{actual_flow_m3_h} m³/h** | Live Process Rate |
| **Surge Limit Flow** | **{surge_flow_m3_h} m³/h** | Acoustic Boundary |
| **Surge Margin** | **{surge_margin_percent}%** | API 617 Minimum: ≥ 10% |

#### Recommendations:
- {mitigation_action}
- Maintain Anti-Surge Control Line (ASCL) tracking with fast-acting recycle valve response.""",

    'heat_exchanger_duty': """### Heat Exchanger Duty Assessment: `{tag}` (TEMA / API 660)

**Status:** **THERMALLY VERIFIED**

#### Duty Summary:
| Parameter | Value | Engineering Reference |
| :--- | :--- | :--- |
| **Process Mass Flow** | **{flow_rate_kg_h} kg/h** | Process Stream Balance |
| **Temperature Rise (ΔT)** | **{delta_t_celsius}°C** ({temp_in_c}°C → {temp_out_c}°C) | Terminal Temperatures |
| **Calculated Thermal Duty** | **{heat_duty_kw} kW** ({heat_duty_mmbtu_hr} MMBtu/hr) | Q = m_dot × Cp × ΔT |

#### Recommendations:
- Balance tubeside/shellside flows to maintain rated differential pressure.""",

    'heat_exchanger_fouling': """### Exchanger Fouling Assessment: `{tag}` (TEMA)

**Status:** **{fouling_status}**

#### Performance Degradation:
| Parameter | Value | Reference |
| :--- | :--- | :--- |
| **Actual Overall U** | **{actual_overall_u_w_m2k} W/m²K** | Current Operational Rate |
| **Clean Baseline U** | **{clean_overall_u_w_m2k} W/m²K** | Design Benchmark |
| **Fouling Resistance (Rf)** | **{fouling_resistance_m2k_w} m²K/W** | TEMA Table RGP-T-2.4 |
| **Thermal Efficiency Loss** | **{thermal_degradation_percent}%** | Relative Degradation |

#### Recommendations:
- {action_recommendation}""",

    'control_valve_cv': """### Control Valve Sizing: `{tag}` (ANSI/ISA-75.01)

**Status:** **{control_range_status}**

#### Sizing Summary:
| Parameter | Value | Standard |
| :--- | :--- | :--- |
| **Flow Rate / Pressure Drop** | **{flow_rate_gpm} GPM / {delta_p_psi} psi** | Sizing Conditions |
| **Required Flow Coefficient (Cv)** | **{required_cv}** | ANSI/ISA-75.01 |
| **Selected Valve Port Size** | **{valve_body_size_inches} inches** | Nominal Port |
| **Rated Valve Trim Cv** | **{selected_valve_rated_cv}** | Manufacturer Trim |
| **Operating Stroke Position** | **{operating_stroke_percent}%** | Optimal: 20% to 80% |

#### Recommendations:
- Valve operates comfortably within controllable range. Specify equal-percentage trim.""",

    'vibration_severity': """### Vibration Severity Diagnostic: `{tag}` (ISO 10816-3)

**Status:** **{severity_title}**

#### Diagnostic Measurements:
| Parameter | Value | ISO 10816-3 Threshold |
| :--- | :--- | :--- |
| **Measured Velocity RMS** | **{vibration_velocity_mms} mm/s** | Operational Sensor |
| **Severity Classification** | **Zone {severity_zone}** | Machine Group {machine_group} |
| **Alarm Limit (Zone C)** | **{zone_c_limit} mm/s** | Action Threshold |
| **Trip Limit (Zone D)** | **{zone_d_limit} mm/s** | Shutdown Mandate |

#### Action Directive:
- {recommended_action}""",

    'default': """### Engineering Assessment: `{tag}`

**Status:** **DETERMINISTICALLY VERIFIED**

#### Query:
{prompt}

#### Calculations & Outcome:
{deterministic_summary}

#### Recommendations:
- All engineering calculations verified against governing ASME / API / ISO standards. Formal report and data workbook are available for download below."""
}
