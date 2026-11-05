import uuid
from backend.game import Game

def event(g,kind='gift',uid='u',**kw):
 return g.event({'id':str(uuid.uuid4()),'type':kind,'user_id':uid,'name':'Khách',**kw})
def test_duplicate_and_combo():
 g=Game();e={'id':'same','type':'gift','user_id':'u','name':'A','gift_id':'demo-rose','count':3,'combo_id':'c'}
 assert g.event(e);assert not g.event(e)
 event(g,gift_id='demo-rose',count=5,combo_id='c');event(g,gift_id='demo-rose',count=4,combo_id='c')
 assert g.s['total']==5 and g.s['users']['u']['points']==5
 event(g,gift_id='demo-rose',count=2,combo_id='new');assert g.s['total']==7

def test_multiple_milestones():
 g=Game();g.s['config']['goal']=10
 event(g,gift_id='demo-rose',count=35)
 assert g.s['milestones']==3
 assert len([l for l in g.s['logs'] if 'Đạt mốc' in l['message']])==3
 event(g,gift_id='demo-rose',count=2);assert g.s['milestones']==3

def test_competing_roles_and_next():
 g=Game();event(g,uid='a',gift_id='demo-clover');event(g,uid='b',gift_id='demo-clover');event(g,uid='b',gift_id='demo-clover')
 assert g.s['roles']['bride']=='a' and g.s['queues']['bride']==['b']
 event(g,uid='a',gift_id='demo-pig');assert g.s['roles']['groom'] is None
 g.control('next','bride');assert g.s['roles']['bride']=='b'

def test_keywords_boundaries_and_styles():
 g=Game();event(g,'comment',text='việt namese');assert g.s['users']['u']['action']=='idle'
 event(g,'comment',text='  CHÚC   MỪNG! ');assert g.s['users']['u']['action']=='celebrate'
 event(g,'comment',text='nữ');assert g.s['users']['u']['style']=='female'

def test_reset_and_burst():
 g=Game()
 for i in range(250):event(g,'join',uid=str(i))
 assert len(g.s['users'])==250 and len(g.s['effects'])<=16
 event(g,gift_id='demo-rose',count=30);g.control('reset_goal');assert g.s['total']==0 and g.s['users']['u']['points']==30
 g.control('reset');assert g.s['users']['u']['points']==0 and g.s['round']==2

def test_pause_and_disconnect():
 g=Game();g.control('stop');event(g,'join');assert not g.s['users']
 event(g,'disconnect');assert g.s['source_status']=='disconnected'
 event(g,'reconnect');assert g.s['source_status']=='demo'
