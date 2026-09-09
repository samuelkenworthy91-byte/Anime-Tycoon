#!/usr/bin/env python3
"""Normalize the selected Cast V4 art map to deterministic 512×512 RGB WebP portraits.

Requires Pillow (`python -m pip install Pillow`). Source selection, donor substitutions,
and repair crops are authoritative in docs/cast-v4/CAST_V4_FINAL_ART_MAP.csv.
The script never reads hidden affinity when composing images.
"""
from __future__ import annotations
import argparse, csv, hashlib
from pathlib import Path
from PIL import Image, ImageOps

SIZE=(512,512)

def digest(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()

def main() -> None:
    ap=argparse.ArgumentParser()
    ap.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args=ap.parse_args()
    root=args.root.resolve()
    art_map=root/'docs/cast-v4/CAST_V4_FINAL_ART_MAP.csv'
    staging=root/'art_src/cast_v4_upload_staging'
    out=root/'public/cast/v4'; out.mkdir(parents=True, exist_ok=True)
    rows=list(csv.DictReader(art_map.open(newline='',encoding='utf-8')))
    if len(rows)!=304: raise ValueError(f'Expected 304 art-map rows, found {len(rows)}')
    checks=[]
    for row in rows:
        sid=row['stable_id']; src=staging/row['selected_source_path']
        if not src.is_file(): raise FileNotFoundError(f'{sid}: {src}')
        with Image.open(src) as im:
            im=im.convert('RGB')
            centering=(0.5,0.42 if im.height>=im.width else 0.5)
            final=ImageOps.fit(im,SIZE,method=Image.Resampling.LANCZOS,centering=centering)
            dst=out/f'{sid}.webp'
            final.save(dst,'WEBP',quality=92,method=6)
        checks.append((sid,f'cast/v4/{sid}.webp',digest(dst)))
    checksum=root/'docs/cast-v4/CAST_V4_RUNTIME_ART_SHA256.csv'
    checksum.write_text('stable_id,img,sha256\n'+''.join(f'{a},{b},{c}\n' for a,b,c in checks),encoding='utf-8')
    print(f'Finalized {len(checks)} Cast V4 runtime portraits in {out}')

if __name__=='__main__': main()
