import copy,json,uuid
from backend.game import Game,fresh

def join(g,uid):g.event({'id':str(uuid.uuid4()),'type':'join','user_id':uid,'name':'Khách '+uid+' 🌸'})
def full():
 g=Game();join(g,'bride');join(g,'groom');g.role('bride','bride');g.role('groom','groom')
 for i in range(100):join(g,str(i))
 return g

def test_hundred_plus_roles_and_101st_waits_without_moving():
 g=full();before=copy.deepcopy(g.s['guest_slots']);assert len(before)==100
 join(g,'101');join(g,'101');assert g.s['guest_slots']==before;assert g.s['guest_waiting']==['101']
 for kind,extra in [('comment',{'text':'chúc mừng'}),('gift',{'gift_id':'demo-rose','count':5})]:
  g.event({'id':str(uuid.uuid4()),'type':kind,'user_id':'20','name':'Ngọc Hân 👩🏻‍❤️‍👨🏻',**extra})
 assert g.s['guest_slots']==before;assert g.s['users']['20']['highlight_until']>0
 assert g.s['roles']=={'bride':'bride','groom':'groom'}

def test_leave_fifo_and_manual_waiting_swap():
 g=full();join(g,'101');join(g,'102');before=copy.deepcopy(g.s['guest_slots']);slot=before['4']
 g.guest_admit('102','4');assert g.s['guest_slots']['102']==slot;assert g.s['guest_waiting']==['101']
 for uid,index in before.items():
  if uid!='4':assert g.s['guest_slots'][uid]==index
 g.guest_leave('5');assert g.s['guest_slots']['101']==before['5'];assert not g.s['guest_waiting']
 assert '4' in g.s['users'] and '5' in g.s['users']

def test_role_changes_at_capacity_keep_unrelated_slots():
 g=full();join(g,'waiting');before=copy.deepcopy(g.s['guest_slots']);g.control('assign','bride','20')
 assert g.s['roles']['bride']=='20' and '20' not in g.s['guest_slots']
 assert len(g.s['guest_slots'])==100 and g.s['guest_slots']['waiting']==before['20']
 assert g.s['guest_waiting']==['bride']
 for uid,index in before.items():
  if uid!='20':assert g.s['guest_slots'][uid]==index

def test_reconnect_restart_departure_and_capacity_change():
 g=full();join(g,'101');before=copy.deepcopy(g.s['guest_slots'])
 for kind in ('disconnect','reconnect'):g.event({'id':str(uuid.uuid4()),'type':kind})
 restarted=Game(json.loads(json.dumps(g.s)));assert restarted.s['guest_slots']==before;assert restarted.s['guest_waiting']==['101']
 restarted.s['config']['max_guests']=80;restarted.sync_attendance();assert len(restarted.s['guest_slots'])==80
 for uid,slot in before.items():
  if slot<80:assert restarted.s['guest_slots'][uid]==slot
 restarted.s['config']['max_guests']=100;restarted.sync_attendance();assert len(restarted.s['guest_slots'])==100
 restarted.guest_leave('0');assert '0' not in restarted.s['guest_slots']
 restarted.event({'id':str(uuid.uuid4()),'type':'comment','user_id':'0','name':'Khách','text':'hi'})
 assert '0' not in restarted.s['guest_slots'];join(restarted,'0');assert '0' in restarted.s['guest_waiting'] or '0' in restarted.s['guest_slots']

def test_legacy_render_limit_migration_and_saved_capacity():
 old=fresh();old['config']['max_guests']=36;g=Game(old);assert g.s['config']['max_guests']==100
 g.s['config']['max_guests']=70;assert Game(copy.deepcopy(g.s)).s['config']['max_guests']==70
