import os
import requests
from dotenv import load_dotenv

load_dotenv()
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
headers = {"apikey": key, "Authorization": f"Bearer {key}"}
r = requests.get(
    "https://njdzgzlkqjixdygbmvlo.supabase.co/rest/v1/render_jobs?select=id,status,output_path,error_message&order=created_at.desc",
    headers=headers,
)
data = r.json()
if isinstance(data, list):
    for d in data:
        err = (d.get("error_message") or "")[:120]
        path = (d.get("output_path") or "")[:100]
        print(f"ID: {d['id'][:8]}  STATUS: {d['status']}")
        print(f"  PATH:  {path}")
        print(f"  ERROR: {err}")
        print()
else:
    print("Unexpected response:", data)
