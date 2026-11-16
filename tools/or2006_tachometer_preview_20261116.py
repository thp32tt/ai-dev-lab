#!/usr/bin/env python3
"""User-requested temporary private-inspection preview of public OR2006Sprites tachometer DDS assets."""
from __future__ import annotations
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json
import hashlib
import time

REPO = "Sonic-TV/OR2006Sprites"
BASE = "Remakes and Reskins/UI/Tachometers"
GROUPS = {"HD UI": "", "Real Life": "!Real Life Gaugues - Darillone"}
OUT = Path("output")
HEADERS = {"User-Agent": "OutRun-Tachometer-Preview/1.0", "Accept": "application/vnd.github+json"}
OUT.mkdir(exist_ok=True)
rawdata = []
failures = []
records = []

def fetch(url):
    for retry in range(3):
        try:
            req = Request(url, headers=HEADERS)
            with urlopen(req, timeout=45) as f:
                return f.read()
        except Exception as e:
            if retry == 2:
                raise
            time.sleep(1 + retry * 2)

def api(path):
    return json.loads(fetch("https://api.github.com/repos/" + REPO + "/contents/" + quote(path, safe="/") + "?ref=main"))

def load_image(raw):
    image = Image.open(BytesIO(raw))
    image.load()
    original_size = image.size
    rgba = image.convert("RGBA")
    canvas = Image.new("RGBA", rgba.size, (44, 45, 50, 255))
    canvas.alpha_composite(rgba)
    return canvas.convert("RGB"), original_size

def labeled_tile(image, title, width=480, height=420):
    tile = Image.new("RGB", (width, height), "#1f2127")
    d = ImageDraw.Draw(tile)
    d.text((18, 12), title, fill="white")
    area = (width - 20, height - 64)
    thumb = ImageOps.contain(image, area, Image.Resampling.LANCZOS)
    x=(width-thumb.width)//2
    y=45 + (area[1]-thumb.height)//2
    tile.paste(thumb,(x,y))
    return tile

for label, rel in GROUPS.items():
    root = BASE + ("/" + rel if rel else "")
    group_output = OUT / ("real_life" if rel else "hd_ui")
    group_output.mkdir(exist_ok=True)
    try:
        folders = [f for f in api(root) if f["type"] == "dir" and f["name"].startswith("spr_sprani_meter_")]
    except Exception as exc:
        failures.append("LIST " + root + " -> " + repr(exc))
        continue
    for folder in sorted(folders, key=lambda x: x["name"]):
        name = folder["name"].removeprefix("spr_sprani_meter_").removesuffix("_xst")
        try:
            files = [f for f in api(folder["path"]) if f["type"] == "file" and f["name"].lower().endswith(".dds")]
        except Exception as exc:
            failures.append("LIST " + folder["path"] + " -> " + repr(exc))
            continue
        for ix, file in enumerate(files):
            try:
                raw = fetch(file["download_url"])
                image, dimensions = load_image(raw)
                filename = name + ("_" + str(ix+1) if len(files)>1 else "") + ".jpg"
                target = group_output / filename
                image.save(target, "JPEG", quality=94, subsampling=0)
                records.append({"group":label,"car":name,"original":file["path"],"original_filename":file["name"],
                                "source_sha256":hashlib.sha256(raw).hexdigest(),"original_dimensions":dimensions,
                                "jpg":str(target.relative_to(OUT)),"jpg_bytes":target.stat().st_size})
                rawdata.append((label,name,filename,image))
                print(label,name,dimensions,"->",str(target),flush=True)
            except Exception as exc:
                failures.append("CONVERT " + file["path"] + " -> " + repr(exc))
                print(failures[-1],flush=True)

# The separately shared needle sprite.
for needle in api(BASE):
    if needle["type"] != "dir" or not needle["name"].startswith("Tachometer needle"):
        continue
    for f in api(needle["path"]):
        if f["type"] != "file" or not f["name"].lower().endswith(".dds"):
            continue
        try:
            raw=fetch(f["download_url"])
            image,dimensions=load_image(raw)
            target=OUT / "needle.jpg"
            image.save(target,"JPEG",quality=96,subsampling=0)
            records.append({"group":"needle","car":"needle","original":f["path"],"source_sha256":hashlib.sha256(raw).hexdigest(),"original_dimensions":dimensions,"jpg":"needle.jpg"})
            rawdata.append(("needle","needle","needle.jpg",image))
        except Exception as exc:
            failures.append("CONVERT " + f["path"] + " -> " + repr(exc))

cars = sorted(set(x["car"] for x in records if x["group"] in GROUPS))
def get_im(group, car):
    return next((item[3] for item in rawdata if item[0] == group and item[1] == car), None)

if cars:
    width=480*2
    height=48+len(cars)*420
    sheet=Image.new("RGB",(width,height),"#16181b")
    d=ImageDraw.Draw(sheet)
    d.text((20,14),"Original OR2006Sprites DDS -> JPEG | HD UI (left) / Real Life (right)",fill="white")
    for row,car in enumerate(cars):
        for col,group in enumerate(("HD UI","Real Life")):
            im=get_im(group,car)
            tile=labeled_tile(im, f"{car}  /  {group}") if im else labeled_tile(Image.new("RGB",(100,100),"#111111"),f"{car} / {group} [MISSING]")
            sheet.paste(tile,(480*col,48+420*row))
    sheet.save(OUT/"tachometer_comparison.jpg","JPEG",quality=86,optimize=True)
    print("SHEET",sheet.size,flush=True)

(OUT/"manifest.json").write_text(json.dumps({"repository":REPO,"source":"main","records":records,"failures":failures},indent=2),encoding="utf-8")
(OUT/"README.txt").write_text(
    "OR2006Sprites Tachometer DDS -> JPG (preview only)\n"
    "Source: https://github.com/Sonic-TV/OR2006Sprites/tree/main/Remakes%20and%20Reskins/UI/Tachometers\n"
    "These are UI sprites under Remakes and Reskins/UI/Tachometers, NOT direct 3D car-material replacements.\n"
    "Left: HD UI sprites. Right: Darillone Real Life Gauges.\n"
    "JPG transparency is flattened on dark gray. Use source DDS, not these JPG previews, for in-game replacement.\n"
    "For personal inspection; respect original artists' rights when sharing or redistributing.\n",
    encoding="utf-8"
)
if failures:
    (OUT/"failures.txt").write_text("\n".join(failures),encoding="utf-8")
print("RESULT",json.dumps({"jpg_count":len(rawdata),"failures":failures}),flush=True)
if not rawdata:
    raise SystemExit("No DDS files could be converted")
