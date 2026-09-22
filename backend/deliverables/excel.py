"""
Excel Report Generator for INDRA
Generates structured equipment analysis spreadsheets using openpyxl.
"""
import os
from datetime import datetime

class ExcelGenerator:
    def create_equipment_report(self, data: dict, output_path: str) -> str:
        """
        Creates an equipment analysis spreadsheet.
        data keys: equipment_tag, parameters (list of dicts with name, measured, limit, status)
        """
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

        wb = Workbook()
        ws = wb.active
        ws.title = "Equipment Analysis"

        # Colors
        header_fill = PatternFill(start_color="1F3864", end_color="1F3864", fill_type="solid")
        red_fill = PatternFill(start_color="FF9999", end_color="FF9999", fill_type="solid")
        green_fill = PatternFill(start_color="99FF99", end_color="99FF99", fill_type="solid")
        white_font = Font(color="FFFFFF", bold=True)

        # Title
        ws.merge_cells("A1:F1")
        ws["A1"] = f"Industrial Equipment Analysis — {data.get('equipment_tag', 'Unknown')} — {datetime.now().strftime('%d %b %Y')}"
        ws["A1"].font = Font(bold=True, size=14)
        ws["A1"].alignment = Alignment(horizontal="center")

        # Headers
        headers = ["Parameter", "Measured Value", "Operating Limit", "Unit", "Deviation (%)", "Status"]
        for col, h in enumerate(headers, 1):
            cell = ws.cell(row=3, column=col, value=h)
            cell.font = white_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        # Data rows
        parameters = data.get("parameters", [])
        for row_idx, param in enumerate(parameters, 4):
            ws.cell(row=row_idx, column=1, value=param.get("name", ""))
            ws.cell(row=row_idx, column=2, value=param.get("measured", ""))
            ws.cell(row=row_idx, column=3, value=param.get("limit", ""))
            ws.cell(row=row_idx, column=4, value=param.get("unit", ""))
            ws.cell(row=row_idx, column=5, value=param.get("deviation_pct", ""))
            status_cell = ws.cell(row=row_idx, column=6, value=param.get("status", ""))
            if param.get("status", "").upper() in ["HIGH", "CRITICAL", "EXCEEDED"]:
                status_cell.fill = red_fill
            elif param.get("status", "").upper() in ["NORMAL", "OK", "PASS"]:
                status_cell.fill = green_fill

        # Auto-fit columns
        for col in ws.columns:
            max_len = max((len(str(c.value or "")) for c in col), default=10)
            ws.column_dimensions[col[0].column_letter].width = max_len + 4

        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
        wb.save(output_path)
        return output_path

    def create_from_csv_string(self, title: str, csv_content: str, output_path: str) -> str:
        """Create a spreadsheet from CSV-formatted text content."""
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = title[:31]
        for row_idx, line in enumerate(csv_content.strip().split('\n'), 1):
            for col_idx, cell_value in enumerate(line.split(','), 1):
                ws.cell(row=row_idx, column=col_idx, value=cell_value.strip())
        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
        wb.save(output_path)
        return output_path

excel_generator = ExcelGenerator()
