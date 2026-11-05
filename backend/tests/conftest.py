import os,tempfile
from pathlib import Path
os.environ['MARRY_DB']=str(Path(tempfile.mkdtemp(prefix='marry-test-'))/'state.sqlite3')
os.environ['MARRY_ADMIN_PASSWORD']='test-password-only'
os.environ['MARRY_INGEST_TOKEN']='test-ingestion-only'
