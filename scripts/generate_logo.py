"""
Generates ultra-crisp, 2D minimalist brand logos for ContractGuard-X in PNG and SVG formats.
Follows strictly: 2D only (no 3D, no bevels), simple, minimalist, modern flat design.
"""
import math
from PIL import Image, ImageDraw, ImageFont

def create_2d_minimalist_logo(size=1024):
    # Supersampling 2x for pristine anti-aliasing
    canvas_size = size * 2
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center_x = canvas_size / 2
    center_y = canvas_size / 2
    r = canvas_size * 0.38  # radius

    # Coordinates for a modern 2D flat geometric shield
    # Top vertices, straight sides down, smooth curve to bottom point
    top_w = r * 0.95
    top_y = center_y - r * 0.95
    mid_y = center_y + r * 0.1
    bot_y = center_y + r * 1.05

    # Shield polygon contour
    shield_pts = [
        (center_x, top_y + r * 0.1),
        (center_x + top_w, top_y),
        (center_x + top_w, mid_y),
        (center_x, bot_y),
        (center_x - top_w, mid_y),
        (center_x - top_w, top_y),
    ]

    # Draw solid flat 2D background shield in rich vibrant royal blue
    blue_primary = (37, 99, 235, 255)      # #2563EB (Vibrant Electric Royal Blue)
    blue_deep = (30, 64, 175, 255)         # #1E40AF (Deep Cobalt)
    white_pure = (255, 255, 255, 255)
    cyan_bright = (56, 189, 248, 255)      # #38BDF8 (Cyan Accent)

    # Rounded shield fill using high-density polygon
    draw.polygon(shield_pts, fill=blue_primary)

    # Draw inner 2D geometric cutouts (representing the Dual-End Contract Guard):
    # Left wing (Ingress Gate) and Right wing (Egress Gate) separated by a clean 2D vertical slit
    # and a central minimalist 2D lock/contract node.
    slit_w = canvas_size * 0.035
    line_w = int(canvas_size * 0.04)

    # Clean 2D geometric internal emblem:
    # 1. An inner nested white minimalist shield outline
    inner_scale = 0.82
    inner_pts = [
        (center_x, top_y + r * 0.1 + (1 - inner_scale) * r),
        (center_x + top_w * inner_scale, top_y + (1 - inner_scale) * r * 1.2),
        (center_x + top_w * inner_scale, mid_y - (1 - inner_scale) * r * 0.2),
        (center_x, bot_y - (1 - inner_scale) * r * 1.4),
        (center_x - top_w * inner_scale, mid_y - (1 - inner_scale) * r * 0.2),
        (center_x - top_w * inner_scale, top_y + (1 - inner_scale) * r * 1.2),
    ]
    # Draw crisp inner outline
    for i in range(len(inner_pts)):
        p1 = inner_pts[i]
        p2 = inner_pts[(i + 1) % len(inner_pts)]
        draw.line([p1, p2], fill=cyan_bright, width=int(line_w * 0.5))

    # 2. Central minimalist 2D "X" / Guard Node in pure white
    # Clean modern 2D intersecting lines with rounded circular terminals
    x_span = r * 0.36
    y_offset = center_y + r * 0.02
    
    # 2D cross bars
    draw.line(
        [(center_x - x_span, y_offset - x_span), (center_x + x_span, y_offset + x_span)],
        fill=white_pure,
        width=int(line_w * 0.95)
    )
    draw.line(
        [(center_x + x_span, y_offset - x_span), (center_x - x_span, y_offset + x_span)],
        fill=white_pure,
        width=int(line_w * 0.95)
    )

    # 2D Central Core Circle (Reference Monitor Node)
    core_r = x_span * 0.36
    draw.ellipse(
        [center_x - core_r, y_offset - core_r, center_x + core_r, y_offset + core_r],
        fill=blue_deep,
        outline=white_pure,
        width=int(line_w * 0.4)
    )

    # Downsample using high-quality Lanczos filter
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def create_horizontal_brand_logo(width=1600, height=400):
    canvas_w = width * 2
    canvas_h = height * 2
    img = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

    # Render icon at 320px
    icon_dim = int(canvas_h * 0.76)
    icon = create_2d_minimalist_logo(icon_dim)
    icon_y = int((canvas_h - icon_dim) / 2)
    icon_x = int(canvas_h * 0.15)
    img.paste(icon, (icon_x, icon_y), icon)

    # Draw crisp typography: "ContractGuard" in Deep Navy, "-X" in Vibrant Blue
    draw = ImageDraw.Draw(img)
    text_x = icon_x + icon_dim + int(canvas_h * 0.22)
    text_y = int(canvas_h * 0.36)

    # Fallback to high-quality default font rendering
    try:
        font_brand = ImageFont.truetype("arialbd.ttf", int(canvas_h * 0.32))
        font_sub = ImageFont.truetype("arial.ttf", int(canvas_h * 0.13))
    except Exception:
        font_brand = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    draw.text((text_x, text_y), "ContractGuard", fill=(15, 23, 42, 255), font=font_brand)
    # Get bounding box to place "-X"
    bbox = draw.textbbox((text_x, text_y), "ContractGuard", font=font_brand)
    x_pos = bbox[2] + 12
    draw.text((x_pos, text_y), "-X", fill=(37, 99, 235, 255), font=font_brand)

    # Subtitle: ZERO-TRUST RUNTIME GATEWAY FOR AI AGENTS
    draw.text(
        (text_x, text_y + int(canvas_h * 0.38)),
        "ZERO-TRUST REFERENCE MONITOR & GATEWAY",
        fill=(100, 116, 139, 255),
        font=font_sub
    )

    final_horizontal = img.resize((width, height), Image.Resampling.LANCZOS)
    return final_horizontal

