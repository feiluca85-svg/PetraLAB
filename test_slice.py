from PIL import Image

img_path = "/Users/ilalu/.gemini/antigravity/brain/803c9307-1892-4479-98b7-0fd2bb6be8ad/.user_uploaded/media_1791408420885_309aef8e.webp"
img = Image.open(img_path).convert("RGBA")

# Make near-white transparent
data = img.getdata()
new_data = []
for item in data:
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        new_data.append((0, 0, 0, 0))
    else:
        new_data.append(item)
img.putdata(new_data)

bbox = img.getbbox()
print("Overall BBox:", bbox)
print("Image Size:", img.size)

# Crop to the exact content
content_img = img.crop(bbox)
print("Content Size:", content_img.size)

cols = 9
rows = 6
w = content_img.size[0] / cols
h = content_img.size[1] / rows

print("Cell Size:", w, "x", h)
