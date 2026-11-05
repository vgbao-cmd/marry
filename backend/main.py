import asyncio, hashlib, hmac, json, os, secrets, sqlite3, time
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Literal
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Response, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, model_validator
from backend.game import Game, DEFAULT

class Event(BaseModel):
 id:str=Field(min_length=1,max_length=160)
 type:Literal['join','comment','like','gift','disconnect','reconnect']
 user_id:str=Field(default='source',min_length=1,max_length=100)
 name:str=Field(default='Khách mời',min_length=1,max_length=80)
 text:str=Field(default='',max_length=500)
 gift_id:str|None=None
 combo_id:str|None=Field(default=None,max_length=160)
 count:int=Field(default=1,ge=1,le=10000)
class Gift(BaseModel):
 name:str=Field(min_length=1,max_length=60)
 action:Literal['bride','groom','gift','fireworks','curtain','heart','dance','toast','celebrate']
 points:int=Field(ge=0,le=10000)
class Config(BaseModel):
 title:str=Field(max_length=80)
 announcement:str=Field(max_length=150)
 goal:int=Field(ge=1,le=1000000)
 curtain_seconds:int=Field(ge=3,le=60)
 cooldown:float=Field(ge=0,le=60)
 max_guests:int=Field(ge=1,le=48)
 mc_volume:float=Field(ge=0,le=1)
 music_volume:float=Field(ge=0,le=1)
 effect_volume:float=Field(ge=0,le=1)
 speech_rate:float=Field(ge=.5,le=1.5)
 speech_pause:int=Field(ge=0,le=5000)
 voice:str=Field(max_length=200)
 keywords:dict[str,str]
 gifts:dict[str,Gift]
 @model_validator(mode='after')
 def valid_rules(self):
  allowed={'celebrate','toast','dance','heart','male','female','join','bride','groom'}
  if len(self.keywords)>100 or len(self.gifts)>100 or any(not k.strip() or v not in allowed for k,v in self.keywords.items()):raise ValueError('Luật không hợp lệ')
  return self

class TTSProvider:
 async def synthesize(self,text:str):
  # Replace this provider with an audited server-side vendor SDK.
  return {'provider':'browser-fallback','audio_url':None,'text':text,'warning':'Chưa cấu hình giọng MC dịch vụ; giọng trình duyệt tùy thiết bị.'}

DB=Path(os.getenv('MARRY_DB','backend/data/marry.sqlite3')); DB.parent.mkdir(parents=True,exist_ok=True)
db=sqlite3.connect(DB,check_same_thread=False)
db.executescript('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, data TEXT); CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, data TEXT);')
row=db.execute('SELECT data FROM state WHERE id=1').fetchone();game=Game(json.loads(row[0]) if row else None)
if not row:
 for i,name in enumerate(['Linh Chi','Tuấn Anh','Ngọc Hân','Đức Minh','Thảo Vy','Quỳnh Anh','Gia Bảo','Mai Phương','Hải Đăng','Khánh Linh','Bảo Ngọc','Thanh Tùng','Minh Anh','Hoàng Nam','Thu Hà','Trung Kiên','Ánh Dương','Bảo An']):
  game.event({'id':'seed-'+str(i),'type':'join','user_id':'demo-'+str(i),'name':name})
 game.role('bride','demo-12');game.role('groom','demo-13')
 game.s['users']['demo-12']['style']='female';game.s['users']['demo-13']['style']='male'
 game.s['effects']=[];game.s['speeches']=[]

for eid,data in db.execute('SELECT id,data FROM events ORDER BY rowid'):
 game.seen.add(eid); e=json.loads(data)
 if e.get('combo_id'):
  key=(e['user_id'],e['gift_id'],e['combo_id']);game.combos[key]=max(game.combos.get(key,0),e['count'])
# Local-only bootstrap credential, never exposed by an HTTP endpoint.
password=os.getenv('MARRY_ADMIN_PASSWORD')
if not password:
 p=DB.parent/'admin-password.txt'
 password=p.read_text().strip() if p.exists() else secrets.token_urlsafe(24)
 if not password:password=secrets.token_urlsafe(24)
 p.write_text(password);p.chmod(0o600)
sessions={};clients=set();lock=asyncio.Lock();tts=TTSProvider();attempts={}
def save():
 db.execute('INSERT OR REPLACE INTO state VALUES (1,?)',(json.dumps(game.s,ensure_ascii=False),));db.commit()
def snapshot():
 s={k:v for k,v in game.s.items() if k!='logs'}
 # Keep all records server-side; send a bounded render set and leaderboard.
 ranked=sorted(game.s['users'].values(),key=lambda u:u['active'],reverse=True)
 selected=ranked[:game.s['config']['max_guests']]
 ids={u['id'] for u in selected}
 for uid in game.s['roles'].values():
  if uid and uid not in ids:selected.append(game.s['users'][uid])
 s['users']={u['id']:u for u in selected};s['guest_count']=len(ranked)
 s['leaders']=sorted(game.s['users'].values(),key=lambda u:u['points'],reverse=True)[:5]
 s['server_time']=time.time();return s
