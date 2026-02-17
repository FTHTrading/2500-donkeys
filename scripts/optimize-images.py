"""
Convert homepage PNGs to WebP for xxxiii.io
Saves WebP files next to originals. Resizes where appropriate.
"""

from PIL import Image
import os

SITE = r"C:\Users\Kevan\2500-donkeys\site"

# Images used on index.html, grouped by role
HERO = [
    "images/chapters/cover-donkeys.png",      # hero background
    "images/photo/procession-closeup.png",     # closing section
]

CARDS = [
    "images/cover/cover-front.png",            # work card (already 512)
    "images/photo/infra-room.png",             # Private Placement Programs card
]

CHAIN = [
    "images/photo/paper-phones.png",           # step I
    "images/photo/infra-dashboard.png",        # step II
    "images/photo/gold-pyramid.png",           # step III
    "images/chapters/p17-procession.png",      # step IV
    "images/photo/procession-caravan.png",     # step V
    "images/photo/gold-bars-desk.png",         # step VI
    "images/photo/deal-handoff.png",           # step VII
]

LAYERS = [
    "images/chapters/p03-raymond-deal.png",    # layer A
    "images/chapters/p08-whatsapp.png",        # layer B
    "images/photo/procession-hero.png",        # layer C
    "images/chapters/p33-summit.png",          # layer D
]

def convert(src_rel, max_dim, quality):
    src = os.path.join(SITE, src_rel)
    dst = src.rsplit(".", 1)[0] + ".webp"
    img = Image.open(src).convert("RGB")
    
    w, h = img.size
    if max(w, h) > max_dim:
        ratio = max_dim / max(w, h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)
    
    img.save(dst, "WEBP", quality=quality, method=6)
    
    src_kb = os.path.getsize(src) // 1024
    dst_kb = os.path.getsize(dst) // 1024
    saving = round((1 - dst_kb / src_kb) * 100)
    print(f"  {src_rel}: {src_kb}KB -> {dst_kb}KB ({saving}% smaller) [{img.size[0]}x{img.size[1]}]")
    return dst_kb

total_src = 0
total_dst = 0

print("=== Hero images (1200px, q82) ===")
for f in HERO:
    total_src += os.path.getsize(os.path.join(SITE, f)) // 1024
    total_dst += convert(f, 1200, 82)

print("\n=== Card images (600px, q80) ===")
for f in CARDS:
    total_src += os.path.getsize(os.path.join(SITE, f)) // 1024
    total_dst += convert(f, 600, 80)

print("\n=== Chain step images (640px, q78) ===")
for f in CHAIN:
    total_src += os.path.getsize(os.path.join(SITE, f)) // 1024
    total_dst += convert(f, 640, 78)

print("\n=== Layer images (640px, q78) ===")
for f in LAYERS:
    total_src += os.path.getsize(os.path.join(SITE, f)) // 1024
    total_dst += convert(f, 640, 78)

print(f"\n=== TOTAL ===")
print(f"  Original: {total_src}KB ({total_src // 1024}MB)")
print(f"  WebP:     {total_dst}KB ({total_dst // 1024}MB)")
print(f"  Saved:    {total_src - total_dst}KB ({round((1 - total_dst / total_src) * 100)}%)")
