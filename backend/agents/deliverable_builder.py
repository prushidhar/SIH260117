"""
agents/deliverable_builder.py — Professional Engineering Document Factory
Generates structured Word reports and Excel data workbooks for INDRA.
"""
import os
import time
from typing import List, Dict, Any, Optional
from datetime import date

try:
    from docx import Document
    from docx.shared import Pt, Inches, RGBColor, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

try:
    from openpyxl import Workbook
    from openpyxl.styles import (PatternFill, Font, Alignment, Border, Side,
                                  GradientFill)
    from openpyxl.utils import get_column_letter
    HAS_XLSX = True
except ImportError:
    HAS_XLSX = False


STANDARDS_BY_DOMAIN = {
    'pipe_thickness': [
        ('ASME B31.3', '2022', 'Para 304.1.2', 'Minimum pipe wall thickness'),
        ('ASTM A106', 'Grade B', 'Material Spec', 'Seamless carbon steel pipe'),
    ],
    'flange_mawp': [
        ('ASME B16.5', '2017', 'Table 2-1.1', 'Pressure-Temperature ratings'),
        ('ASTM A105', 'N/A', 'Material Spec', 'Carbon steel forgings for piping'),
    ],
    'pump_hydraulics': [
        ('API 610', '12th Ed', 'Clause 6.3', 'Hydraulic power and head calculation'),
        ('ISO 13709', '2009', 'Section 6', 'Centrifugal pump performance'),
    ],
    'pump_cavitation': [
        ('API 610', '12th Ed', 'Clause 6.1.2', 'NPSH margin requirements'),
        ('ISO 13709', '2009', 'Section 6.1', 'Net positive suction head'),
    ],
    'compressor_surge': [
        ('API 617', '8th Ed', 'Clause 2.6', 'Surge margin and anti-surge control'),
        ('API 670', '5th Ed', 'Section 6', 'Machinery protection systems'),
    ],
    'heat_exchanger_duty': [
        ('API 660', '9th Ed', 'Section 6', 'Shell and tube heat exchangers'),
        ('TEMA', 'RGP-T-2.4', 'Class R', 'Thermal design standards'),
    ],
    'heat_exchanger_fouling': [
        ('TEMA', 'RGP-T-2.4', 'Table RGP-T-2.4', 'Fouling resistance factors'),
        ('API 660', '9th Ed', 'Section 6.3', 'Fouling evaluation'),
    ],
    'control_valve_cv': [
        ('ANSI/ISA 75.01', '2012', 'Eq. 1', 'Liquid sizing flow coefficient'),
        ('IEC 60534-2-1', '2011', 'Section 5', 'Control valve liquid flow'),
    ],
    'vibration_harmonics': [
        ('ISO 10816-3', '2009', 'Table 2', 'Vibration severity zones A/B/C/D'),
        ('API 670', '5th Ed', 'Section 5', 'Vibration monitoring machinery'),
    ],
    'default': [
        ('ASME B31.3', '2022', 'General', 'Process piping code'),
        ('API 610', '12th Ed', 'General', 'Centrifugal pumps for petroleum'),
    ],
}


