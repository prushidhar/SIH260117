"""
Image Processor for INDRA
Enhances P&ID images and scanned documents before passing to Vision LLM or OCR.
Uses Pillow (PIL) with optional OpenCV for advanced preprocessing.
"""
import os

class ImageProcessor:
    def enhance_for_ocr(self, image_path: str, output_path: str = None) -> str:
        """Enhance image contrast and sharpness for better OCR accuracy."""
        try:
            from PIL import Image, ImageEnhance, ImageFilter
            img = Image.open(image_path).convert("L")  # Convert to grayscale
            # Enhance contrast
            img = ImageEnhance.Contrast(img).enhance(2.0)
            # Sharpen
            img = img.filter(ImageFilter.SHARPEN)
            out_path = output_path or image_path.replace(".", "_enhanced.")
            img.save(out_path)
            return out_path
        except Exception as e:
            return f"Error: {str(e)}"

    def extract_pid_regions(self, image_path: str) -> dict:
        """
        Detects rectangular regions in a P&ID image using basic OpenCV contours.
        These regions likely contain equipment symbols or instrument bubbles.
        """
        try:
            import cv2
            import numpy as np
            img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                return {"error": "Could not read image"}
            _, thresh = cv2.threshold(img, 128, 255, cv2.THRESH_BINARY_INV)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            regions = []
            for cnt in contours:
                x, y, w, h = cv2.boundingRect(cnt)
                if 20 < w < 200 and 20 < h < 200:
                    regions.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h)})
            return {"success": True, "regions": regions[:50]}  # limit to 50 regions
        except ImportError:
            return {"error": "opencv-python not installed. Run: pip install opencv-python"}
        except Exception as e:
            return {"error": str(e)}

    def resize_for_vlm(self, image_path: str, max_size: int = 1024) -> str:
        """Resize large P&ID images to fit within VLM context window limits."""
        try:
            from PIL import Image
            img = Image.open(image_path)
            img.thumbnail((max_size, max_size), Image.LANCZOS)
            out_path = image_path.replace(".", "_resized.")
            img.save(out_path)
            return out_path
        except Exception as e:
            return f"Error: {str(e)}"

image_processor = ImageProcessor()
