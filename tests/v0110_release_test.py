"""Package wiring and byte integrity, independent of gameplay test injection."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,parse_qs
from collections import Counter
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'version.json').read_text())
assert manifest['version']=='0.11.0' and manifest['name']=='Adaptive Systems'
class Markup(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.refs=[];self.scripts=[];self.meta={}
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get('id'):self.ids.append(a['id'])
  if tag=='script' and a.get('src'):self.scripts.append(a);self.refs.append(a['src'])
  if tag=='link' and a.get('href'):self.refs.append(a['href'])
  if tag=='meta' and a.get('name'):self.meta[a['name']]=a.get('content')
p=Markup();html=(ROOT/'index.html').read_text();p.feed(html)
assert not [k for k,v in Counter(p.ids).items() if v>1]
assert [x['src'] for x in p.scripts]==['game.js?v=0.11.0','version-sync.js?v=0.11.0']
assert all('defer' in x for x in p.scripts)
assert p.meta['abyss-build']==manifest['buildId']
assert 'styles.css?v=0.11.0' in p.refs and 'manifest.webmanifest?v=0.11.0' in p.refs
assert '?v=0.9.0' not in html and 'joystick-stack' not in html
for url in p.refs:
 path=urlsplit(url).path
 assert not urlsplit(url).netloc,('Unexpected runtime dependency',url)
 assert (ROOT/path).is_file(),path
 if 'v' in parse_qs(urlsplit(url).query):assert parse_qs(urlsplit(url).query)['v']==[manifest['version']]
for name,want in manifest['assets'].items():
 assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==want,name
for name in ['game.js','styles.css','service-worker.js']:
 assert manifest['buildId'] in (ROOT/name).read_text(),name
print('PASS actual HTML entry points, deferred execution order, matching cache-busting URLs, local assets, unique element IDs and all nine release SHA-256 hashes')
