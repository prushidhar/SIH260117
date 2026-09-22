"""
OCR Module for INDRA
Handles scanned PDFs and images using PyMuPDF pixmap rendering + pytesseract.
Falls back to direct fitz text extraction for digital PDFs.
"""

class LocalOCR:
    def scan_pdf(self, filepath: str) -> dict:
        """OCR a scanned PDF by rendering each page to image then extracting text."""
        try:
            import fitz
            doc = fitz.open(filepath)
            pages_text = []
            full_text = ""
            for page_num in range(len(doc)):
                page = doc[page_num]
                # Try direct text first
                direct_text = page.get_text("text").strip()
                if len(direct_text) > 50:
                    pages_text.append({"page": page_num + 1, "text": direct_text, "method": "direct"})
                    full_text += direct_text + "\n"
                else:
                    # Render to image and OCR
                    mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better OCR quality
                    pix = page.get_pixmap(matrix=mat)
                    img_bytes = pix.tobytes("png")
                    try:
                        import pytesseract
                        from PIL import Image
                        import io
                        img = Image.open(io.BytesIO(img_bytes))
                        ocr_text = pytesseract.image_to_string(img, config='--psm 6')
                        pages_text.append({"page": page_num + 1, "text": ocr_text.strip(), "method": "ocr"})
                        full_text += ocr_text + "\n"
                    except ImportError:
                        pages_text.append({"page": page_num + 1, "text": direct_text or "(OCR unavailable)", "method": "fallback"})
            doc.close()
            return {"success": True, "pages": pages_text, "full_text": full_text.strip()}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def scan_image(self, image_path: str) -> str:
        """OCR a single image file."""
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(image_path)
            return pytesseract.image_to_string(img, config='--psm 6')
        except ImportError:
            return "(pytesseract not installed — pip install pytesseract)"
        except Exception as e:
            return f"OCR Error: {str(e)}"

    def extract_equipment_tags(self, text: str) -> list:
        """Extract equipment tag IDs (P-101, V-201, FT-101 etc.) from OCR text."""
        import re
        # Common industrial tag patterns
        pattern = r'\b([A-Z]{1,3}-\d{2,4}[A-Z]?)\b'
        tags = list(set(re.findall(pattern, text)))
        return sorted(tags)

local_ocr = LocalOCR()