async def broadcast():
 for speech in game.s['speeches']:
  if 'provider' not in speech:
   try:speech.update(await tts.synthesize(speech['text']))
   except Exception:speech.update({'provider':'browser-fallback','audio_url':None})
 data={'type':'snapshot','state':snapshot()}
 async def send(ws):
  try:await asyncio.wait_for(ws.send_json(data),2)
  except Exception:clients.discard(ws)
 await asyncio.gather(*(send(ws) for ws in list(clients)))
async def authorized(request:Request):
 token=request.cookies.get('marry_session','')
 if sessions.get(token,0)<time.time():raise HTTPException(401,'Vui lòng đăng nhập quản trị')
@asynccontextmanager
async def lifespan(app):
 game.say('open');save();yield;save()
app=FastAPI(title='Marry Live',lifespan=lifespan)
@app.get('/api/health')
def health():return {'ok':True,'tts':'browser-fallback','tiktok_connected':False}
@app.get('/api/state')
def state():return snapshot()
@app.post('/api/login')
async def login(request:Request,response:Response):
 peer=request.client.host; now=time.time();recent=[t for t in attempts.get(peer,[]) if now-t<60]
 if len(recent)>=10:raise HTTPException(429,'Thử lại sau một phút')
 attempts[peer]=recent+[now];body=await request.json()
 if not hmac.compare_digest(str(body.get('password','')),password):raise HTTPException(401,'Mật khẩu không đúng')
 token=secrets.token_urlsafe(32);sessions[token]=now+12*3600
 response.set_cookie('marry_session',token,httponly=True,samesite='strict',secure=request.url.scheme=='https',max_age=43200)
 return {'ok':True}
@app.get('/api/admin',dependencies=[Depends(authorized)])
def admin():return {'config':game.s['config'],'logs':game.s['logs'],'users':list(game.s['users'].values()),'queues':game.s['queues']}
@app.post('/api/logout')
def logout(request:Request,response:Response):
 sessions.pop(request.cookies.get('marry_session',''),None);response.delete_cookie('marry_session');return {'ok':True}
@app.put('/api/config',dependencies=[Depends(authorized)])
async def config(body:Config):
 async with lock:
  game.s['config']=body.model_dump();game.s['milestones']=game.s['total']//body.goal;game.log('Đã lưu cấu hình');save();await broadcast()
 return {'ok':True}
@app.post('/api/control',dependencies=[Depends(authorized)])
async def control(request:Request):
 body=await request.json();action=body.get('action')
 if action not in {'start','stop','reset','reset_goal','end','next','assign','toast','dance','heart','fireworks','curtain','celebrate','open','mode'}:raise HTTPException(422,'Hành động không hợp lệ')
 async with lock:
  if action=='mode':
   if body.get('mode') not in ('demo','live'):raise HTTPException(422,'Chế độ không hợp lệ')
   game.s['mode']=body['mode'];game.s['source_status']='waiting_adapter' if body['mode']=='live' else 'demo'
  else:
   try:game.control(action,body.get('role'),body.get('user_id'))
   except ValueError as e:raise HTTPException(422,str(e))
  save();await broadcast()
 return {'ok':True}
async def ingest(e):
 async with lock:
  if game.s['mode']=='live' and e.type not in ('disconnect','reconnect'):game.s['source_status']='adapter'
  accepted=game.event(e.model_dump())
  if accepted:
   db.execute('INSERT OR IGNORE INTO events VALUES (?,?)',(e.id,json.dumps(e.model_dump())));save();await broadcast()
  return {'accepted':accepted}
@app.post('/api/demo/events',dependencies=[Depends(authorized)])
async def demo(e:Event):
 if game.s['mode']!='demo':raise HTTPException(409,'Hãy chuyển sang Demo trước')
 return await ingest(e)
@app.post('/api/live/events')
async def live(e:Event,request:Request):
 token=os.getenv('MARRY_INGEST_TOKEN','')
 if not token or not hmac.compare_digest(request.headers.get('authorization',''),'Bearer '+token):raise HTTPException(401,'Adapter chưa được xác thực')
 if game.s['mode']!='live':raise HTTPException(409,'Chưa bật chế độ Live')
 return await ingest(e)
@app.post('/api/tts',dependencies=[Depends(authorized)])
async def speak(request:Request):
 body=await request.json();return await tts.synthesize(str(body.get('text',''))[:500])
@app.websocket('/ws')
async def websocket(ws:WebSocket):
 await ws.accept();clients.add(ws)
 try:
  await ws.send_json({'type':'snapshot','state':snapshot()})
  while True:
   await ws.receive_text();await ws.send_json({'type':'snapshot','state':snapshot()})
 except WebSocketDisconnect:pass
 finally:clients.discard(ws)
if Path('dist').exists():
 app.mount('/assets',StaticFiles(directory='dist/assets'),name='assets')
 @app.get('/')
 @app.get('/stage')
 @app.get('/admin')
 @app.get('/demo')
 def frontend():return FileResponse('dist/index.html')