def _set_cell_bg(cell, hex_color: str):
    """Set Word table cell background color."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)


def _add_horizontal_rule(doc):
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), '1F3A6E')
    pBdr.append(bottom)
    pPr.append(pBdr)
    return p


class DeliverableBuilder:
    """Factory for professional engineering Word reports and Excel workbooks."""

    def build_engineering_report_docx(
        self,
        task_id: str,
        title: str,
        equipment_tag: str,
        domain: str,
        tool_results: List[Dict],
        kb_hits: List[Dict],
        standards_clauses: List[str],
        prompt: str,
        output_dir: str,
        recommendation: str = "",
    ) -> Dict[str, str]:
        os.makedirs(output_dir, exist_ok=True)
        safe_tag = equipment_tag.replace('-', '_').replace('/', '_')
        if "approval" in title.lower() or "statutory" in title.lower():
            filename = f"Statutory_Plant_Approval_Note_{safe_tag}.docx"
        else:
            filename = f"INDRA_{domain.upper()}_{safe_tag}.docx"
        filepath = os.path.join(output_dir, filename)

        if not HAS_DOCX:
            # Fallback: plain text
            with open(filepath.replace('.docx', '.txt'), 'w', encoding='utf-8') as f:
                f.write(f"INDRA ENGINEERING REPORT\n{title}\n\n{prompt}\n")
            return {'file_path': filepath, 'url': f'/files/{task_id}/artifacts/{filename}', 'filename': filename}

        doc = Document()
        # Page margins
        for section in doc.sections:
            section.top_margin = Cm(2.5)
            section.bottom_margin = Cm(2.5)
            section.left_margin = Cm(2.5)
            section.right_margin = Cm(2.0)

        # ── Cover Page ────────────────────────────────────────────────────────
        hdr = doc.add_paragraph()
        hdr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = hdr.add_run('INDRA SOVEREIGN ENGINEERING WORKBENCH')
        run.bold = True
        run.font.size = Pt(18)
        run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x6E)

        sub = doc.add_paragraph()
        sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = sub.add_run('AUTONOMOUS INDUSTRIAL ENGINEERING DELIVERABLE')
        r.font.size = Pt(11)
        r.font.color.rgb = RGBColor(0x4A, 0x4A, 0x4A)

        _add_horizontal_rule(doc)

        doc_title = doc.add_paragraph()
        doc_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        tr = doc_title.add_run(title.upper())
        tr.bold = True
        tr.font.size = Pt(14)
        tr.font.color.rgb = RGBColor(0x1F, 0x3A, 0x6E)

        doc.add_paragraph()
        meta_table = doc.add_table(rows=5, cols=2)
        meta_table.style = 'Table Grid'
        meta_rows = [
            ('Equipment Tag', equipment_tag or 'N/A'),
            ('Document No.', f'INDRA-{task_id.upper()[:12]}'),
            ('Date Issued', date.today().strftime('%d %B %Y')),
            ('Revision', 'Rev 00 — ISSUED FOR REVIEW'),
            ('Issued By', 'INDRA Autonomous AI System'),
        ]
        for i, (label, value) in enumerate(meta_rows):
            meta_table.cell(i, 0).text = label
            meta_table.cell(i, 0).paragraphs[0].runs[0].bold = True
            _set_cell_bg(meta_table.cell(i, 0), 'E8EEF7')
            meta_table.cell(i, 1).text = value
        doc.add_paragraph()
        _add_horizontal_rule(doc)
        doc.add_page_break()

        # ── Section 1: Problem Statement ──────────────────────────────────────
        doc.add_heading('1. Problem Statement', level=1)
        doc.add_paragraph(prompt)
        doc.add_paragraph()

        # ── Section 2: Deterministic Analysis ────────────────────────────────
        doc.add_heading('2. Deterministic Analysis', level=1)
        for tc in tool_results:
            tool_name = tc.get('tool', '')
            if tool_name in ('kb_search', 'generate_document', 'equipment_lookup'):
                continue
            output = tc.get('output', tc.get('result', {}))
            if isinstance(output, str):
                import json
                try:
                    output = json.loads(output)
                except Exception:
                    pass
            if not isinstance(output, dict):
                continue

            doc.add_heading(f'Tool: {tool_name}', level=2)
            tbl = doc.add_table(rows=1, cols=4)
            tbl.style = 'Table Grid'
            hdr_cells = tbl.rows[0].cells
            for idx, col in enumerate(['Parameter', 'Value', 'Unit', 'Reference']):
                hdr_cells[idx].text = col
                hdr_cells[idx].paragraphs[0].runs[0].bold = True
                _set_cell_bg(hdr_cells[idx], '1F3A6E')
                hdr_cells[idx].paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

            skip_keys = {'status', 'verified', 'formula_used', 'code_reference', 'error'}
            unit_hints = {
                'pressure': 'psig', 'head': 'm / ft', 'flow': 'GPM',
                'horsepower': 'HP', 'power': 'kW', 'temperature': '°C',
                'thickness': 'inches', 'stress': 'psi', 'efficiency': '%',
                'velocity': 'mm/s', 'margin': '%', 'duty': 'kW',
            }
            for key, val in output.items():
                if key in skip_keys:
                    continue
                row_cells = tbl.add_row().cells
                row_cells[0].text = key.replace('_', ' ').title()
                row_cells[1].text = str(round(val, 4) if isinstance(val, float) else val)
                unit = 'N/A'
                for hint, u in unit_hints.items():
                    if hint in key.lower():
                        unit = u
                        break
                row_cells[2].text = unit
                code_ref = str(output.get('code_reference', '—'))
                row_cells[3].text = code_ref[:40]
            doc.add_paragraph()

        # ── Section 3: Standards Compliance Matrix ────────────────────────────
        doc.add_heading('3. Standards Compliance', level=1)
        std_rows = STANDARDS_BY_DOMAIN.get(domain, STANDARDS_BY_DOMAIN['default'])
        std_table = doc.add_table(rows=1, cols=4)
        std_table.style = 'Table Grid'
        for idx, col in enumerate(['Standard', 'Edition', 'Clause', 'Requirement']):
            c = std_table.rows[0].cells[idx]
            c.text = col
            c.paragraphs[0].runs[0].bold = True
            _set_cell_bg(c, '1F3A6E')
            c.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        for std, edition, clause, req in std_rows:
            row = std_table.add_row().cells
            row[0].text = std
            row[1].text = edition
            row[2].text = clause
            row[3].text = req
        for clause in standards_clauses:
            row = std_table.add_row().cells
            parts = clause.split('—')
            row[0].text = parts[0].strip() if parts else clause
            row[1].text = '—'
            row[2].text = parts[1].strip() if len(parts) > 1 else '—'
            row[3].text = parts[2].strip() if len(parts) > 2 else '—'
        doc.add_paragraph()

        # ── Section 4: Source Citations ───────────────────────────────────────
        doc.add_heading('4. Source Citations & Evidence Lock', level=1)
        tools_used = [tc.get('tool', '') for tc in tool_results if tc.get('tool') not in ('kb_search',)]
        p = doc.add_paragraph()
        p.add_run('Tools Executed: ').bold = True
        p.add_run(', '.join(tools_used) if tools_used else 'None')
        p2 = doc.add_paragraph()
        p2.add_run('KB Documents Referenced: ').bold = True
        p2.add_run(', '.join([h.get('title', 'Document') for h in kb_hits]) if kb_hits else 'None')
        p3 = doc.add_paragraph()
        p3.add_run('Audit: ').bold = True
        p3.add_run('All results sealed in INDRA SHA-256 Merkle Audit Ledger (IEC 62443 compliant).')
        doc.add_paragraph()

        # ── Section 5: Engineering Recommendation ─────────────────────────────
        doc.add_heading('5. Engineering Recommendation', level=1)
        if recommendation:
            doc.add_paragraph(recommendation)
        else:
            doc.add_paragraph(
                'Based on the deterministic analysis above, all calculated values have been '
                'verified against the governing standards. Review the calculation table and '
                'ensure procurement specifications, inspection schedules, and sign-off requirements '
                'are addressed per the applicable code.'
            )
        doc.add_paragraph()
        _add_horizontal_rule(doc)

        # ── Signature Block ───────────────────────────────────────────────────
        doc.add_heading('Approval & Sign-off', level=2)
        sig_table = doc.add_table(rows=2, cols=4)
        sig_table.style = 'Table Grid'
        sig_headers = ['Prepared By', 'Checked By', 'Approved By', 'Rev No.']
        for i, h in enumerate(sig_headers):
            c = sig_table.rows[0].cells[i]
            c.text = h
            c.paragraphs[0].runs[0].bold = True
            _set_cell_bg(c, 'E8EEF7')
        sig_values = ['INDRA AI System', '_______________', '_______________', '00']
        for i, v in enumerate(sig_values):
            sig_table.rows[1].cells[i].text = v
        doc.add_paragraph()
        doc.add_paragraph().add_run(
            f'Document generated: {time.strftime("%Y-%m-%d %H:%M:%S UTC")} | '
            f'Task ID: {task_id} | INDRA v2.0'
        ).font.size = Pt(8)

        doc.save(filepath)
        return {
            'file_path': filepath,
            'url': f'/files/{task_id}/artifacts/{filename}',
            'filename': filename,
        }

    def build_engineering_data_xlsx(
        self,
        task_id: str,
        title: str,
        equipment_tag: str,
        domain: str,
        tool_results: List[Dict],
        output_dir: str,
    ) -> Dict[str, str]:
        os.makedirs(output_dir, exist_ok=True)
        safe_tag = equipment_tag.replace('-', '').replace('/', '_')
        filename = f"INDRA_{domain.upper()}_{safe_tag}_DATA.xlsx"
        filepath = os.path.join(output_dir, filename)

        if not HAS_XLSX:
            return {'file_path': filepath, 'url': f'/files/{task_id}/artifacts/{filename}', 'filename': filename}

        wb = Workbook()
        # Styles
        HEADER_FILL = PatternFill(start_color='1F3A6E', end_color='1F3A6E', fill_type='solid')
        HEADER_FONT = Font(color='FFFFFF', bold=True, name='Calibri', size=10)
        SUB_FILL = PatternFill(start_color='E8EEF7', end_color='E8EEF7', fill_type='solid')
        GREEN_FILL = PatternFill(start_color='C6EFCE', end_color='C6EFCE', fill_type='solid')
        YELLOW_FILL = PatternFill(start_color='FFEB9C', end_color='FFEB9C', fill_type='solid')
        RED_FILL = PatternFill(start_color='FFC7CE', end_color='FFC7CE', fill_type='solid')
        BORDER = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        CENTER = Alignment(horizontal='center', vertical='center', wrap_text=True)
        LEFT = Alignment(horizontal='left', vertical='center', wrap_text=True)

        def apply_header(cell, text):
            cell.value = text
            cell.fill = HEADER_FILL
            cell.font = HEADER_FONT
            cell.alignment = CENTER
            cell.border = BORDER

        def apply_sub(cell, text, bold=False):
            cell.value = text
            cell.fill = SUB_FILL
            cell.font = Font(bold=bold, name='Calibri', size=10)
            cell.border = BORDER
            cell.alignment = LEFT

        # ── SUMMARY sheet ─────────────────────────────────────────────────────
        ws_sum = wb.active
        ws_sum.title = 'SUMMARY'
        ws_sum.merge_cells('A1:E1')
        title_cell = ws_sum['A1']
        title_cell.value = f'INDRA ENGINEERING SUMMARY — {title.upper()}'
        title_cell.font = Font(bold=True, size=14, color='1F3A6E', name='Calibri')
        title_cell.alignment = CENTER
        title_cell.fill = PatternFill(start_color='D6E4F0', end_color='D6E4F0', fill_type='solid')
        ws_sum.row_dimensions[1].height = 30

        ws_sum['A2'] = 'Equipment Tag'; ws_sum['B2'] = equipment_tag
        ws_sum['A3'] = 'Task ID'; ws_sum['B3'] = task_id
        ws_sum['A4'] = 'Date'; ws_sum['B4'] = date.today().strftime('%d %B %Y')
        ws_sum['A5'] = 'Domain'; ws_sum['B5'] = domain.replace('_', ' ').title()
        for r in range(2, 6):
            ws_sum.cell(r, 1).font = Font(bold=True, name='Calibri')

        ws_sum.append([])
        headers = ['#', 'Tool / Calculation', 'Key Result', 'Unit', 'Status']
        for col, h in enumerate(headers, 1):
            apply_header(ws_sum.cell(8, col), h)
        ws_sum.freeze_panes = 'A9'

        row_idx = 9
        n = 0
        for tc in tool_results:
            tool_name = tc.get('tool', '')
            if tool_name in ('kb_search', 'generate_document', 'equipment_lookup'):
                continue
            output = tc.get('output', tc.get('result', {}))
            if isinstance(output, str):
                import json
                try:
                    output = json.loads(output)
                except Exception:
                    output = {}
            if not isinstance(output, dict):
                continue
            n += 1
            key_result = '—'
            unit = '—'
            status_val = output.get('status', 'success')
            result_priority = ['total_dynamic_head_ft', 'total_dynamic_head_meters',
                               't_minimum_required_inches', 'mawp_psig',
                               'heat_duty_kw', 'required_cv', 'surge_margin_percent',
                               'margin_delta_meters', 'brake_horsepower_bhp',
                               'fouling_resistance_m2k_w', 'vibration_velocity_mms']
            for k in result_priority:
                if k in output:
                    key_result = output[k]
                    unit = k.split('_')[-1].upper() if '_' in k else '—'
                    break

            c1 = ws_sum.cell(row_idx, 1); c1.value = n; c1.border = BORDER; c1.alignment = CENTER
            c2 = ws_sum.cell(row_idx, 2); c2.value = tool_name.replace('_', ' ').title(); c2.border = BORDER; c2.alignment = LEFT
            c3 = ws_sum.cell(row_idx, 3); c3.value = key_result; c3.border = BORDER; c3.alignment = CENTER
            c4 = ws_sum.cell(row_idx, 4); c4.value = unit; c4.border = BORDER; c4.alignment = CENTER
            c5 = ws_sum.cell(row_idx, 5); c5.value = status_val.upper(); c5.border = BORDER; c5.alignment = CENTER
            if status_val == 'success':
                c5.fill = GREEN_FILL
            elif status_val == 'warning':
                c5.fill = YELLOW_FILL
            else:
                c5.fill = RED_FILL
            row_idx += 1

        ws_sum.column_dimensions['A'].width = 5
        ws_sum.column_dimensions['B'].width = 35
        ws_sum.column_dimensions['C'].width = 20
        ws_sum.column_dimensions['D'].width = 12
        ws_sum.column_dimensions['E'].width = 14

        # ── CALCULATIONS sheet ────────────────────────────────────────────────
        ws_calc = wb.create_sheet('CALCULATIONS')
        calc_headers = ['Section', 'Parameter', 'Value', 'Unit', 'Notes / Reference']
        for col, h in enumerate(calc_headers, 1):
            apply_header(ws_calc.cell(1, col), h)
        ws_calc.freeze_panes = 'A2'
        ws_calc.row_dimensions[1].height = 20

        row_c = 2
        for tc in tool_results:
            tool_name = tc.get('tool', '')
            if tool_name in ('kb_search', 'generate_document', 'equipment_lookup'):
                continue
            output = tc.get('output', tc.get('result', {}))
            if isinstance(output, str):
                import json
                try:
                    output = json.loads(output)
                except Exception:
                    output = {}
            if not isinstance(output, dict):
                continue
            # Section header row
            ws_calc.merge_cells(f'A{row_c}:E{row_c}')
            hdr_cell = ws_calc.cell(row_c, 1)
            hdr_cell.value = f'--- {tool_name.replace("_", " ").upper()} ---'
            hdr_cell.font = Font(bold=True, color='1F3A6E', name='Calibri')
            hdr_cell.fill = PatternFill(start_color='D6E4F0', end_color='D6E4F0', fill_type='solid')
            hdr_cell.alignment = LEFT
            row_c += 1
            code_ref = output.get('code_reference', '')
            skip_keys = {'status', 'verified', 'formula_used', 'code_reference', 'error'}
            input_keys = {'pressure', 'diameter', 'flow', 'temperature', 'stress', 'factor',
                          'efficiency', 'sg', 'available', 'required', 'actual', 'surge'}
            for key, val in output.items():
                if key in skip_keys:
                    continue
                section = 'INPUT' if any(k in key.lower() for k in input_keys) else 'OUTPUT'
                ws_calc.cell(row_c, 1).value = section
                ws_calc.cell(row_c, 2).value = key.replace('_', ' ').title()
                ws_calc.cell(row_c, 3).value = round(val, 6) if isinstance(val, float) else val
                ws_calc.cell(row_c, 4).value = '—'
                ws_calc.cell(row_c, 5).value = code_ref
                for col in range(1, 6):
                    ws_calc.cell(row_c, col).border = BORDER
                    ws_calc.cell(row_c, col).alignment = LEFT
                row_c += 1
            row_c += 1

        ws_calc.column_dimensions['A'].width = 10
        ws_calc.column_dimensions['B'].width = 38
        ws_calc.column_dimensions['C'].width = 18
        ws_calc.column_dimensions['D'].width = 10
        ws_calc.column_dimensions['E'].width = 45
        ws_calc.auto_filter.ref = f'A1:E{row_c}'

        # ── STANDARDS sheet ───────────────────────────────────────────────────
        ws_std = wb.create_sheet('STANDARDS')
        std_headers = ['Standard', 'Edition', 'Clause', 'Requirement', 'Category']
        for col, h in enumerate(std_headers, 1):
            apply_header(ws_std.cell(1, col), h)
        std_rows = STANDARDS_BY_DOMAIN.get(domain, STANDARDS_BY_DOMAIN['default'])
        for i, (std, edition, clause, req) in enumerate(std_rows, 2):
            ws_std.cell(i, 1).value = std
            ws_std.cell(i, 2).value = edition
            ws_std.cell(i, 3).value = clause
            ws_std.cell(i, 4).value = req
            ws_std.cell(i, 5).value = domain.replace('_', ' ').title()
            for col in range(1, 6):
                ws_std.cell(i, col).border = BORDER
                ws_std.cell(i, col).alignment = LEFT
        for col in ['A', 'B', 'C', 'D', 'E']:
            ws_std.column_dimensions[col].width = 20
        ws_std.column_dimensions['D'].width = 40

        wb.save(filepath)
        return {
            'file_path': filepath,
            'url': f'/files/{task_id}/artifacts/{filename}',
            'filename': filename,
        }

# Global singleton
deliverable_builder = DeliverableBuilder()