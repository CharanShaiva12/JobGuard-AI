"""
JobGuard AI - Scanned PDF Local OCR Extraction Utility
Uses pypdfium2 to render scanned PDF pages to high-resolution images
and performs offline Tesseract OCR with preserved page order.
"""
import sys
import os
import pypdfium2 as pdfium
import pytesseract
from PIL import Image

TESSERACT_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.environ.get("TESSERACT_PATH", "tesseract")
]

for p in TESSERACT_PATHS:
    if os.path.exists(p):
        pytesseract.pytesseract.tesseract_cmd = p
        break

def extract_scanned_pdf(file_path: str):
    if not os.path.exists(file_path):
        sys.stderr.write(f"File not found: {file_path}\n")
        return

    try:
        pdf = pdfium.PdfDocument(file_path)
        extracted_pages = []

        for page_idx in range(len(pdf)):
            page = pdf[page_idx]
            page_text = ""
            try:
                textpage = page.get_textpage()
                page_text = textpage.get_text_range() or ""
            except Exception:
                pass

            if len(page_text.strip()) >= 40:
                extracted_pages.append(page_text.strip())
                continue

            # Render scanned page to high-res image (scale=2 -> ~150-200 DPI)
            try:
                pil_image = page.render(scale=2).to_pil()
                ocr_text = pytesseract.image_to_string(pil_image, config="--psm 3")
                if ocr_text.strip():
                    extracted_pages.append(ocr_text.strip())
            except Exception as ocr_err:
                sys.stderr.write(f"Page {page_idx + 1} render/OCR notice: {ocr_err}\n")

        final_text = "\n\n".join(extracted_pages)
        sys.stdout.buffer.write(final_text.encode("utf-8", errors="replace"))
    except Exception as e:
        sys.stderr.write(f"Error extracting PDF: {e}\n")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        extract_scanned_pdf(sys.argv[1])
