import os
import sys
import tempfile
import subprocess
from docx import Document
from openpyxl import Workbook
from sandbox.mcp_client import mcp_client


class ToolRegistry:
    def __init__(self):
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "python_sandbox",
                    "description": "Run Python code in a secure sandbox to analyze data or perform calculations.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "code": {
                                "type": "string",
                                "description": "The Python code to execute."
                            }
                        },
                        "required": ["code"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "generate_document",
                    "description": "Generate a .docx, .pptx, or .xlsx file.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "kind": {
                                "type": "string",
                                "enum": ["docx", "xlsx"],
                                "description": "The type of document to generate. 'docx' = Word approval note/report; 'xlsx' = Excel data sheet."
                            },
                            "content": {
                                "type": "string",
                                "description": "The text content or structured data for the document."
                            },
                            "filename": {
                                "type": "string",
                                "description": "The name of the file to create (without extension)."
                            }
                        },
                        "required": ["kind", "content", "filename"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "read_file",
                    "description": "Read an uploaded file by fileId.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "fileId": {
                                "type": "string",
                                "description": "The ID of the file to read."
                            }
                        },
                        "required": ["fileId"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "kb_search",
                    "description": "Query the vector knowledge base for top semantic matches.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query."
                            }
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_pipe_thickness_asme_b313",
                    "description": "Deterministic engineering calculation for minimum required pipe wall thickness according to ASME B31.3. Eliminates hallucination on complex math.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "pressure_psig": {"type": "number"},
                            "outer_diameter_in": {"type": "number"},
                            "stress_value_psi": {"type": "number"},
                            "joint_quality_factor": {"type": "number"}
                        },
                        "required": ["pressure_psig", "outer_diameter_in", "stress_value_psi", "joint_quality_factor"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_vibration_deviation",
                    "description": "Deterministically calculates vibration deviation from operating limit. Returns deviation percentage, risk status, and recommendation. Eliminates LLM hallucination on critical safety math.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "measured_mms": {"type": "number", "description": "Measured vibration in mm/s"},
                            "limit_mms": {"type": "number", "description": "SOP operating limit in mm/s"}
                        },
                        "required": ["measured_mms", "limit_mms"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_equipment_health_score",
                    "description": "Calculates an Equipment Health Score (0-100) from multi-parameter deviations. Returns numeric score, risk level, and recommended action.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "vibration_deviation_pct": {"type": "number", "description": "Vibration deviation % from limit"},
                            "temp_celsius": {"type": "number", "description": "Current bearing temperature in Celsius"},
                            "nominal_temp": {"type": "number", "description": "Nominal operating temperature in Celsius"}
                        },
                        "required": ["vibration_deviation_pct", "temp_celsius", "nominal_temp"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "extract_pid_components",
                    "description": "Extracts valves, instrumentation tags, process lines, and equipment from P&ID diagrams, scanned drawings, PDFs, or technical text using ISA-5.1 standards.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "file_id": {"type": "string", "description": "Optional uploaded file ID or filename"},
                            "component_filter": {"type": "string", "description": "Filter type e.g. 'valves', 'instruments', 'all'"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "diagnose_vibration_harmonics",
                    "description": "Industrial Machinery Vibration Spectral Diagnostics. Classifies rotating equipment failure modes (Dynamic Unbalance 1X, Misalignment 2X, Mechanical Looseness 3X-10X, Oil Whirl 0.4X, Bearing Defect) per ISO 10816-3, ISO 1940-1, API 670, API 686.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "dominant_freq_hz": {"type": "number", "description": "Dominant vibration peak frequency in Hz"},
                            "running_speed_rpm": {"type": "number", "description": "Rotor shaft operational running speed in RPM"},
                            "peak_velocity_mms": {"type": "number", "description": "Overall or peak vibration velocity in mm/s RMS"},
                            "machine_tag": {"type": "string", "description": "Equipment asset tag e.g. P-301, K-301"}
                        },
                        "required": ["dominant_freq_hz", "running_speed_rpm"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_pump_cavitation_margin",
                    "description": "Evaluates pump cavitation risk and Net Positive Suction Head (NPSH) safety margin per API 610 12th Edition / ISO 13709 Clause 6.1.8.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "npsh_available_m": {"type": "number", "description": "Net Positive Suction Head Available (NPSHa) in meters"},
                            "npsh_required_m": {"type": "number", "description": "Net Positive Suction Head Required (NPSHr) at duty point in meters"},
                            "pump_tag": {"type": "string", "description": "Pump equipment tag e.g. P-301A"},
                            "fluid_name": {"type": "string", "description": "Pumped process fluid name"}
                        },
                        "required": ["npsh_available_m", "npsh_required_m"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_compressor_surge_margin",
                    "description": "Calculates centrifugal compressor operating point distance from surge limit line per API 617 8th Edition. Evaluates Anti-Surge Control Line (ASCL) compliance.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "actual_flow_m3_h": {"type": "number", "description": "Actual process volumetric flow rate in m3/h"},
                            "surge_flow_m3_h": {"type": "number", "description": "Surge point limit flow rate in m3/h at current compression ratio"},
                            "compressor_tag": {"type": "string", "description": "Compressor tag e.g. K-301"}
                        },
                        "required": ["actual_flow_m3_h", "surge_flow_m3_h"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_pump_hydraulics",
                    "description": "Calculates differential head, hydraulic power, and motor brake horsepower (BHP) for industrial pumps per API 610 / ISO 13709.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "flow_rate_gpm": {"type": "number", "description": "Flow rate in GPM"},
                            "suction_pressure_psig": {"type": "number", "description": "Suction pressure in psig"},
                            "discharge_pressure_psig": {"type": "number", "description": "Discharge pressure in psig"},
                            "specific_gravity": {"type": "number", "description": "Specific gravity of fluid (default 0.85)"},
                            "pump_efficiency": {"type": "number", "description": "Pump efficiency (default 0.75)"}
                        },
                        "required": ["flow_rate_gpm", "suction_pressure_psig", "discharge_pressure_psig"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_flange_mawp_asme_b165",
                    "description": "Looks up Maximum Allowable Working Pressure (MAWP) and hydrostatic shell test pressure for pipe flanges per ASME B16.5 Table 2-1.1.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "flange_class": {"type": "integer", "description": "Flange pressure rating class (150, 300, 600, 900, 1500)"},
                            "design_temp_c": {"type": "number", "description": "Design temperature in Celsius"},
                            "material_spec": {"type": "string", "description": "Material specification e.g. ASTM A105"}
                        },
                        "required": ["flange_class", "design_temp_c"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_heat_exchanger_duty",
                    "description": "Calculates thermal heat duty (Q) and steam/cooling requirement for industrial heat exchangers per API 660 / TEMA Standards.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "flow_rate_kg_h": {"type": "number", "description": "Process stream mass flow rate in kg/h"},
                            "temp_in_c": {"type": "number", "description": "Process inlet temperature in Celsius"},
                            "temp_out_c": {"type": "number", "description": "Process outlet temperature in Celsius"},
                            "specific_heat_kj_kg_c": {"type": "number", "description": "Specific heat capacity Cp in kJ/(kg*C)"}
                        },
                        "required": ["flow_rate_kg_h", "temp_in_c", "temp_out_c"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_control_valve_cv_isa75",
                    "description": "Flow Coefficient (Cv) sizing and operating stroke percentage evaluation for control valves per ANSI/ISA-75.01.01 (IEC 60534-2-1).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "flow_rate_gpm": {"type": "number", "description": "Process liquid flow rate in GPM"},
                            "delta_p_psi": {"type": "number", "description": "Pressure drop across valve trim in psi"},
                            "specific_gravity": {"type": "number", "description": "Fluid specific gravity (default 0.85)"},
                            "valve_tag": {"type": "string", "description": "Valve tag e.g. FV-301"},
                            "nominal_valve_size_in": {"type": "number", "description": "Nominal line size in inches"}
                        },
                        "required": ["flow_rate_gpm", "delta_p_psi"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_heat_exchanger_fouling_tema",
                    "description": "Evaluates heat exchanger fouling resistance (Rf) and thermal degradation percentage per TEMA 10th Edition (Class R) and API 660.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "heat_duty_kw": {"type": "number", "description": "Thermal heat duty in kW"},
                            "surface_area_m2": {"type": "number", "description": "Effective heat transfer surface area in m2"},
                            "lmtd_c": {"type": "number", "description": "Log Mean Temperature Difference (LMTD) in Celsius"},
                            "clean_u_w_m2k": {"type": "number", "description": "Design clean overall heat transfer coefficient in W/(m2*K)"},
                            "exchanger_tag": {"type": "string", "description": "Heat exchanger equipment tag e.g. E-101"}
                        },
                        "required": ["heat_duty_kw", "surface_area_m2", "lmtd_c"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_darcy_weisbach_pressure_drop",
                    "description": "Calculates fluid velocity, Reynolds number, Colebrook-White friction factor, and Darcy-Weisbach pressure drop/head loss per Crane TP 410 and ISO 5167.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "flow_rate_m3_s": {"type": "number", "description": "Volumetric flow rate in m3/s"},
                            "pipe_diameter_m": {"type": "number", "description": "Inside pipe diameter in meters"},
                            "pipe_length_m": {"type": "number", "description": "Total pipe length in meters"},
                            "pipe_roughness_m": {"type": "number", "description": "Absolute pipe roughness in meters (default: 0.000045m for carbon steel)"},
                            "fluid_density_kg_m3": {"type": "number", "description": "Fluid density in kg/m3 (default: 998.2 kg/m3 for water)"},
                            "fluid_viscosity_pa_s": {"type": "number", "description": "Dynamic viscosity in Pa*s (default: 0.001002 Pa*s for water)"},
                            "equipment_tag": {"type": "string", "description": "Piping line identifier"}
                        },
                        "required": ["flow_rate_m3_s", "pipe_diameter_m"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_asme_section_viii_vessel_thickness",
                    "description": "Calculates minimum required shell and 2:1 ellipsoidal head wall thickness for unfired pressure vessels per ASME Section VIII Div 1 UG-27 and UG-32.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "design_pressure_psig": {"type": "number", "description": "Internal design pressure in psig"},
                            "inside_radius_in": {"type": "number", "description": "Inside vessel radius in inches"},
                            "allowable_stress_psi": {"type": "number", "description": "Maximum allowable stress at design temperature in psi"},
                            "joint_efficiency": {"type": "number", "description": "Weld joint efficiency factor E (default: 1.0 for 100% RT)"},
                            "corrosion_allowance_in": {"type": "number", "description": "Corrosion allowance in inches (default: 0.125 in)"},
                            "head_type": {"type": "string", "description": "Formed head type (default: 2:1_ellipsoidal)"},
                            "equipment_tag": {"type": "string", "description": "Vessel asset tag e.g. V-101"}
                        },
                        "required": ["design_pressure_psig", "inside_radius_in", "allowable_stress_psi"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "ocr_inspect_document",
                    "description": "Performs air-gapped on-premise OCR and multimodal extraction from scanned inspection reports, NDT thickness logs, handwritten maintenance sheets, and engineering drawings.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "file_path": {"type": "string", "description": "Path or filename of the scanned PDF or image document"},
                            "target_tag": {"type": "string", "description": "Target equipment asset tag (e.g. CDU-Pipe-104)"},
                            "inspection_type": {"type": "string", "description": "NDT inspection type (ultrasonic, radiographic, eddy_current)"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "evaluate_root_cause_tree",
                    "description": "Industrial Root Cause Analysis (RCA) & Bayesian Fault Tree Evaluator. Evaluates failure modes, 5-Whys causal chains, Ishikawa 6M factors, and CAPA remediations per OSHA 1910.119 PSM and API 682.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "equipment_tag": {"type": "string", "description": "Asset tag e.g. P-101, CDU-104"},
                            "incident_type": {"type": "string", "description": "Type of trip or failure mode e.g. seal_flush_temperature_trip"},
                            "evidence_tags": {"type": "array", "items": {"type": "string"}, "description": "Telemetry sensor tags correlated with the failure"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "simulate_crude_distillation_mass_balance",
                    "description": "Deterministic refinery atmospheric distillation unit (CDU) mass & energy balance simulation engine. Calculates cut yields, furnace duty, Souders-Brown flooding margins, and carbon intensity per API Tech Data Book and GPSA §13.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "crude_api": {"type": "number", "description": "Crude oil API gravity e.g. 33.4 (Arab Light) or 21.8 (Maya Heavy)"},
                            "feed_bpd": {"type": "number", "description": "Feed flow rate in barrels per day (BPD)"},
                            "furnace_temp_c": {"type": "number", "description": "Atmospheric charge heater outlet temperature in Celsius"},
                            "steam_stripping_rate": {"type": "number", "description": "Bottom stripping steam rate kg/bbl"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "evaluate_hazop_lopa_sil",
                    "description": "Industrial HAZOP & Layer of Protection Analysis (LOPA) functional safety engine. Calculates unmitigated frequency, cumulative PFD of active IPLs, mitigated event frequency, and SIL target allocation per IEC 61508 / IEC 61511.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "node_id": {"type": "string", "description": "Process node identifier e.g. NODE-01_CDU_FEED"},
                            "deviation": {"type": "string", "description": "HAZOP guide word deviation e.g. HIGH_PRESSURE, LESS_FLOW"},
                            "consequence_severity": {"type": "string", "description": "Severity category: CATASTROPHIC, SEVERE, SERIOUS, MODERATE"},
                            "initiating_frequency": {"type": "number", "description": "Initiating event frequency in events per year"},
                            "enabled_ipl_ids": {"type": "array", "items": {"type": "string"}, "description": "List of active IPL identifiers e.g. ['IPL-01', 'IPL-02']"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_api521_flare_radiation_and_dispersion",
                    "description": "Calculates API 521 7th Ed. thermal radiation profile, tip exit Mach number, smokeless steam injection requirements, and Gaussian plume ground dispersion for refinery emergency flaring scenarios.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "relieved_flow_kg_s": {"type": "number", "description": "Relieved mass flow rate in kg/s"},
                            "gas_mw": {"type": "number", "description": "Molecular weight of hydrocarbon relief gas"},
                            "flare_height_m": {"type": "number", "description": "Flare stack height in meters"},
                            "wind_speed_m_s": {"type": "number", "description": "Crosswind velocity in m/s"},
                            "flare_tip_diameter_m": {"type": "number", "description": "Flare tip inside diameter in meters"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_turnaround_critical_path",
                    "description": "Calculates Critical Path Method (CPM) turnaround schedule, bottleneck activities, total float hours, and hourly downtime financial exposure per OSHA 1910.119 and PMI standards.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "shutdown_id": {"type": "string", "description": "Turnaround identifier e.g. TAR-2026-CDU1"},
                            "planned_days": {"type": "integer", "description": "Target planned turnaround window in days"},
                            "hourly_downtime_cost_usd": {"type": "number", "description": "Financial cost of plant downtime per hour in USD"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_compressor_anti_surge_map",
                    "description": "Calculates API 617 / ASME PTC 10 Centrifugal Compressor Anti-Surge operating envelope, polytropic head, Surge Control Line (SCL) safety margin, stonewall choke limit, and ASV modulation requirements.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "compressor_tag": {"type": "string", "description": "Compressor tag e.g. K-101"},
                            "inlet_flow_m3_h": {"type": "number", "description": "Actual suction volumetric flow in m3/h"},
                            "suction_p_bar": {"type": "number", "description": "Suction pressure in bar"},
                            "discharge_p_bar": {"type": "number", "description": "Discharge pressure in bar"},
                            "suction_t_c": {"type": "number", "description": "Suction temperature in Celsius"},
                            "gas_mw": {"type": "number", "description": "Process gas molecular weight"},
                            "speed_rpm": {"type": "number", "description": "Operating rotational speed in RPM"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_steam_turbine_cogen_balance",
                    "description": "Calculates ASME PTC 6 & IAPWS-IF97 Steam Turbine Generator (STG) multi-stage cogeneration enthalpy drop, power generated in MW, process steam heat export, and carbon emissions offset.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "turbine_tag": {"type": "string", "description": "Turbine tag e.g. STG-01"},
                            "throttle_steam_flow_t_h": {"type": "number", "description": "Main throttle steam flow rate in tons/hr"},
                            "hp_inlet_p_bar": {"type": "number", "description": "HP throttle inlet steam pressure in bar"},
                            "hp_inlet_t_c": {"type": "number", "description": "HP throttle inlet steam temperature in Celsius"},
                            "mp_extraction_flow_t_h": {"type": "number", "description": "Medium pressure process steam extraction flow in tons/hr"},
                            "lp_extraction_flow_t_h": {"type": "number", "description": "Low pressure process steam extraction flow in tons/hr"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_cathodic_protection_and_cui_risk",
                    "description": "Calculates NACE SP0169 pipe-to-soil cathodic protection potential, sacrificial anode consumption life, CUI sweating vulnerability, and API 581 Risk-Based Inspection (RBI) POF x COF matrix ranking.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "pipe_tag": {"type": "string", "description": "Pipe tag e.g. L-101"},
                            "pipe_to_soil_potential_mv": {"type": "number", "description": "Pipe-to-soil potential in mV CSE"},
                            "anode_type": {"type": "string", "description": "Anode material: Zinc, Magnesium, Aluminium"},
                            "installed_anode_mass_kg": {"type": "number", "description": "Initial installed sacrificial anode mass in kg"},
                            "operating_temp_c": {"type": "number", "description": "Operating line temperature in Celsius"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_cooling_tower_performance",
                    "description": "Calculates CTI ATC-105 & ASHRAE cooling tower approach, range, thermal heat rejection duty in MWth, evaporation rate, blowdown rate, and makeup water demand.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "tower_tag": {"type": "string", "description": "Cooling tower tag e.g. CT-101"},
                            "circulating_flow_m3_h": {"type": "number", "description": "Circulating water flow rate in m3/h"},
                            "hot_water_temp_c": {"type": "number", "description": "Hot water return temperature in Celsius"},
                            "cold_water_temp_c": {"type": "number", "description": "Cold water basin temperature in Celsius"},
                            "ambient_dry_bulb_c": {"type": "number", "description": "Ambient dry bulb air temperature in Celsius"},
                            "ambient_relative_humidity_pct": {"type": "number", "description": "Ambient relative humidity %"},
                            "cycles_of_concentration": {"type": "number", "description": "Water cycles of concentration (COC)"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_teg_dehydration_unit",
                    "description": "GPSA Sec 20 TEG glycol dehydration unit: dew point depression, circulation rate, reboiler duty, contactor sizing",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "gas_flow_mmscfd": {"type": "number", "description": "Gas flow in MMSCFD", "default": 50.0},
                            "inlet_pressure_psia": {"type": "number", "description": "Contactor inlet pressure psia", "default": 1000.0},
                            "inlet_temp_c": {"type": "number", "description": "Inlet temperature deg C", "default": 40.0},
                            "lean_teg_concentration": {"type": "number", "description": "Lean TEG concentration wt%", "default": 99.5},
                            "teg_circulation_rate_liter_per_kg": {"type": "number", "description": "TEG circ rate L/kg H2O removed", "default": 25.0},
                            "target_dewpoint_c": {"type": "number", "description": "Target outlet dew point deg C", "default": -70.0},
                            "contactor_trays": {"type": "integer", "description": "Number of contactor trays", "default": 4}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_relief_valve_sizing",
                    "description": "API 520/526 pressure relief valve sizing for fire case and process case scenarios",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "scenario": {"type": "string", "description": "fire_case or process_upset", "default": "fire_case"},
                            "vessel_design_pressure_psig": {"type": "number", "description": "Vessel design pressure psig", "default": 350.0},
                            "set_pressure_psig": {"type": "number", "description": "PRV set pressure psig", "default": 340.0},
                            "fluid": {"type": "string", "description": "Fluid name", "default": "naphtha"},
                            "fluid_sg": {"type": "number", "description": "Fluid specific gravity", "default": 0.72},
                            "fluid_mw": {"type": "number", "description": "Fluid molecular weight", "default": 100.0},
                            "fluid_k": {"type": "number", "description": "Cp/Cv ratio", "default": 1.05},
                            "inlet_temp_k": {"type": "number", "description": "Relieving temperature K", "default": 673.15},
                            "fire_heat_input_btu_per_hr": {"type": "number", "description": "Fire case heat input BTU/hr", "default": 2500000.0},
                            "back_pressure_psig": {"type": "number", "description": "Back pressure psig", "default": 15.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_api579_fitness_for_service",
                    "description": "API 579-1 / ASME FFS-1 Level 1 & 2 Fitness-For-Service Assessment for Local Metal Thinning (LTA) and pitting loss.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "component_type": {"type": "string", "description": "cylindrical_shell, pipe, or spherical_head", "default": "cylindrical_shell"},
                            "outside_diameter_mm": {"type": "number", "description": "Component outside diameter in mm", "default": 406.4},
                            "nominal_thickness_mm": {"type": "number", "description": "Original nominal thickness in mm", "default": 12.7},
                            "future_corrosion_allowance_mm": {"type": "number", "description": "Future corrosion allowance in mm", "default": 1.5},
                            "measured_minimum_thickness_mm": {"type": "number", "description": "Measured remaining minimum thickness in mm", "default": 6.8},
                            "longitudinal_flaw_length_mm": {"type": "number", "description": "Longitudinal length of flaw s in mm", "default": 125.0},
                            "circumferential_flaw_width_mm": {"type": "number", "description": "Circumferential width of flaw c in mm", "default": 85.0},
                            "design_pressure_mpa": {"type": "number", "description": "Operating/Design pressure in MPa", "default": 3.5},
                            "allowable_stress_mpa": {"type": "number", "description": "Allowable material stress S in MPa", "default": 138.0},
                            "joint_efficiency": {"type": "number", "description": "Weld joint efficiency factor E", "default": 1.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_bolted_flange_joint_integrity",
                    "description": "ASME Section VIII Div 1 App 2 & ASME PCC-1 bolted flanged joint seating stress, bolt area margin, and assembly torque.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "flange_nps_in": {"type": "number", "description": "Nominal pipe size in inches", "default": 8.0},
                            "flange_class": {"type": "integer", "description": "ASME B16.5 flange pressure class", "default": 300},
                            "design_pressure_bar": {"type": "number", "description": "Design pressure in bar", "default": 35.0},
                            "design_temp_c": {"type": "number", "description": "Design temperature in Celsius", "default": 220.0},
                            "gasket_type": {"type": "string", "description": "Gasket material type", "default": "spiral_wound_316_graphite"},
                            "number_of_bolts": {"type": "integer", "description": "Number of flange studs/bolts", "default": 12},
                            "bolt_diameter_in": {"type": "number", "description": "Nominal bolt diameter in inches", "default": 0.875},
                            "gasket_outer_dia_mm": {"type": "number", "description": "Gasket outer diameter in mm", "default": 273.0},
                            "gasket_inner_dia_mm": {"type": "number", "description": "Gasket inner diameter in mm", "default": 230.0},
                            "nut_factor_k": {"type": "number", "description": "Torque friction factor K", "default": 0.17}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_api650_storage_tank_shell",
                    "description": "API 650 & API 653 oil storage tank shell sizing via 1-Foot Method, hydrostatic test thickness, and course breakdown.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "tank_diameter_m": {"type": "number", "description": "Tank nominal diameter in meters", "default": 45.0},
                            "tank_height_m": {"type": "number", "description": "Tank total shell height in meters", "default": 16.0},
                            "design_liquid_level_m": {"type": "number", "description": "Maximum design liquid height in meters", "default": 14.5},
                            "product_specific_gravity": {"type": "number", "description": "Stored product specific gravity", "default": 0.85},
                            "corrosion_allowance_mm": {"type": "number", "description": "Shell corrosion allowance in mm", "default": 1.5},
                            "allowable_stress_design_mpa": {"type": "number", "description": "Design allowable stress in MPa", "default": 160.0},
                            "allowable_stress_test_mpa": {"type": "number", "description": "Hydrotest allowable stress in MPa", "default": 171.0},
                            "joint_efficiency": {"type": "number", "description": "Weld joint efficiency factor", "default": 1.0},
                            "number_of_courses": {"type": "integer", "description": "Number of shell courses", "default": 7}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_asme_ptc4_boiler_efficiency",
                    "description": "ASME PTC 4 & API 560 fired heater / boiler thermal efficiency via heat loss method, excess air losses, and fuel savings.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "fired_duty_mw": {"type": "number", "description": "Fired heater thermal duty in MW", "default": 65.0},
                            "fuel_type": {"type": "string", "description": "Fuel gas or fuel oil type", "default": "refinery_fuel_gas"},
                            "stack_temp_c": {"type": "number", "description": "Stack exhaust temperature in Celsius", "default": 165.0},
                            "ambient_temp_c": {"type": "number", "description": "Ambient combustion air temperature in Celsius", "default": 25.0},
                            "excess_oxygen_pct": {"type": "number", "description": "Flue gas excess O2 percentage", "default": 3.5},
                            "target_excess_oxygen_pct": {"type": "number", "description": "Optimized target excess O2 percentage", "default": 2.0},
                            "combustibles_co_ppm": {"type": "number", "description": "Flue gas CO concentration in ppm", "default": 35.0},
                            "fuel_lhv_mj_kg": {"type": "number", "description": "Fuel Lower Heating Value in MJ/kg", "default": 46.5}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_tema_heat_exchanger_rating",
                    "description": "TEMA Class R shell-and-tube heat exchanger rating per Kern / Bell-Delaware: LMTD, overall U, fouling margin, and shell/tube pressure drops.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "shell_id_mm": {"type": "number", "description": "Shell internal diameter in mm", "default": 1200.0},
                            "tube_od_mm": {"type": "number", "description": "Tube outside diameter in mm", "default": 25.4},
                            "tube_wall_thk_mm": {"type": "number", "description": "Tube wall thickness in mm", "default": 2.11},
                            "tube_length_m": {"type": "number", "description": "Tube bundle length in meters", "default": 6.0},
                            "tube_count": {"type": "integer", "description": "Total tube count", "default": 680},
                            "tube_passes": {"type": "integer", "description": "Number of tube passes", "default": 4},
                            "tube_pitch_mm": {"type": "number", "description": "Tube pitch spacing in mm", "default": 31.75},
                            "baffle_cut_pct": {"type": "number", "description": "Baffle cut percentage", "default": 25.0},
                            "baffle_spacing_mm": {"type": "number", "description": "Baffle center-to-center spacing in mm", "default": 300.0},
                            "hot_fluid_flow_kg_s": {"type": "number", "description": "Hot fluid mass flow rate in kg/s", "default": 45.0},
                            "hot_fluid_t_in_c": {"type": "number", "description": "Hot fluid inlet temperature in Celsius", "default": 240.0},
                            "hot_fluid_t_out_c": {"type": "number", "description": "Hot fluid outlet temperature in Celsius", "default": 160.0},
                            "cold_fluid_flow_kg_s": {"type": "number", "description": "Cold fluid mass flow rate in kg/s", "default": 55.0},
                            "cold_fluid_t_in_c": {"type": "number", "description": "Cold fluid inlet temperature in Celsius", "default": 90.0},
                            "cold_fluid_t_out_c": {"type": "number", "description": "Cold fluid outlet temperature in Celsius", "default": 155.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_api510_vessel_remaining_life",
                    "description": "API 510 in-service pressure vessel evaluation: short-term and long-term corrosion rates, remaining life, half-life inspection interval, and MAWPr.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "tag": {"type": "string", "description": "Pressure vessel asset tag", "default": "V-301"},
                            "design_pressure_psig": {"type": "number", "description": "Design pressure in psig", "default": 350.0},
                            "design_temp_c": {"type": "number", "description": "Design temperature in Celsius", "default": 120.0},
                            "inside_diameter_in": {"type": "number", "description": "Vessel inside diameter in inches", "default": 72.0},
                            "nominal_thickness_in": {"type": "number", "description": "Original nominal thickness in inches", "default": 0.875},
                            "current_thickness_in": {"type": "number", "description": "Current measured thickness in inches", "default": 0.620},
                            "previous_thickness_in": {"type": "number", "description": "Previous inspection thickness in inches", "default": 0.680},
                            "elapsed_years_since_previous": {"type": "number", "description": "Elapsed years between inspections", "default": 3.5},
                            "installation_year": {"type": "integer", "description": "Vessel installation year", "default": 2012},
                            "current_year": {"type": "integer", "description": "Current evaluation year", "default": 2026}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_nace_mr0175_sour_service_severity",
                    "description": "NACE MR0175 / ISO 15156 H2S partial pressure, SSC severity regions 0-3, maximum hardness 22 HRC compliance, and sweet/sour corrosion risk.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "total_pressure_psia": {"type": "number", "description": "Total operating system pressure in psia", "default": 350.0},
                            "h2s_mole_pct": {"type": "number", "description": "H2S mole percentage in gas phase", "default": 2.50},
                            "co2_mole_pct": {"type": "number", "description": "CO2 mole percentage in gas phase", "default": 4.00},
                            "in_situ_ph": {"type": "number", "description": "In-situ aqueous phase pH", "default": 5.20},
                            "chloride_ppm": {"type": "number", "description": "Chloride concentration in ppm", "default": 15000.0},
                            "operating_temp_c": {"type": "number", "description": "Operating temperature in Celsius", "default": 65.0},
                            "material_grade": {"type": "string", "description": "Material specification e.g. ASTM A516 Gr 70", "default": "ASTM A516 Gr 70"},
                            "actual_hardness_hrc": {"type": "number", "description": "Measured base metal / HAZ hardness in HRC", "default": 21.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_weibull_rul_prognostics",
                    "description": "Autonomous Fault Prognostics & Remaining Useful Life (RUL) via 3-Parameter Weibull distribution and Cox Proportional Hazards Model (PHM).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "asset_tag": {"type": "string", "description": "Asset tag e.g. P-101", "default": "P-101"},
                            "operating_hours": {"type": "number", "description": "Cumulative operating hours", "default": 24500.0},
                            "beta_shape": {"type": "number", "description": "Weibull shape factor beta", "default": 2.40},
                            "eta_scale_hours": {"type": "number", "description": "Weibull scale parameter eta in hours", "default": 40000.0},
                            "vibration_deviation_pct": {"type": "number", "description": "Vibration deviation above baseline %", "default": 25.0},
                            "bearing_temp_c": {"type": "number", "description": "Measured bearing temperature in Celsius", "default": 68.4},
                            "nominal_bearing_temp_c": {"type": "number", "description": "Baseline nominal bearing temperature in Celsius", "default": 55.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_pinch_analysis_heat_network",
                    "description": "Linnhoff Pinch Analysis & Heat Exchanger Network (HEN) synthesis: minimum hot/cold utility, pinch temperature, and exergy destruction.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "delta_t_min_c": {"type": "number", "description": "Minimum approach temperature Delta T min in Celsius", "default": 10.0},
                            "operating_hours_per_year": {"type": "number", "description": "Annual operating hours", "default": 8400.0},
                            "fuel_cost_usd_per_gj": {"type": "number", "description": "Fuel gas cost in USD/GJ", "default": 6.80}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_fatigue_cumulative_damage_miner",
                    "description": "ASME Section VIII Div 2 Part 5 & BS 7608 Palmgren-Miner Cumulative Fatigue Damage ratio D and remaining fatigue life cycles.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "asset_tag": {"type": "string", "description": "Asset tag e.g. CDU-Pipe-104", "default": "CDU-Pipe-104"},
                            "material_specification": {"type": "string", "description": "Material grade", "default": "ASTM A106 Grade B Carbon Steel"},
                            "ultimate_tensile_strength_mpa": {"type": "number", "description": "Ultimate tensile strength in MPa", "default": 415.0},
                            "yield_strength_mpa": {"type": "number", "description": "Yield strength in MPa", "default": 240.0},
                            "design_life_years": {"type": "number", "description": "Design life in years", "default": 25.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_joukowsky_water_hammer_surge",
                    "description": "ASME B31.4 § 404.3.4 & Joukowsky Elastic Transient Theory: acoustic wave speed, water hammer shockwave rise, allowable surge margin, and gas bladder sizing.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "asset_tag": {"type": "string", "description": "Pipeline asset tag", "default": "PL-204"},
                            "pipe_outer_diameter_mm": {"type": "number", "description": "Outer diameter in mm", "default": 610.0},
                            "wall_thickness_mm": {"type": "number", "description": "Wall thickness in mm", "default": 14.3},
                            "pipe_length_m": {"type": "number", "description": "Pipeline length in meters", "default": 12500.0},
                            "steady_flow_velocity_m_s": {"type": "number", "description": "Steady velocity in m/s", "default": 2.40},
                            "steady_operating_pressure_bar": {"type": "number", "description": "Steady pressure in bar", "default": 38.5},
                            "pipe_design_mawp_bar": {"type": "number", "description": "Pipe design MAWP in bar", "default": 64.0},
                            "fluid_density_kg_m3": {"type": "number", "description": "Fluid density kg/m3", "default": 850.0},
                            "fluid_bulk_modulus_gpa": {"type": "number", "description": "Bulk modulus in GPa", "default": 1.50},
                            "valve_closure_time_s": {"type": "number", "description": "Valve closure time in seconds", "default": 3.5}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_iso5167_orifice_flowmeter",
                    "description": "ISO 5167-2 / AGA 3 Orifice Differential Pressure Metrology: Reader-Harris/Gallagher discharge coefficient, mass flow rate, expansibility, and permanent pressure loss.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "meter_tag": {"type": "string", "description": "Meter tag", "default": "FE-101"},
                            "pipe_internal_diameter_mm": {"type": "number", "description": "Pipe ID in mm", "default": 202.7},
                            "orifice_bore_diameter_mm": {"type": "number", "description": "Orifice bore diameter in mm", "default": 117.566},
                            "differential_pressure_mbar": {"type": "number", "description": "Differential pressure in mbar", "default": 250.0},
                            "upstream_pressure_bar_a": {"type": "number", "description": "Upstream pressure in bar absolute", "default": 28.5},
                            "fluid_density_kg_m3": {"type": "number", "description": "Fluid density in kg/m3", "default": 825.0},
                            "fluid_dynamic_viscosity_cp": {"type": "number", "description": "Viscosity in cP", "default": 1.25}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_api581_rbi_risk_matrix",
                    "description": "API 580 / API 581 Quantitative Risk-Based Inspection (RBI) 5x5 Matrix: multi-mechanism damage factor (thinning, SCC, CUI), annual POF, flammable/toxic COF, and statutory interval.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "asset_tag": {"type": "string", "description": "Asset tag", "default": "V-301"},
                            "asset_type": {"type": "string", "description": "Asset type e.g. pressure_vessel", "default": "pressure_vessel"},
                            "operating_pressure_bar": {"type": "number", "description": "Operating pressure in bar", "default": 45.0},
                            "operating_temp_c": {"type": "number", "description": "Operating temperature in °C", "default": 230.0},
                            "component_material": {"type": "string", "description": "Material", "default": "SA-387 Gr 11 Low Alloy Steel"},
                            "wall_thickness_nominal_mm": {"type": "number", "description": "Nominal thickness mm", "default": 38.0},
                            "wall_thickness_current_mm": {"type": "number", "description": "Current thickness mm", "default": 34.2},
                            "wall_thickness_minimum_req_mm": {"type": "number", "description": "Min required thickness mm", "default": 28.5},
                            "corrosion_rate_mm_year": {"type": "number", "description": "Corrosion rate mm/year", "default": 0.38},
                            "years_in_service": {"type": "number", "description": "Years in service", "default": 10.0},
                            "toxic_or_flammable_inventory_kg": {"type": "number", "description": "Inventory in kg", "default": 8500.0},
                            "h2s_content_ppm": {"type": "number", "description": "H2S content in ppm", "default": 2500.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_cryogenic_blowdown_depressurization",
                    "description": "API 521 § 5.7 Emergency Gas Depressuring & ASME Section VIII Div 1 UCS-66 MDMT brittle fracture cryogenic evaluation.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "vessel_tag": {"type": "string", "description": "Vessel tag", "default": "BDV-201"},
                            "vessel_volume_m3": {"type": "number", "description": "Volume m3", "default": 45.0},
                            "initial_pressure_bar_a": {"type": "number", "description": "Initial pressure bar absolute", "default": 85.0},
                            "initial_temp_c": {"type": "number", "description": "Initial temp C", "default": 40.0},
                            "blowdown_orifice_diameter_mm": {"type": "number", "description": "Orifice dia mm", "default": 38.0},
                            "vessel_asme_mdmt_c": {"type": "number", "description": "ASME MDMT C", "default": -29.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_rotor_dynamics_critical_speeds",
                    "description": "API 684 / API 617 Rotordynamics: critical speed separation margins, Campbell diagram harmonic interference, and misalignment diagnosis.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "machine_tag": {"type": "string", "description": "Machine tag", "default": "TG-502"},
                            "operating_speed_rpm": {"type": "number", "description": "Operating speed RPM", "default": 5400.0},
                            "first_critical_speed_rpm": {"type": "number", "description": "First critical speed RPM", "default": 2450.0},
                            "second_critical_speed_rpm": {"type": "number", "description": "Second critical speed RPM", "default": 7800.0},
                            "radial_vibration_1x_mms": {"type": "number", "description": "1X vibration mm/s", "default": 2.10},
                            "radial_vibration_2x_mms": {"type": "number", "description": "2X vibration mm/s", "default": 0.85}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_iec60079_hazardous_area_ex",
                    "description": "IEC 60079 / API RP 500 Hazardous Area Classification: Gas group MESG flameproof gap, T-class temperature threshold, and AIT thermal margin.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "tag": {"type": "string", "description": "Equipment tag", "default": "JB-101"},
                            "hazardous_zone": {"type": "string", "description": "Zone (Zone 0, 1, 2)", "default": "Zone 1"},
                            "gas_group": {"type": "string", "description": "Gas group (IIA, IIB, IIC)", "default": "IIC"},
                            "rated_temperature_class": {"type": "string", "description": "T-Class (T1-T6)", "default": "T4"},
                            "measured_max_surface_temp_c": {"type": "number", "description": "Surface temp C", "default": 118.5},
                            "flameproof_gap_measured_mm": {"type": "number", "description": "Flameproof gap mm", "default": 0.12}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_api579_crack_growth_paris_law",
                    "description": "API 579-1 / ASME FFS-1 Part 9 Linear Elastic Fracture Mechanics (LEFM): Paris-Erdogan sub-critical flaw propagation da/dN = C(ΔK)^m, critical crack depth ac, and fatigue life to catastrophic rupture.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "asset_tag": {"type": "string", "description": "Asset tag", "default": "R-401"},
                            "component_thickness_mm": {"type": "number", "description": "Component wall thickness in mm", "default": 150.0},
                            "initial_crack_depth_a0_mm": {"type": "number", "description": "Initial detected crack depth in mm", "default": 5.0},
                            "stress_range_delta_sigma_mpa": {"type": "number", "description": "Cyclic cyclic stress range in MPa", "default": 145.0},
                            "operating_cycles_per_year": {"type": "number", "description": "Thermal/pressure operational cycles per year", "default": 350.0},
                            "evaluation_years": {"type": "number", "description": "Evaluation service period in years", "default": 5.0},
                            "material_toughness_kic_mpa_sqrt_m": {"type": "number", "description": "Plane strain fracture toughness KIC in MPa*sqrt(m)", "default": 95.0},
                            "paris_c": {"type": "number", "description": "Paris material coefficient C", "default": 3.0e-12},
                            "paris_m": {"type": "number", "description": "Paris material exponent m", "default": 3.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_asme_thermal_shock_transient",
                    "description": "ASME Section VIII Div 2 Part 5 / ASME Section III NB-3200 Pressurized Thermal Shock (PTS): Biot number calculation, non-linear transient surface thermal shock stress, and 3*Sm elastic shakedown / cyclic ratcheting boundary.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "asset_tag": {"type": "string", "description": "Asset tag", "default": "PTS-101"},
                            "wall_thickness_mm": {"type": "number", "description": "Wall thickness in mm", "default": 95.0},
                            "initial_metal_temp_c": {"type": "number", "description": "Initial steady metal temperature in °C", "default": 380.0},
                            "cold_quench_fluid_temp_c": {"type": "number", "description": "Cold injection / quench temperature in °C", "default": 25.0},
                            "heat_transfer_coeff_w_m2k": {"type": "number", "description": "Surface heat transfer coefficient in W/m2K", "default": 4500.0},
                            "metal_thermal_conductivity_w_mk": {"type": "number", "description": "Thermal conductivity in W/mK", "default": 42.0},
                            "youngs_modulus_gpa": {"type": "number", "description": "Young's modulus in GPa", "default": 195.0},
                            "thermal_expansion_coeff_per_k": {"type": "number", "description": "Thermal expansion coefficient per K", "default": 1.35e-5},
                            "poisson_ratio": {"type": "number", "description": "Poisson's ratio", "default": 0.30},
                            "material_allowable_stress_sm_mpa": {"type": "number", "description": "Material allowable design stress Sm in MPa", "default": 165.0},
                            "internal_pressure_bar": {"type": "number", "description": "Internal operating pressure in bar", "default": 120.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_api2218_fireproofing_thermal_rating",
                    "description": "API 2218 (3rd Ed.) & UL 1709 Hydrocarbon Pool Fire Transient Fireproofing: 1D Fourier thermal diffusion through passive fireproofing jackets and hourly certified fire protection rating.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "asset_tag": {"type": "string", "description": "Asset tag", "default": "SK-201"},
                            "structural_element_type": {"type": "string", "description": "Structural element type", "default": "vessel_support_skirt"},
                            "fireproofing_material": {"type": "string", "description": "Fireproofing material", "default": "lightweight_cementitious"},
                            "fireproofing_thickness_mm": {"type": "number", "description": "Fireproofing jacket thickness in mm", "default": 65.0},
                            "steel_critical_failure_temp_c": {"type": "number", "description": "Critical steel structural failure temperature in °C", "default": 538.0},
                            "initial_ambient_temp_c": {"type": "number", "description": "Ambient initial temperature in °C", "default": 35.0},
                            "required_fire_endurance_hours": {"type": "number", "description": "Required endurance hours", "default": 2.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_sensor_drift_and_fdd",
                    "description": "ISO 13374 / VDI 2888 Condition Monitoring & Sensor Validation: statistical drift rate, span deviation, frozen sensor detection, and dual-channel voting agreement.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sensor_tag": {"type": "string", "description": "Sensor tag", "default": "TT-101"},
                            "asset_tag": {"type": "string", "description": "Asset tag", "default": "CDU-104"},
                            "measurement_parameter": {"type": "string", "description": "Parameter name", "default": "temperature"},
                            "calibrated_nominal": {"type": "number", "description": "Calibrated nominal value", "default": 180.0},
                            "sensor_span": {"type": "number", "description": "Full measurement span", "default": 300.0},
                            "max_allowable_drift_pct": {"type": "number", "description": "Maximum allowable drift % of span", "default": 2.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_api650_seismic_sloshing_dynamics",
                    "description": "API 650 Appendix E & ASCE 7 Seismic Sloshing & Hydrodynamic Overturning: convective wave slosh height, base shear, overturning moment, and shell compression (Elephant's foot buckling).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "tank_tag": {"type": "string", "description": "Tank asset tag", "default": "TK-101"},
                            "tank_diameter_m": {"type": "number", "description": "Tank diameter in meters", "default": 45.0},
                            "tank_height_m": {"type": "number", "description": "Tank height in meters", "default": 18.0},
                            "liquid_height_m": {"type": "number", "description": "Liquid height in meters", "default": 15.5},
                            "liquid_density_kg_m3": {"type": "number", "description": "Liquid density in kg/m3", "default": 850.0},
                            "design_pga_g": {"type": "number", "description": "Peak ground acceleration in g", "default": 0.35},
                            "site_soil_class": {"type": "string", "description": "ASCE 7 site soil class", "default": "D"},
                            "bottom_course_thickness_mm": {"type": "number", "description": "Bottom course shell thickness mm", "default": 22.0},
                            "yield_strength_mpa": {"type": "number", "description": "Steel yield strength in MPa", "default": 250.0},
                            "anchor_bolt_count": {"type": "integer", "description": "Anchor bolt count", "default": 48},
                            "anchor_bolt_diameter_mm": {"type": "number", "description": "Anchor bolt diameter in mm", "default": 42.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_hei_condenser_vacuum_performance",
                    "description": "HEI Standards for Steam Surface Condensers (12th Ed.) & ASME PTC 12.2: thermal duty, cooling water temperature rise, TTD, cleanliness factor (CF), subcooling air-leakage detection, and turbine heat rate penalty.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "condenser_tag": {"type": "string", "description": "Condenser tag", "default": "SC-101"},
                            "steam_flow_kg_s": {"type": "number", "description": "Steam flow in kg/s", "default": 85.0},
                            "exhaust_steam_enthalpy_kj_kg": {"type": "number", "description": "Exhaust steam enthalpy in kJ/kg", "default": 2380.0},
                            "condensate_temp_c": {"type": "number", "description": "Condensate temperature in °C", "default": 44.5},
                            "cooling_water_inlet_temp_c": {"type": "number", "description": "Cooling water inlet temp °C", "default": 28.0},
                            "cooling_water_flow_m3_h": {"type": "number", "description": "Cooling water flow m3/h", "default": 14500.0},
                            "tube_material": {"type": "string", "description": "Tube material", "default": "titanium_gr2"},
                            "tube_od_mm": {"type": "number", "description": "Tube OD in mm", "default": 25.4},
                            "tube_wall_thk_mm": {"type": "number", "description": "Tube wall thickness in mm", "default": 1.0},
                            "tube_count": {"type": "integer", "description": "Total tube count", "default": 6800},
                            "tube_effective_length_m": {"type": "number", "description": "Tube effective length in meters", "default": 10.5},
                            "measured_back_pressure_mbar": {"type": "number", "description": "Measured back-pressure in mbar", "default": 95.0},
                            "design_back_pressure_mbar": {"type": "number", "description": "Design back-pressure in mbar", "default": 85.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_ieee1584_arc_flash_hazard",
                    "description": "IEEE 1584-2018 / NFPA 70E Arc Flash Hazard & Electrical Safety: bolted fault arcing current, incident energy in cal/cm2, arc flash boundary, and NFPA 70E PPE category.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "equipment_tag": {"type": "string", "description": "Switchgear/MCC tag", "default": "MCC-101"},
                            "system_voltage_kv": {"type": "number", "description": "System voltage in kV", "default": 6.6},
                            "bolted_fault_current_ka": {"type": "number", "description": "Bolted fault current in kA", "default": 25.0},
                            "arcing_fault_clearing_time_s": {"type": "number", "description": "Relay clearing time in seconds", "default": 0.15},
                            "working_distance_mm": {"type": "number", "description": "Working distance in mm", "default": 914.0},
                            "electrode_configuration": {"type": "string", "description": "Electrode config e.g. VCB", "default": "VCB"}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_acid_gas_dew_point",
                    "description": "ASME PTC 4.3 / Verhoff-Banchero Flue Gas Sulfuric Acid Dew Point: acid condensation temperature, moisture dew point, and cold-end corrosion safety margin.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "heater_tag": {"type": "string", "description": "Heater tag", "default": "F-101"},
                            "fuel_sulfur_wt_pct": {"type": "number", "description": "Fuel sulfur content wt%", "default": 1.85},
                            "flue_gas_excess_o2_pct": {"type": "number", "description": "Excess O2 in flue gas %", "default": 3.2},
                            "so3_ppmv": {"type": "number", "description": "SO3 concentration in ppmv", "default": 28.5},
                            "moisture_vol_pct": {"type": "number", "description": "Moisture vol%", "default": 12.0},
                            "cold_end_metal_temp_c": {"type": "number", "description": "Cold end metal temperature °C", "default": 142.0},
                            "air_preheater_tag": {"type": "string", "description": "APH tag", "default": "APH-101"}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_multistage_compressor_train",
                    "description": "API 617 (8th Ed.) & ASME PTC 10 Multi-Stage Centrifugal Compressor Train: equal pressure ratio optimization, intercooler duties, total shaft power, and discharge temperature compliance.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "compressor_tag": {"type": "string", "description": "Compressor tag", "default": "K-101"},
                            "suction_pressure_bar": {"type": "number", "description": "Suction pressure in bar", "default": 25.0},
                            "discharge_pressure_bar": {"type": "number", "description": "Discharge pressure in bar", "default": 175.0},
                            "suction_temp_c": {"type": "number", "description": "Suction temperature in °C", "default": 40.0},
                            "mass_flow_kg_s": {"type": "number", "description": "Mass flow in kg/s", "default": 42.0},
                            "gas_molecular_weight": {"type": "number", "description": "Gas molecular weight", "default": 12.5},
                            "gas_k_ratio": {"type": "number", "description": "Gas Cp/Cv ratio", "default": 1.36},
                            "stage_count": {"type": "integer", "description": "Number of stages", "default": 3},
                            "intercooler_outlet_temp_c": {"type": "number", "description": "Intercooler outlet temp °C", "default": 45.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "generate_iec61882_hazop_matrix",
                    "description": "IEC 61882 / OSHA 1910.119 Process Hazard Analysis (PHA) & HAZOP Deviation Matrix: systematic guide words evaluation, causes, consequences, safeguards, and risk ranking.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "asset_tag": {"type": "string", "description": "Asset tag e.g. R-401, P-101", "default": "R-401"},
                            "study_node_description": {"type": "string", "description": "Optional study node description", "default": ""}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_iso13849_functional_safety_pl",
                    "description": "ISO 13849-1 / IEC 62061 Machinery Functional Safety Performance Level (PL): Architecture Categories (B, 1-4), Symmetrized MTTFd, Diagnostic Coverage (DCavg), Common Cause Failure (CCF), and SIL Claim Limit.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "safety_function_name": {"type": "string", "description": "Safety function description", "default": "High-Pressure Quench Trip Interlock"},
                            "architecture_category": {"type": "string", "description": "Category B, Category 1, 2, 3, or 4", "default": "Category 4"},
                            "mttf_d_years_channel_1": {"type": "number", "description": "Channel 1 MTTFd in years", "default": 45.0},
                            "mttf_d_years_channel_2": {"type": "number", "description": "Channel 2 MTTFd in years", "default": 45.0},
                            "dc_avg_pct": {"type": "number", "description": "Average diagnostic coverage %", "default": 99.0},
                            "common_cause_failure_score": {"type": "integer", "description": "CCF checklist points (min 65)", "default": 75},
                            "required_performance_level": {"type": "string", "description": "Target PL: PLa, PLb, PLc, PLd, or PLe", "default": "PLe"}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_api520_flare_piping_aiv",
                    "description": "API 520 Part II / API 521 / EEMUA 158 Acoustical Induced Vibration (AIV) Assessment: relief line sound power level (Lw dB), tailpipe Mach number, and high-cycle acoustic fatigue screening.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "relief_valve_tag": {"type": "string", "description": "PSV/PRV tag", "default": "PSV-101"},
                            "tailpipe_nps_in": {"type": "number", "description": "Tailpipe NPS inches", "default": 6.0},
                            "tailpipe_sch": {"type": "string", "description": "Pipe schedule e.g. Sch 40 or Sch 80", "default": "Sch 40"},
                            "relieving_mass_flow_kg_s": {"type": "number", "description": "Relieving flow rate kg/s", "default": 24.5},
                            "relieving_temp_c": {"type": "number", "description": "Relieving temperature in °C", "default": 160.0},
                            "fluid_molecular_weight": {"type": "number", "description": "Vapor molecular weight", "default": 44.1},
                            "gas_k_ratio": {"type": "number", "description": "Gas Cp/Cv ratio", "default": 1.18},
                            "upstream_relieving_pressure_bar_a": {"type": "number", "description": "Upstream relieving pressure bar a", "default": 24.5},
                            "downstream_backpressure_bar_a": {"type": "number", "description": "Tailpipe backpressure bar a", "default": 2.8}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_api670_vibration_proximity_probe",
                    "description": "API Standard 670 (5th Edition) Machinery Protection & Proximity Probe Diagnostics: DC gap voltage probe health, 2oo2 voting trip logic, orbit eccentricity, and API 617 trip limits.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "machine_tag": {"type": "string", "description": "Rotating machine tag", "default": "K-101"},
                            "probe_channel_x": {"type": "string", "description": "X probe channel tag", "default": "VT-101X"},
                            "probe_channel_y": {"type": "string", "description": "Y probe channel tag", "default": "VT-101Y"},
                            "probe_sensitivity_mv_um": {"type": "number", "description": "Probe sensitivity mV/um", "default": 7.87},
                            "gap_voltage_dc_v": {"type": "number", "description": "DC gap voltage in Volts (-9 to -11V ideal)", "default": -10.2},
                            "peak_to_peak_um_x": {"type": "number", "description": "Peak-to-peak vibration um on X", "default": 38.5},
                            "peak_to_peak_um_y": {"type": "number", "description": "Peak-to-peak vibration um on Y", "default": 42.0},
                            "phase_angle_deg_x": {"type": "number", "description": "1X phase angle deg on X", "default": 78.0},
                            "phase_angle_deg_y": {"type": "number", "description": "1X phase angle deg on Y", "default": 168.0},
                            "operating_speed_rpm": {"type": "number", "description": "Operating speed in RPM", "default": 10450.0},
                            "shaft_diameter_mm": {"type": "number", "description": "Shaft journal diameter mm", "default": 120.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_api537_flare_thermal_radiation_and_steam",
                    "description": "API 537 / ISO 25457 & API 521 § 5.7 Flare Radiation & Smokeless Steam Optimization: Brzustowski flame tilt, ground radiation contours, safe distances, and smokeless steam injection.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "flare_tag": {"type": "string", "description": "Flare tag e.g. FLARE-101", "default": "FLARE-101"},
                            "tip_diameter_m": {"type": "number", "description": "Flare tip diameter meters", "default": 1.20},
                            "flare_height_m": {"type": "number", "description": "Flare stack height meters", "default": 55.0},
                            "relief_gas_flow_kg_s": {"type": "number", "description": "Relief gas flow rate kg/s", "default": 38.0},
                            "lower_heating_value_mj_kg": {"type": "number", "description": "Gas LHV MJ/kg", "default": 46.5},
                            "gas_molecular_weight": {"type": "number", "description": "Gas molecular weight", "default": 28.5},
                            "wind_speed_m_s": {"type": "number", "description": "Ambient wind speed m/s", "default": 6.0},
                            "distance_from_base_m": {"type": "number", "description": "Observation distance from stack base m", "default": 120.0},
                            "steam_assist_enabled": {"type": "boolean", "description": "Steam assist active", "default": True},
                            "soot_index_c_to_h_ratio": {"type": "number", "description": "C/H mass ratio", "default": 0.35}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_asme_conical_reducer_transition",
                    "description": "ASME Section VIII Div 1 Appendix 1-5 / EN 13445 Conical Reducer Transition Shell: required conical thickness, half-apex angle limit (30 deg), junction reinforcement, and MAWP.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "tag": {"type": "string", "description": "Conical reducer tag", "default": "CONE-101"},
                            "design_pressure_psig": {"type": "number", "description": "Design pressure psig", "default": 250.0},
                            "design_temp_c": {"type": "number", "description": "Design temperature °C", "default": 180.0},
                            "large_diameter_in": {"type": "number", "description": "Large end internal diameter inches", "default": 72.0},
                            "small_diameter_in": {"type": "number", "description": "Small end internal diameter inches", "default": 36.0},
                            "half_apex_angle_deg": {"type": "number", "description": "Half-apex angle degrees (max 30)", "default": 25.0},
                            "corrosion_allowance_in": {"type": "number", "description": "Corrosion allowance inches", "default": 0.125},
                            "allowable_stress_psi": {"type": "number", "description": "Allowable stress psi", "default": 20000.0},
                            "joint_efficiency": {"type": "number", "description": "Weld joint efficiency E", "default": 1.0},
                            "actual_thickness_in": {"type": "number", "description": "Nominal actual thickness inches", "default": 0.625}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_iso1940_rotor_balancing_tolerance",
                    "description": "ISO 1940-1:2003 / ANSI S2.19 Rotor Dynamic Balancing & Residual Unbalance Tolerance: permissible specific unbalance (eper), per-plane unbalance limits, and trial weights.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "rotor_tag": {"type": "string", "description": "Rotor asset tag", "default": "BAL-ROTOR-101"},
                            "balance_grade": {"type": "string", "description": "ISO balance quality grade G0.4, G1.0, G2.5, G6.3, G16", "default": "G2.5"},
                            "rotor_mass_kg": {"type": "number", "description": "Total rotor mass kg", "default": 450.0},
                            "operating_speed_rpm": {"type": "number", "description": "Operating speed RPM", "default": 6000.0},
                            "balance_planes": {"type": "integer", "description": "Number of balancing planes (1 or 2)", "default": 2},
                            "plane_1_correction_radius_mm": {"type": "number", "description": "Plane 1 radius mm", "default": 140.0},
                            "plane_2_correction_radius_mm": {"type": "number", "description": "Plane 2 radius mm", "default": 140.0},
                            "measured_initial_unbalance_plane1_g_mm": {"type": "number", "description": "Measured unbalance plane 1 g*mm", "default": 85.0},
                            "measured_initial_unbalance_plane2_g_mm": {"type": "number", "description": "Measured unbalance plane 2 g*mm", "default": 92.0}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_nfpa68_explosion_venting",
                    "description": "NFPA 68:2023 Standard on Explosion Protection by Deflagration Venting: required vent area (Av), St-Class dust/gas categorization, vent duct length penalty, and recoil force.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "enclosure_tag": {"type": "string", "description": "Vessel / silo tag", "default": "SILO-VENT-101"},
                            "enclosure_volume_m3": {"type": "number", "description": "Enclosure volume m3", "default": 48.0},
                            "enclosure_length_m": {"type": "number", "description": "Enclosure length m", "default": 6.0},
                            "enclosure_hydraulic_diameter_m": {"type": "number", "description": "Hydraulic diameter m", "default": 3.2},
                            "k_st_bar_m_s": {"type": "number", "description": "Deflagration index Kst bar*m/s", "default": 150.0},
                            "p_max_bar_g": {"type": "number", "description": "Maximum deflagration pressure bar g", "default": 8.5},
                            "p_stat_bar_g": {"type": "number", "description": "Vent panel burst pressure bar g", "default": 0.10},
                            "p_red_max_bar_g": {"type": "number", "description": "Max allowable reduced pressure bar g", "default": 0.40},
                            "vent_duct_length_m": {"type": "number", "description": "Vent discharge duct length m", "default": 1.5},
                            "panel_mass_kg_m2": {"type": "number", "description": "Vent panel areal density kg/m2", "default": 5.0}
                        },
                        "required": []
                    }
                }
            }
        ]

    def get_tool_schemas(self):
        return self.tools

    def execute_tool(self, name: str, args: dict, task_id: str = "default_task") -> dict:
        
        # --- PHASE 2 OVERHAUL: Secure Sandboxed MCP Tool Execution ---
        math_tools = [
            "calculate_pipe_thickness_asme_b313",
            "calculate_asme_section_viii_vessel_thickness",
            "calculate_darcy_weisbach_pressure_drop",
            "calculate_pump_hydraulics",
            "calculate_flange_mawp_asme_b165",
            "calculate_heat_exchanger_duty",
            "diagnose_vibration_harmonics",
            "calculate_pump_cavitation_margin",
            "calculate_compressor_surge_margin",
            "calculate_control_valve_cv_isa75",
            "calculate_heat_exchanger_fouling_tema",
            "evaluate_root_cause_tree",
            "simulate_crude_distillation_mass_balance",
            "evaluate_hazop_lopa_sil",
            "calculate_api521_flare_radiation_and_dispersion",
            "calculate_turnaround_critical_path",
            "calculate_compressor_anti_surge_map",
            "calculate_steam_turbine_cogen_balance",
            "calculate_cathodic_protection_and_cui_risk",
            "calculate_cooling_tower_performance",
            "calculate_teg_dehydration_unit",
            "calculate_relief_valve_sizing",
            "calculate_api579_fitness_for_service",
            "calculate_bolted_flange_joint_integrity",
            "calculate_api650_storage_tank_shell",
            "calculate_asme_ptc4_boiler_efficiency",
            "calculate_tema_heat_exchanger_rating",
            "calculate_api510_vessel_remaining_life",
            "calculate_nace_mr0175_sour_service_severity",
            "calculate_weibull_rul_prognostics",
            "calculate_pinch_analysis_heat_network",
            "calculate_fatigue_cumulative_damage_miner",
            "calculate_joukowsky_water_hammer_surge",
            "calculate_iso5167_orifice_flowmeter",
            "calculate_api581_rbi_risk_matrix",
            "calculate_cryogenic_blowdown_depressurization",
            "calculate_rotor_dynamics_critical_speeds",
            "calculate_iec60079_hazardous_area_ex",
            "calculate_api579_crack_growth_paris_law",
            "calculate_asme_thermal_shock_transient",
            "calculate_api2218_fireproofing_thermal_rating",
            "calculate_sensor_drift_and_fdd",
            "calculate_api650_seismic_sloshing_dynamics",
            "calculate_hei_condenser_vacuum_performance",
            "calculate_ieee1584_arc_flash_hazard",
            "calculate_acid_gas_dew_point",
            "calculate_multistage_compressor_train",
            "generate_iec61882_hazop_matrix",
            "calculate_iso13849_functional_safety_pl",
            "calculate_api520_flare_piping_aiv",
            "calculate_api670_vibration_proximity_probe",
            "calculate_api537_flare_thermal_radiation_and_steam",
            "calculate_asme_conical_reducer_transition",
            "calculate_iso1940_rotor_balancing_tolerance",
            "calculate_nfpa68_explosion_venting"
        ]
        if name in math_tools:
            return mcp_client.execute_tool(name, args)


        
        if name == "python_sandbox":
            return self._run_sandbox(args.get("code", ""))
        elif name == "extract_pid_components":
            return self._extract_pid_components(args.get("file_id"), args.get("component_filter", "valves"))
        elif name == "ocr_inspect_document":
            from documents.ocr import local_ocr
            fpath = args.get("file_path") or args.get("target_file") or args.get("filename")
            prompt_ctx = args.get("prompt_context", "")
            return local_ocr.inspect_scanned_document(file_path=fpath, prompt_context=prompt_ctx)
        elif name == "generate_document":
            return self._generate_document(
                args.get("kind", "docx"),
                args.get("content", ""),
                args.get("filename", "output"),
                task_id
            )
        elif name == "read_file":
            file_ref = args.get("fileId") or args.get("file_path") or args.get("filename", "")
            base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            candidates = [
                file_ref,
                os.path.join(base, "uploads", file_ref),
                os.path.join(base, "brain", file_ref)
            ]
            for cand in candidates:
                if cand and os.path.exists(cand) and os.path.isfile(cand):
                    try:
                        with open(cand, "r", encoding="utf-8", errors="replace") as f:
                            return {"content": f.read(8000), "path": cand}
                    except Exception as e:
                        return {"error": f"Read error: {e}"}
            return {"error": f"File '{file_ref}' not found on local disk."}
        elif name == "kb_search":
            from rag.vectorstore import kb
            return {"results": kb.search(args.get("query", ""))}
        elif name == "calculate_pipe_thickness_asme_b313":
            from verification.calculator import engineering_tools
            return engineering_tools.calculate_pipe_thickness_asme_b313(
                float(args.get("pressure_psig", 0)),
                float(args.get("outer_diameter_in", 0)),
                float(args.get("stress_value_psi", 0)),
                float(args.get("joint_quality_factor", 1.0))
            )
        elif name == "calculate_vibration_deviation":
            return self._vibration_deviation(
                float(args.get("measured_mms", 0)),
                float(args.get("limit_mms", 1))
            )
        elif name == "calculate_equipment_health_score":
            return self._equipment_health_score(
                float(args.get("vibration_deviation_pct", 0)),
                float(args.get("temp_celsius", 25)),
                float(args.get("nominal_temp", 25))
            )
        elif name == "calculate_pump_hydraulics":
            from verification.calculator import engineering_tools
            return engineering_tools.calculate_pump_hydraulics(
                flow_rate_gpm=float(args.get("flow_rate_gpm", 500)),
                suction_pressure_psig=float(args.get("suction_pressure_psig", 15)),
                discharge_pressure_psig=float(args.get("discharge_pressure_psig", 120)),
                specific_gravity=float(args.get("specific_gravity", 0.85)),
                pump_efficiency=float(args.get("pump_efficiency", 0.75))
            )
        elif name == "calculate_flange_mawp_asme_b165":
            from verification.calculator import engineering_tools
            return engineering_tools.calculate_flange_mawp_asme_b165(
                flange_class=int(args.get("flange_class", 300)),
                design_temp_c=float(args.get("design_temp_c", 38)),
                material_spec=str(args.get("material_spec", "ASTM A105"))
            )
        elif name == "calculate_heat_exchanger_duty":
            from verification.calculator import engineering_tools
            return engineering_tools.calculate_heat_exchanger_duty(
                flow_rate_kg_h=float(args.get("flow_rate_kg_h", 50000)),
                temp_in_c=float(args.get("temp_in_c", 40)),
                temp_out_c=float(args.get("temp_out_c", 130)),
                specific_heat_kj_kg_c=float(args.get("specific_heat_kj_kg_c", 2.1))
            )
        elif name == "diagnose_vibration_harmonics":
            from verification.calculator import engineering_tools
            return engineering_tools.diagnose_vibration_harmonics(
                dominant_freq_hz=float(args.get("dominant_freq_hz", 50.0)),
                running_speed_rpm=float(args.get("running_speed_rpm", 3000.0)),
                peak_velocity_mms=float(args.get("peak_velocity_mms", 0.0)),
                machine_tag=str(args.get("machine_tag", "ROT-ASSET"))
            )
        elif name == "calculate_pump_cavitation_margin":
            from verification.calculator import engineering_tools
            return engineering_tools.calculate_pump_cavitation_margin(
                npsh_available_m=float(args.get("npsh_available_m", 4.5)),
                npsh_required_m=float(args.get("npsh_required_m", 3.2)),
                pump_tag=str(args.get("pump_tag", "P-301")),
                fluid_name=str(args.get("fluid_name", "Hydrocarbon liquid"))
            )
        elif name == "calculate_compressor_surge_margin":
            from verification.calculator import engineering_tools
            return engineering_tools.calculate_compressor_surge_margin(
                actual_flow_m3_h=float(args.get("actual_flow_m3_h", 12000)),
                surge_flow_m3_h=float(args.get("surge_flow_m3_h", 9500)),
                compressor_tag=str(args.get("compressor_tag", "K-301"))
            )
        elif name == "calculate_control_valve_cv_isa75":
            from verification.calculator import engineering_tools
            return engineering_tools.calculate_control_valve_cv_isa75(
                flow_rate_gpm=float(args.get("flow_rate_gpm", 450)),
                delta_p_psi=float(args.get("delta_p_psi", 25)),
                specific_gravity=float(args.get("specific_gravity", 0.85)),
                valve_tag=str(args.get("valve_tag", "FV-301")),
                nominal_valve_size_in=float(args.get("nominal_valve_size_in", 3.0))
            )
        elif name == "calculate_heat_exchanger_fouling_tema":
            from verification.calculator import engineering_tools
            return engineering_tools.calculate_heat_exchanger_fouling_tema(
                heat_duty_kw=float(args.get("heat_duty_kw", 2500)),
                surface_area_m2=float(args.get("surface_area_m2", 120)),
                lmtd_c=float(args.get("lmtd_c", 35)),
                clean_u_w_m2k=float(args.get("clean_u_w_m2k", 850)),
                exchanger_tag=str(args.get("exchanger_tag", "E-101"))
            )
        else:
            return {"error": f"Unknown tool: {name}"}

    def _vibration_deviation(self, measured: float, limit: float) -> dict:
        """Deterministic vibration deviation calculation — no LLM involved."""
        if limit <= 0:
            return {"error": "Limit must be greater than 0"}
        deviation_pct = ((measured - limit) / limit) * 100.0
        if deviation_pct < 0:
            status = "NORMAL"
            recommendation = "Equipment operating within acceptable limits. Continue routine monitoring."
        elif deviation_pct < 20:
            status = "ATTENTION"
            recommendation = "Slight deviation detected. Increase monitoring frequency."
        elif deviation_pct < 60:
            status = "HIGH"
            recommendation = "Significant deviation. Engineering review required before next shift."
        else:
            status = "CRITICAL"
            recommendation = "CRITICAL: Immediate engineering inspection required. Consider shutdown."
        return {
            "measured_mms": measured,
            "limit_mms": limit,
            "deviation_percent": round(deviation_pct, 2),
            "status": status,
            "recommendation": recommendation,
            "formula": "((measured - limit) / limit) * 100",
            "verified": True
        }

    def _equipment_health_score(self, vibration_deviation_pct: float,
                                 temp_celsius: float, nominal_temp: float) -> dict:
        """Deterministic equipment health score calculation."""
        # Base score starts at 100
        score = 100.0

        # Vibration penalty (up to 50 points)
        vib_penalty = min(abs(vibration_deviation_pct) / 2, 50)
        score -= vib_penalty

        # Temperature penalty (up to 30 points)
        temp_deviation_pct = ((temp_celsius - nominal_temp) / max(nominal_temp, 1)) * 100
        temp_penalty = min(max(temp_deviation_pct, 0) / 2, 30)
        score -= temp_penalty

        score = max(0, round(score))

        if score >= 80:
            risk_level = "LOW"
            action = "Continue normal operations and routine monitoring."
        elif score >= 60:
            risk_level = "MEDIUM"
            action = "Schedule preventive maintenance within 30 days."
        elif score >= 40:
            risk_level = "HIGH"
            action = "Engineering review required. Schedule maintenance within 7 days."
        else:
            risk_level = "CRITICAL"
            action = "Immediate inspection required. Consider temporary shutdown."

        return {
            "health_score": score,
            "risk_level": risk_level,
            "action": action,
            "vibration_penalty": round(vib_penalty, 2),
            "temperature_penalty": round(temp_penalty, 2),
            "verified": True
        }

    def _run_sandbox(self, code: str) -> dict:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
            f.write(code)
            temp_path = f.name

        try:
            result = subprocess.run(
                [sys.executable, temp_path],
                capture_output=True,
                text=True,
                timeout=10
            )
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {"error": "Execution timed out."}
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def _generate_document(self, kind: str, content: str, filename: str, task_id: str) -> dict:
        dir_path = os.path.join("brain", task_id, "artifacts")
        os.makedirs(dir_path, exist_ok=True)
        file_path = f"{dir_path}/{filename}.{kind}"

        try:
            if kind == "docx":
                doc = Document()
                doc.add_heading(filename, 0)
                for line in content.split("\n"):
                    doc.add_paragraph(line)
                doc.save(file_path)
            elif kind == "xlsx":
                wb = Workbook()
                ws = wb.active
                ws.title = filename[:31]
                for row_idx, line in enumerate(content.split('\n'), 1):
                    for col_idx, cell_value in enumerate(line.split(','), 1):
                        ws.cell(row=row_idx, column=col_idx, value=cell_value.strip())
                wb.save(file_path)
            elif kind == "pptx":
                from pptx import Presentation
                prs = Presentation()
                title_slide_layout = prs.slide_layouts[0]
                slide = prs.slides.add_slide(title_slide_layout)
                slide.shapes.title.text = filename.replace("_", " ")
                slide.placeholders[1].text = "INDRA Sovereign AI Engineering Presentation\nAir-Gapped Autonomous Technical Analysis"

                bullet_slide_layout = prs.slide_layouts[1]
                slide2 = prs.slides.add_slide(bullet_slide_layout)
                slide2.shapes.title.text = "Engineering Findings & Compliance"
                tf = slide2.placeholders[1].text_frame
                for line in content.split("\n")[:8]:
                    clean = line.strip()
                    if clean and not clean.startswith("="):
                        p = tf.add_paragraph()
                        p.text = clean
                        p.level = 0
                prs.save(file_path)
            else:
                return {"error": f"Unsupported document kind '{kind}'. Use 'docx', 'xlsx', or 'pptx'."}

            return {"success": True, "file_path": file_path, "url": f"/files/{task_id}/artifacts/{filename}.{kind}"}
        except Exception as e:
            return {"error": str(e)}

    def _extract_pid_components(self, target_file: str = None, component_filter: str = "valves") -> dict:
        """
        Extracts valves, instrumentation tags, and equipment lines from uploaded P&IDs,
        drawings, or documents according to ISA-5.1 standards.
        """
        import re
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        uploads_dir = os.path.join(base_dir, "uploads")
        
        if not target_file or target_file in ("drawing-cdu2-pid", "CDU-104", "CDU-Pipe-104", "all"):
            default_spec = os.path.join(uploads_dir, "PID-001_Heat_Exchanger_Unit_Spec.txt")
            if os.path.exists(default_spec):
                target_file = "PID-001_Heat_Exchanger_Unit_Spec.txt"

        if not target_file:
            return {
                "status": "awaiting_upload",
                "message": "No P&ID drawing or line schedule currently attached to this task. Upload your blueprint (PDF, PNG, JPG) or process line schedule using the 'Upload Doc' button to execute automated ANSI/ISA-5.1 entity extraction.",
                "supported_formats": ["PDF (Vector & Raster Blueprints)", "PNG / JPG / TIFF (Engineering Drawings)", "CSV / TXT (Line Schedules)"],
                "isa_standard": "ANSI/ISA-5.1-2009 Instrumentation Symbols and Identification",
                "verified": True
            }

        candidates = [
            os.path.join(uploads_dir, target_file),
            target_file
        ]
        if os.path.exists(uploads_dir):
            for fname in os.listdir(uploads_dir):
                if target_file in fname:
                    candidates.append(os.path.join(uploads_dir, fname))
                
        extracted_text = ""
        analyzed_file = None
        
        for cand in candidates:
            if os.path.exists(cand) and os.path.isfile(cand):
                analyzed_file = os.path.basename(cand)
                try:
                    if cand.lower().endswith(".pdf"):
                        import fitz
                        doc = fitz.open(cand)
                        for page in doc:
                            extracted_text += page.get_text() + "\n"
                    elif cand.lower().endswith((".png", ".jpg", ".jpeg", ".tiff", ".bmp")):
                        try:
                            import pytesseract
                            from PIL import Image
                            img = Image.open(cand)
                            extracted_text += pytesseract.image_to_string(img) + "\n"
                        except Exception:
                            extracted_text += f"[P&ID Graphic {analyzed_file} ingested]\n"
                    else:
                        with open(cand, "r", encoding="utf-8", errors="replace") as f:
                            extracted_text += f.read() + "\n"
                except Exception:
                    pass
                if extracted_text.strip():
                    break
                    
        valves = []
        if extracted_text:
            valve_pattern = r'\b(FV|FCV|TV|TCV|PV|PCV|LV|LCV|XV|HV|ESDV|BDV|PRV|PSV|MOV|CV|V)-([0-9]{3,4}[A-Z]?)\b'
            matches = re.findall(valve_pattern, extracted_text, re.IGNORECASE)
            seen = set()
            for prefix, num in matches:
                tag = f"{prefix.upper()}-{num.upper()}"
                if tag not in seen:
                    seen.add(tag)
                    valves.append({
                        "tag": tag,
                        "type": self._classify_valve(prefix),
                        "standard": "ASME B16.34 / API 600",
                        "status": "IDENTIFIED"
                    })
                    
        if not valves and not analyzed_file:
            return {
                "status": "awaiting_upload",
                "message": "No P&ID drawing currently attached. Upload your P&ID file (PDF, PNG, JPG, or text schedule) using the 'Upload Doc' button.",
                "supported_formats": ["PDF (Vector & Raster)", "PNG / JPG (P&ID Drawings)", "CSV / TXT (Line Schedules)"],
                "isa_standard": "ANSI/ISA-5.1-2009 Instrumentation Symbols and Identification",
                "verified": True
            }
            
        return {
            "status": "success",
            "source_file": analyzed_file or "Uploaded Document",
            "total_valves_extracted": len(valves),
            "valves": valves,
            "isa_standard": "ANSI/ISA-5.1-2009",
            "verified": True
        }

    @staticmethod
    def _classify_valve(prefix: str) -> str:
        p = prefix.upper()
        if p in ("FV", "FCV"): return "Flow Control Valve (Pneumatic Actuator, Fail-Closed)"
        if p in ("TV", "TCV"): return "Temperature Control Valve (Pneumatic Actuator, Fail-Closed)"
        if p in ("PV", "PCV"): return "Pressure Control Valve (Self-Operated / Diaphragm)"
        if p in ("LV", "LCV"): return "Level Control Valve"
        if p in ("ESDV", "BDV"): return "Emergency Shutdown / Blowdown Valve (Fail-Closed SIL-3)"
        if p in ("PSV", "PRV"): return "Pressure Safety Relief Valve (API 520/526)"
        if p in ("MOV",): return "Motor-Operated Isolation Valve"
        if p in ("HV", "XV"): return "Manual Hand / On-Off Isolation Valve"
        return "Process Isolation Valve"


tool_registry = ToolRegistry()
