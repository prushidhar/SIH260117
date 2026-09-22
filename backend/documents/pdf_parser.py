"""
PDF Parser for INDRA
Uses PyMuPDF (fitz) for high-fidelity extraction of text from digital and scanned PDFs.
"""
import os

class PDFParser:
    def extract_text(self, filepath: str) -> dict:
        """Extract all text from a PDF, page by page."""
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(filepath)
            pages = []
            full_text = ""
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text("text")
                pages.append({"page": page_num + 1, "text": text})
                full_text += text + "\n"
            doc.close()
            return {
                "success": True,
                "filepath": filepath,
                "num_pages": len(pages),
                "pages": pages,
                "full_text": full_text.strip()
            }
        except ImportError:
            return {"success": False, "error": "PyMuPDF not installed. Run: pip install PyMuPDF"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def extract_tables(self, filepath: str) -> list:
        """Extract tables from a PDF as list of dicts."""
        try:
            import fitz
            doc = fitz.open(filepath)
            tables = []
            for page_num in range(len(doc)):
                page = doc[page_num]
                # Get blocks that look like tables (multi-column)
                blocks = page.get_text("blocks")
                for b in blocks:
                    tables.append({"page": page_num + 1, "block": b[4]})
            doc.close()
            return tables
        except Exception as e:
            return [{"error": str(e)}]

    def extract_images(self, filepath: str, output_dir: str = "data/outputs") -> list:
        """Extract embedded images from a PDF."""
        try:
            import fitz
            os.makedirs(output_dir, exist_ok=True)
            doc = fitz.open(filepath)
            image_paths = []
            for page_num in range(len(doc)):
                page = doc[page_num]
                for img_index, img in enumerate(page.get_images(full=True)):
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    img_ext = base_image["ext"]
                    img_path = os.path.join(output_dir, f"page{page_num+1}_img{img_index}.{img_ext}")
                    with open(img_path, "wb") as f:
                        f.write(base_image["image"])
                    image_paths.append(img_path)
            doc.close()
            return image_paths
        except Exception as e:
            return [{"error": str(e)}]

pdf_parser = PDFParser()
