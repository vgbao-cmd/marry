"""Persistent photographic stage assets. Viewer avatars never enter this registry."""
from copy import deepcopy
from typing import Literal
from pydantic import BaseModel, Field, model_validator

class Pose(BaseModel):
 url: str
 frames: list[tuple[int,int,int,int]] = Field(default_factory=list, max_length=60)
 fps: float = Field(default=8,ge=1,le=30)
 @model_validator(mode='after')
 def local(self):
  import re
  if not re.fullmatch(r'/(?:assets/wedding|media)/[A-Za-z0-9_./-]+\.(?:png|webp)',self.url) or '..' in self.url:raise ValueError('Chỉ dùng ảnh PNG/WebP nội bộ')
  if len({(f[2],f[3]) for f in self.frames})>1:raise ValueError('Các khung của một pose phải cùng kích thước')
  if any(min(x,y)<0 or min(w,h)<1 or max(x,y,w,h)>8192 for x,y,w,h in self.frames):raise ValueError('Khung sprite không hợp lệ')
  return self
class Character(Pose):
 label:str=Field(max_length=80)
 style:Literal['male','female']='male'
 height:float=Field(default=380,ge=50,le=700)
 foot_x:float=Field(default=.5,ge=0,le=1)
 foot_y:float=Field(default=.98,ge=.2,le=1)
 offset_x:float=Field(default=0,ge=-300,le=300)
 offset_y:float=Field(default=0,ge=-300,le=300)
 x:float=Field(default=540,ge=0,le=1080)
 y:float=Field(default=1050,ge=0,le=1800)
 poses:dict[Literal['idle','walk','celebrate','toast','dance','heart','talk'],Pose]=Field(default_factory=dict)
class Visuals(BaseModel):
 quality:Literal['low','medium','high']='medium'
 reduced_effects:bool=False
 backdrop:Pose
 characters:dict[str,Character]
 @model_validator(mode='after')
 def required(self):
  if not {'mc','bride','groom'}.issubset(self.characters) or not 5<=len(self.characters)<=35:raise ValueError('Cần MC, cô dâu, chú rể và ít nhất hai mẫu khách')
  for style in ('male','female'):
   if not any(k.startswith('guest-') and v.style==style for k,v in self.characters.items()):raise ValueError('Cần mẫu khách nam và nữ')
  import re
  if any(not re.fullmatch(r'(mc|bride|groom|guest-[a-z0-9-]{1,30})',k) for k in self.characters):raise ValueError('ID nhân vật không hợp lệ')
  return self

def defaults():
 def char(label,url,frame,style,height,x,y):
  return {'label':label,'url':url,'frames':[frame],'fps':8,'style':style,'height':height,'foot_x':.5,'foot_y':.98,'offset_x':0,'offset_y':0,'x':x,'y':y,'poses':{}}
 base='/assets/wedding/'
 chars={
  'mc':char('MC Minh',base+'principals.webp',[70,0,400,1024],'male',360,210,1040),
  'groom':char('Chú rể',base+'principals.webp',[540,0,390,1024],'male',410,460,1040),
  'bride':char('Cô dâu',base+'principals.webp',[930,0,606,1024],'female',410,650,1040),
 }
 styles=['male','female','male','female','female','male','female','male']
 for i,style in enumerate(styles):chars['guest-'+str(i+1)]=char('Khách '+str(i+1),base+'guests.webp',[(i%4)*384,(i//4)*512,384,512],style,215,540,1500)
 return {'quality':'medium','reduced_effects':False,'backdrop':{'url':base+'ballroom.webp','frames':[],'fps':8},'characters':chars}
