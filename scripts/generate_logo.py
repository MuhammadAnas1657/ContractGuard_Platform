"""
Generates ultra-crisp brand logos for ContractGuard-X in PNG and ICO formats.
Uses the official uploaded security shield robot emblem.
"""
import os
from PIL import Image, ImageFilter, ImageDraw, ImageFont
import numpy as np
from collections import deque

def generate_all_assets():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    platform_dir = os.path.dirname(script_dir)
    public_dir = os.path.join(platform_dir, "frontend", "public")
    app_dir = os.path.join(platform_dir, "frontend", "app")

    original_path = os.path.join(public_dir, "logo-original.png")
    if not os.path.exists(original_path):
        print(f"Error: {original_path} not found.")
        return

    im = Image.open(original_path).convert("RGB")
    w, h = im.size

    arr = np.array(im)
    mask = np.zeros((h, w), dtype=np.uint8)
    visited = np.zeros((h, w), dtype=bool)

    q = deque([(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)])
    for y, x in q:
        visited[y, x] = True

    while q:
        y, x = q.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                r, g, b = int(arr[ny, nx, 0]), int(arr[ny, nx, 1]), int(arr[ny, nx, 2])
                if r > 215 and g > 215 and b > 215:
                    visited[ny, nx] = True
                    q.append((ny, nx))

    mask[~visited] = 255
    mask_im = Image.fromarray(mask, mode="L")
    mask_blurred = mask_im.filter(ImageFilter.GaussianBlur(radius=0.7))

    rgba = im.convert("RGBA")
    rgba.putalpha(mask_blurred)

    target_size = 512
    margin = 20
    max_dim = max(w, h)
    scale = (target_size - 2 * margin) / max_dim
    new_w = int(w * scale)
    new_h = int(h * scale)
    resized_shield = rgba.resize((new_w, new_h), Image.Resampling.LANCZOS)

    final_512 = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    offset_x = (target_size - new_w) // 2
    offset_y = (target_size - new_h) // 2
    final_512.paste(resized_shield, (offset_x, offset_y), resized_shield)

    final_512.save(os.path.join(public_dir, "logo.png"), "PNG")
    print("Saved logo.png (512x512)")

    final_128 = final_512.resize((128, 128), Image.Resampling.LANCZOS)
    final_128.save(os.path.join(public_dir, "logo-icon.png"), "PNG")
    print("Saved logo-icon.png (128x128)")

    final_32 = final_512.resize((32, 32), Image.Resampling.LANCZOS)
    final_32.save(os.path.join(public_dir, "favicon.png"), "PNG")
    print("Saved favicon.png (32x32)")

    final_32.save(os.path.join(app_dir, "icon.png"), "PNG")
    print("Saved app/icon.png (32x32)")

    final_16 = final_512.resize((16, 16), Image.Resampling.LANCZOS)
    final_48 = final_512.resize((48, 48), Image.Resampling.LANCZOS)
    final_32.save(
        os.path.join(public_dir, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[final_16, final_48],
    )
    final_32.save(
        os.path.join(app_dir, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[final_16, final_48],
    )
    print("Saved favicon.ico in public and app")

    brand_w, brand_h = 1600, 400
    brand_img = Image.new("RGBA", (brand_w, brand_h), (0, 0, 0, 0))
    shield_h = 320
    shield_w = int(shield_h * (w / h))
    brand_shield = rgba.resize((shield_w, shield_h), Image.Resampling.LANCZOS)
    brand_img.paste(brand_shield, (60, (brand_h - shield_h) // 2), brand_shield)

    draw = ImageDraw.Draw(brand_img)
    try:
        font = ImageFont.truetype("arialbd.ttf", 130)
        font_sub = ImageFont.truetype("arial.ttf", 50)
    except Exception:
        font = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    text_x = 60 + shield_w + 50
    text_y = (brand_h - 180) // 2
    draw.text((text_x, text_y), "ContractGuard", fill=(255, 255, 255, 255), font=font)
    cg_bbox = draw.textbbox((text_x, text_y), "ContractGuard", font=font)
    draw.text((cg_bbox[2], text_y), "-X", fill=(59, 130, 246, 255), font=font)
    draw.text(
        (text_x + 5, text_y + 140),
        "Zero-Trust AI Agent Security & Defense Gateway",
        fill=(148, 163, 184, 255),
        font=font_sub,
    )
    brand_img.save(os.path.join(public_dir, "brand-logo-horizontal.png"), "PNG")
    print("Saved brand-logo-horizontal.png (1600x400)")

if __name__ == "__main__":
    generate_all_assets()
