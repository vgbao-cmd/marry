import copy,json,uuid
from fastapi.testclient import TestClient
from backend.main import app,game,db,save,Game

def test_full_room_snapshot_admin_replacement_and_cold_restore():
 original=copy.deepcopy(game.s)
 try:
  game.s=Game().s
  with TestClient(app) as c:
   assert c.post('/api/demo/fill').status_code==401
   c.post('/api/login',json={'password':'test-password-only'})
   for role in ('bride','groom'):
    c.post('/api/demo/events',json={'id':str(uuid.uuid4()),'type':'join','user_id':role,'name':role})
    assert c.post('/api/control',json={'action':'assign','role':role,'user_id':role}).status_code==200
   assert c.post('/api/demo/fill').json()['seated_count']==100
   assert c.post('/api/demo/fill').json()['seated_count']==100
   before=c.get('/api/state').json();assert len(before['users'])==102
   for uid in ('overflow','overflow-2'):
    c.post('/api/demo/events',json={'id':str(uuid.uuid4()),'type':'join','user_id':uid,'name':'Khách chờ 🌸'})
   assert c.get('/api/state').json()['guest_waiting']==['overflow','overflow-2']
   uid=next(iter(before['guest_slots']));slot=before['guest_slots'][uid]
   with c.websocket_connect('/ws') as ws:
    ws.receive_json();assert c.post('/api/control',json={'action':'guest_admit','user_id':'overflow-2','replace_user_id':uid}).status_code==200
    state=ws.receive_json()['state'];assert state['guest_slots']['overflow-2']==slot
   with c.websocket_connect('/ws') as ws:
    assert ws.receive_json()['state']['guest_slots']==state['guest_slots']
   for old,index in before['guest_slots'].items():
    if old!=uid:assert state['guest_slots'][old]==index
   saved=Game(json.loads(db.execute('SELECT data FROM state WHERE id=1').fetchone()[0]))
   assert saved.s['guest_slots']==state['guest_slots'] and saved.s['guest_waiting']==['overflow']
   assert c.post('/api/control',json={'action':'guest_admit','user_id':'overflow'}).status_code==422
 finally:game.s=original;save()
