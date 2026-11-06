import copy,json
from fastapi.testclient import TestClient
from backend.game import Game
from backend.main import app,game,save

def test_layout_defaults_migrate_only_old_defaults_and_keep_custom_values():
 g=Game();assert (g.s['config']['guest_scale'],g.s['config']['aisle_width'])==(1,54)
 old=copy.deepcopy(g.s);old.pop('crowd_layout_version');old['config'].update(name_font_size=18,name_plate_width=108,name_plate_height=32,name_head_gap=8)
 migrated=Game(old);assert migrated.s['config']['name_head_gap']==6 and migrated.s['config']['name_plate_width']==168
 custom=copy.deepcopy(g.s);custom.pop('crowd_layout_version');custom['config']['name_font_size']=24
 assert Game(custom).s['config']['name_font_size']==24

def test_layout_config_validation_and_persistence():
 original=copy.deepcopy(game.s)
 try:
  with TestClient(app) as c:
   c.post('/api/login',json={'password':'test-password-only'});config=c.get('/api/admin').json()['config']
   config.update(guest_scale=1.1,crowd_density=1.2,aisle_width=40,name_font_size=20,name_plate_width=170,name_head_gap=5)
   assert c.put('/api/config',json=config).status_code==200
   assert Game(copy.deepcopy(game.s)).s['config']['aisle_width']==40
   for key,value in [('guest_scale',2),('crowd_density',0),('aisle_width',300)]:
    bad={**config,key:value};assert c.put('/api/config',json=bad).status_code==422
 finally:game.s=original;save()

def test_demo_names_are_varied_and_never_overwrite_real_ids_or_slots():
 original=copy.deepcopy(game.s)
 try:
  game.s=Game().s
  for uid in ('demo100-0','crowd-1','real-viewer'):
   game.event({'id':uid,'type':'join','user_id':uid,'name':'Tên đang dùng'})
  before=copy.deepcopy(game.s['guest_slots'])
  with TestClient(app) as c:
   assert c.post('/api/demo/names').status_code==401
   c.post('/api/login',json={'password':'test-password-only'})
   assert c.post('/api/demo/names').json()['updated']==2
   assert game.s['users']['demo100-0']['name']!=game.s['users']['crowd-1']['name']
   assert game.s['users']['real-viewer']['name']=='Tên đang dùng' and game.s['guest_slots']==before
   game.s['mode']='live';assert c.post('/api/demo/names').status_code==409
  names=json.loads(__import__('pathlib').Path('backend/demo_names.json').read_text());assert len(names)==len(set(names))==100
 finally:game.s=original;save()
