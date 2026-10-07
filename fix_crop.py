import os
import shutil
from PIL import Image

img_path = "/Users/ilalu/.gemini/antigravity/brain/803c9307-1892-4479-98b7-0fd2bb6be8ad/.user_uploaded/media_1791408544293_33d7e4e0.webp"
out_dir = "public/avatars"

img = Image.open(img_path).convert("RGBA")
width, height = img.size
cols, rows = 8, 5
w, h = width / cols, height / rows

print("Extracting tightly...")

count = 0
for r in range(rows):
    for c in range(cols):
        left, top, right, bottom = int(c * w), int(r * h), int((c + 1) * w), int((r + 1) * h)
        cell = img.crop((left, top, right, bottom))
        
        # We need to find the colored circle bounding box
        cell_data = list(cell.getdata())
        cw, ch = cell.size
        
        min_x, min_y, max_x, max_y = cw, ch, 0, 0
        for y in range(ch):
            for x in range(cw):
                p = cell_data[y * cw + x]
                if p[0] < 240 or p[1] < 240 or p[2] < 240:
                    if x < min_x: min_x = x
                    if x > max_x: max_x = x
                    if y < min_y: min_y = y
                    if y > max_y: max_y = y
        
        if max_x >= min_x:
            # Crop exactly to the circle
            circle = cell.crop((min_x, min_y, max_x + 1, max_y + 1))
            
            # Now we have the exact square of the circle (hopefully)
            # Make the *outside* of the circle transparent.
            # Instead of a hard drawing, let's just make the 4 white corners transparent
            # based on distance from center.
            c_w, c_h = circle.size
            cx, cy = c_w / 2.0, c_h / 2.0
            radius = min(c_w, c_h) / 2.0
            
            c_data = list(circle.getdata())
            new_data = []
            for y in range(c_h):
                for x in range(c_w):
                    dist = ((x - cx)**2 + (y - cy)**2)**0.5
                    p = c_data[y * c_w + x]
                    if dist > radius:
                        # Outside the circle radius -> transparent
                        new_data.append((0, 0, 0, 0))
                    else:
                        new_data.append(p)
            
            circle.putdata(new_data)
            circle.save(os.path.join(out_dir, f"avatar_{count}.png"))
        count += 1
print(f"Saved {count} improved avatars.")