def generate_svg_logo(filepath):
    svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Minimalist 2D Shield Base -->
  <path d="M256 48 L440 84 V276 C440 376 348 440 256 468 C164 440 72 376 72 276 V84 L256 48 Z" 
        fill="#2563EB" />
  
  <!-- Subtle 2D Inner Geometric Contour -->
  <path d="M256 82 L412 112 V270 C412 352 334 408 256 432 C178 408 100 352 100 270 V112 L256 82 Z" 
        stroke="#38BDF8" stroke-width="8" stroke-linejoin="round" fill="none" opacity="0.9" />

  <!-- Central 2D Minimalist X / Dual-Gate Nexus -->
  <path d="M184 194 L328 338" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round" />
  <path d="M328 194 L184 338" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round" />

  <!-- Central Reference Monitor Core -->
  <circle cx="256" cy="266" r="28" fill="#1E40AF" stroke="#FFFFFF" stroke-width="8" />
</svg>'''
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(svg_content)

if __name__ == "__main__":
    import os
    out_dir = r"c:\projects\journal paper prompt injection\ContractGuard_Platform\frontend\public"
    os.makedirs(out_dir, exist_ok=True)

    # 1. 512x512 Main PNG Logo (2D Minimalist)
    logo_512 = create_2d_minimalist_logo(512)
    logo_512.save(os.path.join(out_dir, "logo.png"))
    print("Saved logo.png (512x512)")

    # 2. 128x128 Icon PNG
    logo_128 = create_2d_minimalist_logo(128)
    logo_128.save(os.path.join(out_dir, "logo-icon.png"))
    print("Saved logo-icon.png (128x128)")

    # 3. 32x32 Favicon PNG
    logo_32 = create_2d_minimalist_logo(32)
    logo_32.save(os.path.join(out_dir, "favicon.png"))
    print("Saved favicon.png (32x32)")

    # 4. Horizontal Brand Header PNG (800x200)
    brand_h = create_horizontal_brand_logo(800, 200)
    brand_h.save(os.path.join(out_dir, "brand-logo-horizontal.png"))
    print("Saved brand-logo-horizontal.png (800x200)")

    # 5. Crisp SVG Vector Logo
    generate_svg_logo(os.path.join(out_dir, "logo.svg"))
    print("Saved logo.svg")

