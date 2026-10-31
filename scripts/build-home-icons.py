#!/usr/bin/env python3
"""Build true-square home-screen icons from the owner's original PNG logo.

No image generation or logo redrawing: only alpha-aware, proportional
resampling and centered placement on the approved dark navy background.
Designed to run before GitHub Pages artifact upload.
"""
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "omar-mark.png"
NAVY = (7, 12, 22, 255)
TARGETS = (
    ("omar-icon-192.png", 192, .74),
    ("omar-icon-512.png", 512, .74),
    ("omar-icon-maskable-512.png", 512, .64),
    ("omar-apple-touch-180.png", 180, .70),
    ("omar-favicon-32.png", 32, .76),
)

def build():
    with Image.open(SOURCE) as raw:
        if raw.format != "PNG":
            raise ValueError("Approved logo must be a PNG source")
        image = raw.convert("RGBA")
    # Remove *transparent* outer whitespace only. Actual logo pixels
    # and their exact colors remain unchanged.
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Original OMAR MARO logo is entirely transparent")
    logo = image.crop(bounds)
    outputs = []
    for name, size, safe_ratio in TARGETS:
        max_dimension = round(size * safe_ratio)
        scaled = logo.copy()
        scaled.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
        if name == "omar-favicon-32.png":
            # If source artwork has black pixels baked into its background,
            # key those dark pixels out, keeping the exact white logo artwork.
            corner_colors = [logo.getpixel((x, y)) for x, y in (
                (0, 0), (logo.width-1, 0), (0, logo.height-1), (logo.width-1, logo.height-1))]
            if sum(a > 210 and max(r, g, b) < 35 for r, g, b, a in corner_colors) >= 2:
                scaled.putdata([(r, g, b, round(a * max(r, g, b) / 255)) for r, g, b, a in scaled.getdata()])
        icon = Image.new("RGBA", (size, size), (0, 0, 0, 0) if name == "omar-favicon-32.png" else NAVY)
        pos = ((size - scaled.width)//2, (size - scaled.height)//2)
        icon.alpha_composite(scaled, dest=pos)
        output = ROOT / "assets" / name
        icon.save(output, format="PNG", optimize=True)
        outputs.append((output, size, pos, scaled.size))
    return outputs

def verify(outputs):
    for path, size, pos, logo_size in outputs:
        with Image.open(path) as im:
            im.load()
            assert im.format == "PNG", path
            assert im.size == (size, size), path
            assert im.getpixel((0, 0)) == ((0, 0, 0, 0) if path.name == "omar-favicon-32.png" else NAVY), path
            if path.name == "omar-favicon-32.png":
                alpha_min, alpha_max = im.getchannel("A").getextrema()
                assert alpha_min == 0 and alpha_max > 0, "Tab favicon must contain transparent and visible pixels"
        assert logo_size[0] <= .77 * size and logo_size[1] <= .77 * size
        assert pos[0] >= .11 * size and pos[1] >= .11 * size
        print(f"{path.relative_to(ROOT)}: {size}x{size} / logo {logo_size} / centered at {pos}")

if __name__ == "__main__":
    outputs=build()
    verify(outputs)
    print("Square home-screen icons generated from unchanged approved OMAR MARO mark.")
