import os
from PIL import Image

image_path = "/Users/ilalu/.gemini/antigravity/brain/803c9307-1892-4479-98b7-0fd2bb6be8ad/.user_uploaded/media_1791407468728_8742d7dc.webp"
out_dir = "public/avatars"

os.makedirs(out_dir, exist_ok=True)

img = Image.open(image_path).convert("RGBA")
width, height = img.size

print(f"Image size: {width}x{height}")

# Make black transparent
data = img.getdata()
new_data = []
for item in data:
    # If the pixel is very dark (close to black), make it transparent
    # Be careful not to remove dark hair/glasses. The background seems pure black.
    if item[0] < 15 and item[1] < 15 and item[2] < 15:
        new_data.append((0, 0, 0, 0))
    else:
        new_data.append(item)
img.putdata(new_data)

cols = 10
rows = 8

# The image might have margins, but assuming it's an exact grid:
w = width // cols
h = height // rows

count = 0
for r in range(rows):
    for c in range(cols):
        left = c * w
        top = r * h
        right = left + w
        bottom = top + h
        
        box = (left, top, right, bottom)
        crop = img.crop(box)
        
        # Trim empty transparent space around the avatar
        bbox = crop.getbbox()
        if bbox:
            crop = crop.crop(bbox)
        
        crop.save(os.path.join(out_dir, f"avatar_{count}.png"))
        count += 1

print(f"Saved {count} avatars to {out_dir}")
