"""Portable launcher preflight. Never kills another process or reads secrets."""
import importlib.util
from pathlib import Path
import socket,sys
ROOT=Path(__file__).resolve().parent.parent

def check_ports(ports):
 for port in ports:
  with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as sock:
   if hasattr(socket,'SO_EXCLUSIVEADDRUSE'):sock.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1)
   try:sock.bind(('127.0.0.1',port))
   except OSError:
    print(f'[ERROR] Port {port} is already in use or unavailable. No process was stopped.\nClose the application that owns this port, then run run.bat again.',file=sys.stderr);return 1
 return 0

def dependencies():
 missing=[m for m in ('fastapi','uvicorn','websockets','PIL','multipart','dotenv') if importlib.util.find_spec(m) is None]
 if sys.version_info[:2]!=(3,12) or sys.prefix==sys.base_prefix:
  print('[ERROR] The .venv must use Python 3.12. Run setup.bat.',file=sys.stderr);return 1
 if missing:
  print('[ERROR] Missing backend dependencies: '+', '.join(missing)+'. Run setup.bat.',file=sys.stderr);return 1
 if not (ROOT/'node_modules/vite/bin/vite.js').is_file():
  print('[ERROR] Missing frontend dependencies. Run setup.bat.',file=sys.stderr);return 1
 return 0

def init_env(root=ROOT):
 try:
  with (root/'.env').open('x',encoding='utf-8',newline='') as target:target.write((root/'.env.example').read_text(encoding='utf-8'))
 except FileExistsError:pass
 return 0

if __name__=='__main__':
 if len(sys.argv)>1 and sys.argv[1]=='ports':sys.exit(check_ports([int(v) for v in sys.argv[2:]]))
 if len(sys.argv)>1 and sys.argv[1]=='dependencies':sys.exit(dependencies())
 if len(sys.argv)>1 and sys.argv[1]=='init-env':sys.exit(init_env())
 print('Usage: windows_tools.py ports PORT... | dependencies');sys.exit(2)
