import copy, re, time, uuid, random

DEFAULT = {
 'title': 'Minh Anh & Hoàng Nam', 'announcement': 'Một tiệc cưới, ngàn lời chúc',
 'goal': 100, 'curtain_seconds': 12, 'cooldown': 1, 'max_guests': 100,
 'name_font_size': 20, 'name_plate_width': 168, 'name_plate_height': 28, 'name_head_gap': 6,
 'guest_scale': 1.0, 'crowd_density': 1.0, 'aisle_width': 54,
 'mc_volume': .85, 'music_volume': .15, 'effect_volume': .3, 'speech_rate': .95, 'speech_pause': 600, 'voice': '',
 'keywords': {'chúc mừng':'celebrate','chuc mung':'celebrate','dzô':'toast','dô':'toast','do':'toast','nhảy':'dance','nhay':'dance','hôn đi':'heart','hon di':'heart','nam':'male','nữ':'female','nu':'female'},
 'gifts': {'demo-clover':{'name':'Cỏ 4 Lá','action':'bride','points':10}, 'demo-pig':{'name':'Heo May Mắn','action':'groom','points':10}, 'demo-rose':{'name':'Hoa hồng','action':'gift','points':1}, 'demo-firework':{'name':'Pháo hoa','action':'fireworks','points':20}},
}
LINES = {
 'open':['Xin kính chào quý vị đã đến chung vui cùng Marry Live!','Một buổi tối thật đẹp, xin chào đại gia đình của chúng ta!'],
 'join':['Xin chào những vị khách vừa đến, mời quý vị cùng chung vui!','Thật vui khi được đón thêm những người bạn mới!'],
 'gift':['Xin cảm ơn những món quà và lời chúc yêu thương của cả nhà!','Những tấm lòng quý mến đã làm buổi tiệc thêm ấm áp!'],
 'toast':['Xin mời cả nhà cùng nâng ly chúc phúc cho cô dâu và chú rể!','Một, hai, ba, cùng nâng ly nào cả nhà!'],
 'dance':['Mời quý vị cùng hòa mình vào tiết mục nhảy thật vui!','Sân khấu đã sẵn sàng, cùng nhảy với chúng tôi nhé!'],
 'bride':['Xin trân trọng chào đón cô dâu bước lên sân khấu!','Xin dành một tràng pháo tay cho cô dâu của chúng ta!'],
 'groom':['Xin mời chú rể bước lên sân khấu!','Một tràng pháo tay thật nồng nhiệt dành cho chú rể!'],
 'milestone':['Chúng ta vừa chạm một cột mốc yêu thương mới!','Cảm ơn cả nhà đã cùng hoàn thành mục tiêu mừng cưới!'],
 'curtain':['Xin gửi lời chúc trăm năm hạnh phúc đến đôi uyên ương!','Cùng đếm ngược cho khoảnh khắc yêu thương nhé!'],
 'end':['Cảm ơn quý vị đã chung vui, hẹn gặp lại ở vòng tiếp theo!','Xin chúc cả nhà một buổi tối thật hạnh phúc!'],
}

def fresh():
 return {'config':copy.deepcopy(DEFAULT),'running':True,'mode':'demo','users':{},'roles':{'bride':None,'groom':None},'queues':{'bride':[],'groom':[]},'total':0,'milestones':0,'round':1,'effects':[],'speeches':[],'logs':[],'last_event':None,'source_status':'demo','curtain_until':0}

