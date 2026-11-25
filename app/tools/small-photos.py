"""Makes the light copies of the build photos: public/photos/<name>.jpg -> public/photos/small/<name>.webp

The home page photo cards and the soft blurred backgrounds use these, so they load and draw much faster.
Run it after adding a photo to public/photos/:  python3 app/tools/small-photos.py   (needs Pillow: pip install pillow)
Photos that already have a copy are skipped. Without a copy the site just uses the full photo, so nothing breaks.
"""
from pathlib import Path
from PIL import Image, ImageOps

photos = Path(__file__).resolve().parent.parent / "public" / "photos"
(photos / "small").mkdir(exist_ok=True)
for f in sorted(photos.iterdir()):
    if f.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        continue
    out = photos / "small" / (f.stem + ".webp")
    if out.exists():
        continue
    im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
    s = min(1, 600 / min(im.size))
    im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS).save(out, "WEBP", quality=82, method=6)
    print("made", out.relative_to(photos.parent.parent))
