"""
Merge cover.pdf + body.pdf into the final deliverable.
"""
import os
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

def normalize_page_to_a4(page):
    """Force the mediabox to exactly A4. Setting mediabox directly (instead
    of scale_to) preserves the text streams — scale_to applies a content
    transformation matrix that can break text extraction in pdfplumber."""
    from pypdf.generic import RectangleObject
    page.mediabox = RectangleObject([0, 0, A4_W, A4_H])
    page.cropbox = RectangleObject([0, 0, A4_W, A4_H])
    return page

cover = "/home/z/my-project/research/cover.pdf"
body = "/home/z/my-project/research/body.pdf"
out = "/home/z/my-project/download/Axia_Client_Portal_Deep_Research.pdf"
os.makedirs(os.path.dirname(out), exist_ok=True)

writer = PdfWriter()
cover_page = PdfReader(cover).pages[0]
writer.add_page(normalize_page_to_a4(cover_page))
for page in PdfReader(body).pages:
    writer.add_page(normalize_page_to_a4(page))
writer.add_metadata({
    '/Title': 'Axia Client Portal — Deep Research & Implementation Blueprint',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'Deep research on client portals and a 12-week implementation blueprint for Axia',
})
with open(out, 'wb') as f:
    writer.write(f)
print(f"Final PDF: {out}")
print(f"  Size: {os.path.getsize(out) / 1024:.1f} KB")
print(f"  Pages: {len(PdfReader(out).pages)}")
