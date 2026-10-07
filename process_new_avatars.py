import os
import shutil
from PIL import Image

img_path = "/Users/ilalu/.gemini/antigravity/brain/803c9307-1892-4479-98b7-0fd2bb6be8ad/.user_uploaded/media_1791408420885_309aef8e.webp"
out_dir = "public/avatars"

if os.path.exists(out_dir):
    shutil.rmtree(out_dir)
os.makedirs(out_dir)

img = Image.open(img_path).convert("RGBA")

# Make near-white transparent
data = list(img.getdata())
new_data = []
for item in data:
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        new_data.append((0, 0, 0, 0))
    else:
        new_data.append(item)
img.putdata(new_data)

bbox = img.getbbox()
content_img = img.crop(bbox)

cols = 9
rows = 6
w = content_img.size[0] / float(cols)
h = content_img.size[1] / float(rows)

count = 0
for r in range(rows):
    for c in range(cols):
        left = int(c * w)
        top = int(r * h)
        right = int((c + 1) * w)
        bottom = int((r + 1) * h)
        
        box = (left, top, right, bottom)
        crop = content_img.crop(box)
        
        # Trim empty transparent space around the individual avatar
        c_bbox = crop.getbbox()
        if c_bbox:
            # Add a small padding (e.g., 2 pixels) so it doesn't touch the edge
            pad = 2
            cb_left = max(0, c_bbox[0] - pad)
            cb_top = max(0, c_bbox[1] - pad)
            cb_right = min(crop.size[0], c_bbox[2] + pad)
            cb_bottom = min(crop.size[1], c_bbox[3] + pad)
            crop = crop.crop((cb_left, cb_top, cb_right, cb_bottom))
            
            # Save it
            crop.save(os.path.join(out_dir, f"avatar_{count}.png"))
        count += 1

print(f"Processed and saved {count} new avatars.")
