"""Optional build-time artwork generation; the API key never enters the site.

python3 scripts/generate-art.py --variant blue
Requires cwebp to optimize the generated original into a deployed WebP.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import subprocess
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("--variant", choices=["original", "blue", "rose", "gold"], default="original")
args = parser.parse_args()
variants = {
    "original": "Nile tilapia with a sage green and blue-gray body, muted teal vertical banding, ivory belly, and translucent terracotta and amber fin edges. The fish faces LEFT, horizontal side profile.",
    "blue": "A beautiful BLUE TILAPIA (Oreochromis aureus), with a silvery pale-blue and jade-teal body, subtle olive vertical stripes, a long raised spiny dorsal fin edged dark slate-blue, translucent fins with the faintest dusty pink edge, and a pale silvery belly. Facing RIGHT in a horizontal side profile. A clearly distinct fish, with a taller rounder body and a slightly open mouth. Its body is wide and oval, NOT a slender trout.",
    "rose": "A beautiful RED TILAPIA, a plump deep-bodied coral-pink fish with a creamy ivory belly, soft salmon and rose-gold fine scales, rosy translucent spiny dorsal fin and rounded salmon-orange tail. Tiny subtle gold flecks on the cheeks. Facing LEFT with a very slight upward swimming angle of 8 degrees. This is a real red color morph of tilapia, not a goldfish, no long flowing fins. Its shape is deep and oval with recognizable spiny dorsal fin.",
    "gold": "A beautiful golden-olive Nile tilapia, with a deep round ochre and sage-gold body, striking dark olive vertical barring, mustard golden cheeks, pale warm ivory belly, an olive-green and amber spiny dorsal fin, and a delicately striped fan-shaped tail. Facing RIGHT in horizontal side profile. It has a smaller rounded head and warm bronze eye. An elegant cichlid, not a goldfish, no flowing fins."
}
prompt = (
    "Create one exquisite natural-history specimen illustration of a TILAPIA FISH, full body side profile, centered, filling 85 percent of the image width, isolated on a completely TRANSPARENT background. "
    + variants[args.variant]
    + " A refined hand-painted nineteenth-century scientific watercolor with extremely delicate engraving lines and visible fine scales. Lifelike but artistically illustrated, elegant and softly textured, as if from a beautifully designed modern field guide. Fine clean cut-out edges. NOT a cartoon, NOT 3D, NOT photographic. No water, no shadow, no plants, no border, no background, no typography, no labels, no lettering. A luxury editorial illustration for an elegant cream-and-deep-teal learning website. Entire tail and all fins fully visible with generous transparent margins. Exactly ONE fish."
)
request = urllib.request.Request(
    "https://api.openai.com/v1/images/generations",
    headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"], "Content-Type": "application/json", "User-Agent": "tilapias-learning-site/1.0"},
    data=json.dumps({"model": "gpt-image-1.5", "n": 1, "size": "1536x1024", "quality": "high", "background": "transparent", "prompt": prompt}).encode(),
)
with urllib.request.urlopen(request, timeout=240) as response:
    payload = json.load(response)
image = payload["data"][0]
name = "tilapia" if args.variant == "original" else "tilapia-" + args.variant
original = Path("art-source") / (name + ".png")
original.parent.mkdir(parents=True, exist_ok=True)
if "b64_json" in image:
    original.write_bytes(base64.b64decode(image["b64_json"]))
else:
    with urllib.request.urlopen(image["url"], timeout=60) as response:
        original.write_bytes(response.read())
output = Path("public/art") / (name + ".webp")
output.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(["cwebp", "-quiet", "-q", "90", "-resize", "900", "0", str(original), "-o", str(output)], check=True)
print(f"Wrote {output} ({output.stat().st_size} bytes)")
