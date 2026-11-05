import io,json
from PIL import Image
from fastapi.testclient import TestClient
from backend.main import app,db,game

def png(alpha=True):
 im=Image.new('RGBA' if alpha else 'RGB',(100,160),(0,0,0,0) if alpha else (120,120,120))
 if alpha:
  from PIL import ImageDraw
  ImageDraw.Draw(im).ellipse((30,20,70,150),fill=(200,160,120,255))
 data=io.BytesIO();im.save(data,'PNG');return data.getvalue()
def login(c):assert c.post('/api/login',json={'password':'test-password-only'}).status_code==200

def test_image_upload_requires_auth_and_transparency():
 with TestClient(app) as c:
  assert c.post('/api/assets',files={'file':('x.png',png(),'image/png')},data={'rights':'true'}).status_code==401
  login(c)
  assert c.post('/api/assets',files={'file':('x.png',png(),'image/png')},data={'rights':'false'}).status_code==422
  assert c.post('/api/assets',files={'file':('x.png',b'not an image','image/png')},data={'rights':'true'}).status_code==422
  assert c.post('/api/assets',files={'file':('opaque.png',png(False),'image/png')},data={'rights':'true'}).status_code==422
  assert c.post('/api/assets',files={'file':('big.png',b'x'*(8*1024*1024+1),'image/png')},data={'rights':'true'}).status_code==413

def test_uploaded_character_calibration_and_websocket_persist():
 with TestClient(app) as c:
  login(c);r=c.post('/api/assets',files={'file':('../unsafe.png',png(),'image/png')},data={'rights':'true'})
  assert r.status_code==200;asset=r.json();assert asset['url'].startswith('/media/') and '..' not in asset['url']
  assert c.get(asset['url']).status_code==200
  v=json.loads(json.dumps(game.s['visuals']));v['characters']['mc'].update(url=asset['url'],frames=[],height=380,foot_y=.94,offset_x=12)
  v['quality']='low';v['reduced_effects']=True
  with c.websocket_connect('/ws') as ws:
   ws.receive_json();assert c.put('/api/visuals',json=v).status_code==200
   updated=ws.receive_json()['state']['visuals'];assert updated['characters']['mc']['foot_y']==.94
  saved=json.loads(db.execute('SELECT data FROM state WHERE id=1').fetchone()[0]);assert saved['visuals']==updated

def test_asset_registry_rejects_remote_traversal_bounds_and_missing_styles():
 with TestClient(app) as c:
  login(c);base=json.loads(json.dumps(game.s['visuals']))
  for url in ['https://example.com/person.png','/assets/wedding/../../secret.png','/media/missing.webp']:
   v=json.loads(json.dumps(base));v['characters']['mc']['url']=url
   assert c.put('/api/visuals',json=v).status_code==422
  v=json.loads(json.dumps(base));v['characters']['mc']['frames']=[[0,0,8000,8000]]
  assert c.put('/api/visuals',json=v).status_code==422
  v=json.loads(json.dumps(base));v['characters']={k:a for k,a in v['characters'].items() if not k.startswith('guest-') or a['style']!='female'}
  assert c.put('/api/visuals',json=v).status_code==422
