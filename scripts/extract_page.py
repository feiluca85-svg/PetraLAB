import sys, pypdf, base64, json

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: extract_page.py <pdf_path> <page_number>"}))
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    page_num = int(sys.argv[2])
    
    try:
        reader = pypdf.PdfReader(pdf_path)
        total_pages = len(reader.pages)
        if page_num < 1 or page_num > total_pages:
            print(json.dumps({"error": f"Page {page_num} out of bounds (1-{total_pages})", "totalPages": total_pages}))
            sys.exit(0)
            
        page = reader.pages[page_num - 1]
        if not page.images:
            print(json.dumps({"error": "No image in page", "totalPages": total_pages}))
            sys.exit(0)
            
        img = page.images[0]
        b64 = base64.b64encode(img.data).decode("utf-8")
        
        mime = "image/jpeg"
        if img.name.lower().endswith(".png"):
            mime = "image/png"
            
        print(json.dumps({
            "status": "ok",
            "page": page_num,
            "totalPages": total_pages,
            "mimeType": mime,
            "base64": b64
        }))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
