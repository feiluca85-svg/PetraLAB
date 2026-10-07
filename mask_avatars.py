import os
import shutil
from PIL import Image, ImageDraw

img_path = "/Users/ilalu/.gemini/antigravity/brain/803c9307-1892-4479-98b7-0fd2bb6be8ad/.user_uploaded/media_1791408544293_33d7e4e0.webp"
out_dir = "public/avatars"

if os.path.exists(out_dir):
    shutil.rmtree(out_dir)
os.makedirs(out_dir)

img = Image.open(img_path).convert("RGBA")
width, height = img.size

cols = 8
rows = 5

w = width / float(cols)
h = height / float(rows)

count = 0
for r in range(rows):
    for c in range(cols):
        left = int(c * w)
        top = int(r * h)
        right = int((c + 1) * w)
        bottom = int((r + 1) * h)
        
        # Crop the grid cell
        cell = img.crop((left, top, right, bottom))
        
        # We need to find the actual colored circle inside the cell.
        # Let's just create a tight circular mask based on the cell size,
        # but the circle might be slightly smaller than the cell with padding.
        # Let's find the bounding box of non-white pixels in the cell.
        cell_data = cell.getdata()
        min_x, min_y = cell.size[0], cell.size[1]
        max_x, max_y = 0, 0
        
        # Assuming white is > 240
        for y in range(cell.size[1]):
            for x in range(cell.size[0]):
                p = cell_data[y * cell.size[0] + x]
                if not (p[0] > 240 and p[1] > 240 and p[2] > 240):
                    if x < min_x: min_x = x
                    if x > max_x: max_x = x
                    if y < min_y: min_y = y
                    if y > max_y: max_y = y
                    
        if max_x < min_x:
            continue # empty cell
            
        # Crop to the actual circle
        circle_crop = cell.crop((min_x, min_y, max_x + 1, max_y + 1))
        
        # Now create a circular mask of the exact size of circle_crop
        mask = Image.new('L', circle_crop.size, 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, circle_crop.size[0]-1, circle_crop.size[1]-1), fill=255)
        
        # Apply mask
        circle_crop.putalpha(mask)
        
        circle_crop.save(os.path.join(out_dir, f"avatar_{count}.png"))
        count += 1

print(f"Saved {count} masked circular avatars.")
