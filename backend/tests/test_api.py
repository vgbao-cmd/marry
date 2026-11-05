import uuid
from fastapi.testclient import TestClient
from backend.main import app,game,db,Game

def test_auth_config_tts_and_live():
 with TestClient(app) as c:
  assert c.post('/api/control',json={'action':'stop'}).status_code==401
  assert c.post('/api/live/events',json={'id':'x','type':'join'}).status_code==401
  assert c.post('/api/login',json={'password':'incorrect'}).status_code==401
  assert c.post('/api/login',json={'password':'test-password-only'}).status_code==200
  cfg=c.get('/api/admin').json()['config'];cfg['goal']=0
  assert c.put('/api/config',json=cfg).status_code==422
  cfg['goal']=50;assert c.put('/api/config',json=cfg).status_code==200
  assert c.post('/api/tts',json={'text':'Xin chào'}).json()['provider']=='browser-fallback'
  c.post('/api/control',json={'action':'mode','mode':'live'})
  assert c.post('/api/demo/events',json={'id':'bad','type':'join'}).status_code==409
  assert c.post('/api/live/events',headers={'Authorization':'Bearer test-ingestion-only'},json={'id':'real-1','type':'join','user_id':'real-id','name':'Khách live'}).json()['accepted']
  assert not c.post('/api/live/events',headers={'Authorization':'Bearer test-ingestion-only'},json={'id':'real-1','type':'join','user_id':'real-id'}).json()['accepted']
  c.post('/api/control',json={'action':'mode','mode':'demo'})

def test_websocket_snapshot_reconnect_and_persistence():
 with TestClient(app) as c:
  c.post('/api/login',json={'password':'test-password-only'})
  eid=str(uuid.uuid4());payload={'id':eid,'type':'gift','user_id':'persistent','name':'Linh','gift_id':'demo-rose','count':7,'combo_id':'persist'}
  with c.websocket_connect('/ws') as ws:
   assert ws.receive_json()['type']=='snapshot'
   assert c.post('/api/demo/events',json=payload).status_code==200
   assert ws.receive_json()['state']['users']['persistent']['points']==7
  with c.websocket_connect('/ws') as ws:
   assert ws.receive_json()['state']['users']['persistent']['points']==7
   ws.send_text('sync');assert ws.receive_json()['type']=='snapshot'
  import json
  loaded=Game(json.loads(db.execute('SELECT data FROM state WHERE id=1').fetchone()[0]))
  assert loaded.s['users']['persistent']['points']==7
  assert db.execute('SELECT COUNT(*) FROM events WHERE id=?',(eid,)).fetchone()[0]==1
  assert c.get('/stage').status_code==200
  import subprocess,sys
  subprocess.run([sys.executable,'-c',"from backend.main import game; assert '"+eid+"' in game.seen; assert game.combos[('persistent','demo-rose','persist')]==7; assert game.s['users']['persistent']['points']==7"],check=True,capture_output=True)

def test_tts_provider_failure_keeps_game_running(monkeypatch):
 from backend.main import tts
 async def fail(text):raise RuntimeError('simulated provider failure')
 monkeypatch.setattr(tts,'synthesize',fail)
 with TestClient(app) as c:
  c.post('/api/login',json={'password':'test-password-only'})
  game.s['speeches']=[];game.last_mc={}
  assert c.post('/api/control',json={'action':'open'}).status_code==200
  assert c.get('/api/state').json()['speeches'][-1]['provider']=='browser-fallback'
