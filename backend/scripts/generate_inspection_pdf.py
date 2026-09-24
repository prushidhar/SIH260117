import os
import fitz

def create_report_pdf():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842) # A4 size

    # Header banner
    rect_hdr = fitz.Rect(30, 30, 565, 75)
    page.draw_rect(rect_hdr, color=(0.12, 0.23, 0.43), fill=(0.12, 0.23, 0.43))
    page.insert_text(fitz.Point(45, 55), 'SOVEREIGN REFINERIES & PETROCHEMICALS LTD.', fontsize=13, color=(1, 1, 1), fontname='helv')
    page.insert_text(fitz.Point(45, 68), 'NON-DESTRUCTIVE TESTING & STATUTORY PLANT ASSET INTEGRITY DIVISION', fontsize=8, color=(0.85, 0.9, 1), fontname='helv')

    # Report Title
    page.insert_text(fitz.Point(30, 105), 'ULTRASONIC THICKNESS GAUGING & NDT INSPECTION REPORT', fontsize=12, color=(0.12, 0.23, 0.43), fontname='helv')
    page.draw_line(fitz.Point(30, 112), fitz.Point(565, 112), color=(0.12, 0.23, 0.43), width=1.5)

    # Metadata grid
    meta = [
        ('Report Reference:', 'INSP-2025-084-UT', 'Inspection Date:', '18 September 2025'),
        ('Plant Asset Tag:', 'CDU-Pipe-104', 'Plant Unit:', 'Crude Distillation Unit (CDU-II)'),
        ('Governing Code:', 'ASME B31.3 / API 570', 'NDT Method:', 'Ultrasonic Pulse-Echo (UT)'),
        ('Pipe Material:', 'ASTM A106 Grade B Seamless', 'Design Pressure:', '3.2 MPa (464.1 psig)'),
        ('Nominal Thickness:', '12.7 mm (0.500 in)', 'Measured Thickness:', '7.2 mm (0.283 in)'),
        ('Corrosion Rate:', '0.45 mm / year', 'Design Temperature:', '180 deg C (356 deg F)')
    ]

    y = 135
    for r in meta:
        page.insert_text(fitz.Point(35, y), r[0], fontsize=9, color=(0.3, 0.3, 0.3), fontname='helv')
        page.insert_text(fitz.Point(145, y), r[1], fontsize=9, color=(0, 0, 0), fontname='helv')
        page.insert_text(fitz.Point(315, y), r[2], fontsize=9, color=(0.3, 0.3, 0.3), fontname='helv')
        page.insert_text(fitz.Point(425, y), r[3], fontsize=9, color=(0, 0, 0), fontname='helv')
        page.draw_line(fitz.Point(30, y+4), fitz.Point(565, y+4), color=(0.9, 0.9, 0.9), width=0.5)
        y += 20

    # NDT Findings Section
    y += 15
    page.insert_text(fitz.Point(30, y), '1. ULTRASONIC SCANNING & NDT ASSESSMENT FINDINGS', fontsize=10, color=(0.12, 0.23, 0.43), fontname='helv')
    y += 18
    body_p1 = (
        'Ultrasonic thickness measurements were acquired across 16 grid locations along the pre-heat crude transfer header '
        '(CDU-Pipe-104) utilizing calibrated dual-element 5.0 MHz transducers. The nominal design wall thickness is 12.7 mm. '
        'The localized minimum measured wall thickness recorded is 7.2 mm along the 6 o\'clock invert, representing a cumulative '
        'wall loss of 43.3% due to high-temperature naphthenic acid and sulfidic erosion-corrosion. Current localized corrosion rate '
        'is established at 0.45 mm/year.'
    )
    rect_text = fitz.Rect(30, y, 565, y + 55)
    page.insert_textbox(rect_text, body_p1, fontsize=8.5, color=(0.15, 0.15, 0.15), fontname='helv', align=0)

    # Engineering Evaluation
    y += 65
    page.insert_text(fitz.Point(30, y), '2. ASME B31.3 CHAPTER II STATUTORY CODE COMPLIANCE', fontsize=10, color=(0.12, 0.23, 0.43), fontname='helv')
    y += 18
    body_p2 = (
        'Under ASME B31.3 Paragraph 304.1.2, minimum required pressure design wall thickness t_d is 3.14 mm for internal design '
        'pressure 3.2 MPa. Factoring in statutory retirement allowance, the minimum allowable retirement thickness is 5.12 mm. '
        'Since the current measured wall thickness (7.2 mm) exceeds t_min (5.12 mm), the transfer line retains +2.08 mm of usable '
        'corrosion margin, corresponding to an estimated 4.62 years of safe operation prior to reaching retirement threshold.'
    )
    rect_text2 = fitz.Rect(30, y, 565, y + 55)
    page.insert_textbox(rect_text2, body_p2, fontsize=8.5, color=(0.15, 0.15, 0.15), fontname='helv', align=0)

    # Sign-off Box
    y += 75
    rect_sig = fitz.Rect(30, y, 565, y + 110)
    page.draw_rect(rect_sig, color=(0.7, 0.75, 0.85), fill=(0.96, 0.97, 0.99))
    page.insert_text(fitz.Point(40, y + 20), 'STATUTORY APPROVAL & RE-COMMISSIONING DIRECTIVE:', fontsize=9, color=(0.12, 0.23, 0.43), fontname='helv')
    page.insert_text(fitz.Point(40, y + 40), '- Fitness-for-Service (FFS): LEVEL 1 CERTIFIED per API 579-1 / ASME FFS-1', fontsize=8.5, color=(0.1, 0.5, 0.2), fontname='helv')
    page.insert_text(fitz.Point(40, y + 58), '- Action Required: Plant Superintendent digital sign-off and 12-month UT re-inspection protocol.', fontsize=8.5, color=(0.2, 0.2, 0.2), fontname='helv')
    page.insert_text(fitz.Point(40, y + 90), 'Lead NDT Inspector: R. K. Sharma (Level III UT/RT #98421)', fontsize=8, color=(0.4, 0.4, 0.4), fontname='helv')
    page.insert_text(fitz.Point(360, y + 90), 'Plant Superintendent Approval: PENDING AUTHORIZATION', fontsize=8, color=(0.8, 0.2, 0.1), fontname='helv')

    # Footer
    page.insert_text(fitz.Point(30, 815), 'CONFIDENTIAL — INDUSTRIAL ON-PREMISE AIR-GAPPED ASSET RECORD — NOT FOR PUBLIC RELEASE', fontsize=7, color=(0.5, 0.5, 0.5), fontname='helv')

    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
    os.makedirs(out_dir, exist_ok=True)
    out_pdf = os.path.join(out_dir, 'INSP-2025-084_Crude_Distillation_Unit_Ultrasonic_Report.pdf')
    doc.save(out_pdf)
    doc.close()
    print(f'SUCCESS: Created {out_pdf} ({os.path.getsize(out_pdf)} bytes)')

if __name__ == '__main__':
    create_report_pdf()
