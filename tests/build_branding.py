"""Rebuild icon/launch assets from the approved art, without regenerating its design.
Run build_release.py afterwards so installed builds cannot mix asset versions.
"""
from pathlib import Path
from PIL import Image
import base64
R=Path(__file__).resolve().parents[1]
im=Image.open(R/'branding/approved-crystal-descent.png').convert('RGB')
im=im.crop((128,128,im.width-128,im.height-128))
for name,size in [('icon-192.png',192),('icon-512.png',512),('icon-maskable-512.png',512),('apple-touch-icon.png',180),('favicon-32.png',32),('icon-1024.png',1024)]:
 im.resize((size,size),Image.Resampling.LANCZOS).save(R/name,optimize=True)
im.resize((1024,1024),Image.Resampling.LANCZOS).save(R/'launch-art.webp','WEBP',quality=88,method=6)
im.resize((256,256),Image.Resampling.LANCZOS).save(R/'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
b64=base64.b64encode((R/'icon-512.png').read_bytes()).decode()
(R/'icon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>The Abyss Below: Crystal Descent</title><image width="512" height="512" href="data:image/png;base64,'+b64+'"/></svg>\n')
print('Approved art resized; run python tests/build_release.py next.')