class Game:
 def __init__(self,state=None):
  self.s=state or fresh()
  # Previous max_guests was a render cull, not an admission capacity.
  if self.s.get('attendance_version') != 1:
   self.s['config']['max_guests']=100
   self.s.update(attendance_version=1,guest_slots={},guest_waiting=[],guest_departed=[])
  if self.s.get('crowd_layout_version')!=2:
   keys=('name_font_size','name_plate_width','name_plate_height','name_head_gap')
   if tuple(self.s['config'].get(k) for k in keys)==(18,108,32,8):
    for k in keys:self.s['config'][k]=DEFAULT[k]
   self.s['crowd_layout_version']=2
  for key in ('guest_scale','crowd_density','aisle_width','name_font_size','name_plate_width','name_plate_height','name_head_gap'):
   self.s['config'].setdefault(key,DEFAULT[key])
  self.sync_attendance()
  self.seen=set(); self.combos={}; self.cooldowns={}; self.last_mc={}; self.last_line={}
 def sync_attendance(self):
  """Persisted, unique slot IDs: unrelated guests never move on an event."""
  capacity=self.s['config']['max_guests'];roles=set(self.s['roles'].values());departed=set(self.s['guest_departed']);users=self.s['users']
  seats=self.s['guest_slots'];overflow=[]
  for uid,slot in list(seats.items()):
   if uid not in users or uid in roles or uid in departed:del seats[uid]
   elif slot>=capacity:overflow.append(uid);del seats[uid]
  queued=[]
  for uid in overflow+self.s['guest_waiting']+sorted(users,key=lambda k:(users[k]['joined'],k)):
   if uid not in roles and uid not in departed and uid not in seats and uid in users and uid not in queued:queued.append(uid)
  free=[i for i in range(capacity) if i not in seats.values()]
  for slot in free:
   if not queued:break
   seats[queued.pop(0)]=slot
  self.s['guest_waiting']=queued
 def guest_leave(self,uid,replacement=None):
  if uid not in self.s['users']:raise ValueError('Khách không tồn tại')
  if replacement is not None and (replacement not in self.s['guest_waiting'] or uid not in self.s['guest_slots']):raise ValueError('Chọn khách đang đứng và người trong danh sách chờ')
  slot=self.s['guest_slots'].pop(uid,None)
  if uid not in self.s['guest_departed']:self.s['guest_departed'].append(uid)
  for role in ('bride','groom'):
   if self.s['roles'][role]==uid:self.s['roles'][role]=None
   self.s['queues'][role]=[k for k in self.s['queues'][role] if k!=uid]
  self.s['guest_waiting']=[k for k in self.s['guest_waiting'] if k!=uid]
  if replacement is not None:
   self.s['guest_waiting'].remove(replacement);self.s['guest_slots'][replacement]=slot
  self.sync_attendance()
 def guest_admit(self,uid,replace_user_id=None):
  if uid not in self.s['guest_waiting']:raise ValueError('Khách không có trong danh sách chờ')
  if replace_user_id is None:raise ValueError('Hết chỗ: chọn khách rời để thay bằng người đang chờ')
  self.guest_leave(replace_user_id,uid)
 def log(self,message):
  self.s['logs']=(self.s['logs']+[{'at':time.time(),'message':message}])[-100:]
 def say(self,kind,priority=1):
  now=time.time()
  if now-self.last_mc.get(kind,0)<(10 if kind in ('join','gift') else 2): return
  self.last_mc[kind]=now
  options=[x for x in LINES.get(kind,LINES['gift']) if x!=self.last_line.get(kind)]
  line=random.choice(options or LINES.get(kind,LINES['gift'])); self.last_line[kind]=line
  self.s['speeches']=(self.s['speeches']+[{'id':str(uuid.uuid4()),'text':line,'at':now,'priority':priority,'expires':now+25}])[-15:]
 def effect(self,kind,user=None):
  now=time.time(); self.s['effects']=[e for e in self.s['effects'] if e['until']>now][-15:]
  self.s['effects'].append({'id':str(uuid.uuid4()),'kind':kind,'user':user,'until':now+7})
  if kind=='curtain': self.s['curtain_until']=now+self.s['config']['curtain_seconds']
  if kind in LINES: self.say(kind,2 if kind in ('milestone','curtain') else 1)
 def role(self,role,uid):
  # A participant cannot occupy or queue for both roles.
  other='groom' if role=='bride' else 'bride'
  if self.s['roles'][other]==uid or uid in self.s['queues'][other]: return
  if self.s['roles'][role] is None:
   self.s['roles'][role]=uid; self.s['guest_departed']=[k for k in self.s['guest_departed'] if k!=uid]; self.effect(role,uid)
  elif self.s['roles'][role]!=uid and uid not in self.s['queues'][role]: self.s['queues'][role].append(uid)
  self.sync_attendance()
 def event(self,e):
  eid=e['id']
  if eid in self.seen: return False
  self.seen.add(eid)
  if e['type'] in ('disconnect','reconnect'):
   self.s['source_status']='disconnected' if e['type']=='disconnect' else ('adapter' if self.s['mode']=='live' else 'demo')
   self.log('Nguồn sự kiện: '+self.s['source_status']); return True
  if not self.s['running']: return True
  uid=e['user_id']; now=time.time(); self.s['last_event']=now
  u=self.s['users'].setdefault(uid,{'id':uid,'name':e['name'][:22], 'style': 'female' if sum(map(ord,uid))%2 else 'male','points':0,'joined':now,'active':now,'action':'idle','action_until':0})
  u['name']=' '.join(e['name'].split())[:80] or 'Khách mời'; u['active']=now
  kind=e['type']
  if kind=='join':self.s['guest_departed']=[k for k in self.s['guest_departed'] if k!=uid]
  self.sync_attendance()
  if kind in ('comment','gift'):u['highlight_until']=now+6
  action='join' if kind=='join' else 'heart' if kind=='like' else None
  if kind=='comment':
   msg=' '.join(e.get('text','').casefold().split())
   for keyword,value in self.s['config']['keywords'].items():
    if re.search(r'(?<!\w)'+re.escape(' '.join(keyword.casefold().split()))+r'(?!\w)',msg): action=value; break
  if kind=='gift':
   gift=self.s['config']['gifts'].get(e.get('gift_id'))
   if not gift: self.log('Quà chưa có mapping: '+str(e.get('gift_id'))); return True
   count=e.get('count',1)
   if e.get('combo_id'):
    key=(uid,e['gift_id'],e['combo_id']); old=self.combos.get(key,0)
    self.combos[key]=max(old,count); count=max(0,count-old)
   if count==0:return True
   points=gift['points']*count; u['points']+=points; self.s['total']+=points
   reached=self.s['total']//self.s['config']['goal']
   while self.s['milestones']<reached:
    self.s['milestones']+=1; self.effect('milestone'); self.log('Đạt mốc '+str(self.s['milestones']))
   action=gift['action']; self.say('gift')
  if action:
   key=(uid,action)
   if kind!='gift' and now-self.cooldowns.get(key,0)<self.s['config']['cooldown']: return True
   self.cooldowns[key]=now
   if action in ('male','female'):u['style']=action
   elif action in ('bride','groom'):self.role(action,uid)
   else:
    u['action']=action; u['action_until']=now+7; self.effect(action,uid)
  self.log(u['name']+': '+(e.get('text') or action or kind)); return True
 def control(self,action,role=None,user_id=None):
  if action=='start':self.s['running']=True; self.say('open')
  elif action=='stop':self.s['running']=False
  elif action=='reset_goal': self.s['total']=0; self.s['milestones']=0
  elif action in ('next','assign') and role in ('bride','groom'):
   if action=='assign':
    if user_id not in self.s['users']: raise ValueError('Khách không tồn tại')
    other='groom' if role=='bride' else 'bride'
    if self.s['roles'][other]==user_id:self.s['roles'][other]=None
    for queue in self.s['queues'].values():
     if user_id in queue:queue.remove(user_id)
    self.s['guest_departed']=[k for k in self.s['guest_departed'] if k!=user_id]
    self.s['roles'][role]=user_id
   else:self.s['roles'][role]=self.s['queues'][role].pop(0) if self.s['queues'][role] else None
   if self.s['roles'][role]:self.s['guest_departed']=[k for k in self.s['guest_departed'] if k!=self.s['roles'][role]]
   self.effect(role,self.s['roles'][role])
  elif action in ('end','reset'):
   self.s['roles']={'bride':None,'groom':None};self.s['queues']={'bride':[],'groom':[]};self.s['round']+=1;self.s['curtain_until']=0;self.s['effects']=[]
   if action=='reset':
    self.s['total']=0;self.s['milestones']=0
    for u in self.s['users'].values():u['points']=0
   self.say('end')
  else:self.effect(action)
  self.sync_attendance()
  self.log('Điều khiển: '+action)
