"""
PowerPoint Generator for INDRA
Generates industrial engineering review presentations using python-pptx.
"""
import os
from datetime import datetime

class PPTGenerator:
    def create_engineering_review(self, slides_data: list, output_path: str) -> str:
        """
        Creates an engineering review presentation.
        slides_data: list of dicts with keys: title, content (str or list), notes
        """
        from pptx import Presentation
        from pptx.util import Inches, Pt
        from pptx.dml.color import RGBColor

        prs = Presentation()
        prs.slide_width = Inches(13.33)
        prs.slide_height = Inches(7.5)

        # Title slide
        title_layout = prs.slide_layouts[0]
        slide = prs.slides.add_slide(title_layout)
        slide.shapes.title.text = slides_data[0].get("title", "INDRA Engineering Review") if slides_data else "INDRA Report"
        slide.placeholders[1].text = f"INDRA Workbench | Generated: {datetime.now().strftime('%d %b %Y')}"

        # Content slides
        content_layout = prs.slide_layouts[1]
        for slide_data in slides_data[1:]:
            slide = prs.slides.add_slide(content_layout)
            slide.shapes.title.text = slide_data.get("title", "")
            content = slide_data.get("content", "")
            tf = slide.placeholders[1].text_frame
            tf.clear()
            if isinstance(content, list):
                for item in content:
                    p = tf.add_paragraph()
                    p.text = f"• {item}"
                    p.level = 0
            else:
                tf.paragraphs[0].text = str(content)

            # Add speaker notes if present
            if slide_data.get("notes"):
                notes_slide = slide.notes_slide
                notes_slide.notes_text_frame.text = slide_data["notes"]

        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
        prs.save(output_path)
        return output_path

    def create_from_content(self, title: str, content: str, output_path: str) -> str:
        """Create a simple 2-slide deck from plain text content."""
        slides_data = [
            {"title": title, "content": "INDRA Engineering Workbench"},
            {"title": "Analysis Results", "content": content}
        ]
        return self.create_engineering_review(slides_data, output_path)

ppt_generator = PPTGenerator()
