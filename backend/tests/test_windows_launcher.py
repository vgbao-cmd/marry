import importlib.util,socket,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('launcher',ROOT/'scripts/windows_tools.py');launcher=importlib.util.module_from_spec(spec);spec.loader.exec_module(launcher)

def test_port_conflict_is_reported_without_stopping_listener(capsys):
 with socket.socket() as sock:
  sock.bind(('127.0.0.1',0));sock.listen();port=sock.getsockname()[1]
  assert launcher.check_ports([port])==1;assert str(port) in capsys.readouterr().err
  with socket.create_connection(('127.0.0.1',port),timeout=1):pass
 assert launcher.check_ports([port])==0

def test_port_helper_from_path_with_spaces_and_other_cwd(tmp_path):
 folder=tmp_path/'Marry Live With Spaces'/'scripts';folder.mkdir(parents=True)
 helper=folder/'windows_tools.py';helper.write_bytes((ROOT/'scripts/windows_tools.py').read_bytes())
 with socket.socket() as sock:
  sock.bind(('127.0.0.1',0));sock.listen();port=sock.getsockname()[1]
  result=subprocess.run([sys.executable,str(helper),'ports',str(port)],cwd=tmp_path,capture_output=True,text=True)
  assert result.returncode==1 and str(port) in result.stderr

def test_batch_contract_static_only_not_windows_execution():
 for name in ('setup.bat','run.bat'):
  raw=(ROOT/name).read_bytes();assert b'\r\n' in raw and b'\n' not in raw.replace(b'\r\n',b'')
  text=raw.decode('ascii').lower();assert 'pushd "%~dp0"' in text and 'disabledelayedexpansion' in text and 'pause' in text
  assert 'taskkill' not in text and 'powershell' not in text.replace('no powershell activation is needed.','')
 run=(ROOT/'run.bat').read_text().lower();assert 'pip install' not in run and 'npm ci' not in run and '--strictport' in run
 setup=(ROOT/'setup.bat').read_text().lower();assert 'if exist ".env" goto env_ready' in setup

def test_env_creation_is_exclusive_and_preserves_existing_content(tmp_path):
 (tmp_path/'.env.example').write_text('MARRY_DB=backend/data/marry.sqlite3\n')
 assert launcher.init_env(tmp_path)==0
 assert (tmp_path/'.env').read_text()==(tmp_path/'.env.example').read_text()
 (tmp_path/'.env').write_text('existing-local-configuration\n')
 assert launcher.init_env(tmp_path)==0
 assert (tmp_path/'.env').read_text()=='existing-local-configuration\n'
