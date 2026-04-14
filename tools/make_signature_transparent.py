from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "static" / "img" / "stamp_signature.jpg"
DST = ROOT / "static" / "img" / "stamp_signature.png"


def _compute_alpha(r: int, g: int, b: int) -> int:
    """
    Map near-white paper to transparent, ink to opaque.
    Using luminance keeps behavior stable for slightly tinted backgrounds.
    """
    # Relative luminance (sRGB-ish)
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b  # 0..255

    # Soft threshold range: everything >= hi becomes transparent,
    # everything <= lo becomes opaque.
    lo = 150.0
    hi = 225.0

    if y >= hi:
        return 0
    if y <= lo:
        return 255

    # Linear ramp between lo..hi (invert so darker => more opaque)
    t = (y - lo) / (hi - lo)  # 0..1
    return int(round(255 * (1.0 - t)))


def _auto_crop(im: Image.Image, alpha_threshold: int = 12, pad: int = 6) -> Image.Image:
    """
    Crop around non-transparent pixels to avoid a large 'box' in PDF,
    even if a little background noise remains.
    """
    if im.mode != "RGBA":
        im = im.convert("RGBA")

    alpha = im.split()[-1]
    bbox = alpha.point(lambda a: 255 if a > alpha_threshold else 0).getbbox()
    if not bbox:
        return im

    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def to_transparent_png(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGBA")
    px = im.load()

    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            alpha = _compute_alpha(r, g, b)
            px[x, y] = (r, g, b, alpha)

    im = _auto_crop(im)

    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "PNG", optimize=True)


if __name__ == "__main__":
    if not SRC.exists():
        raise SystemExit(f"Missing source: {SRC}")
    to_transparent_png(SRC, DST)
    print(f"Written: {DST}")
