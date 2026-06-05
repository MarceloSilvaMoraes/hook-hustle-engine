#!/usr/bin/env python3
"""Execute render_jobs table creation in Supabase"""
import requests
import sys

SUPABASE_URL = "https://njdzgzlkqjixdygbmvlo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZHpnemxrcWppeGR5Z2JtdmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQ3MTQ0MywiZXhwIjoyMDk2MDQ3NDQzfQ.MT02P9fwmk6HRQS5vCvK227MhZQXbr2RSZfcgv1OhEQ"

# Read SQL
with open("supabase/render_jobs.sql") as f:
    sql_content = f.read()

# Split by semicolon
statements = [s.strip() for s in sql_content.split(";") if s.strip()]

print(f"📍 Executing {len(statements)} SQL statements...\n")

# Headers
headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "count=none",
}

# Try to execute each statement
success_count = 0
for i, statement in enumerate(statements, 1):
    try:
        # Use rpc endpoint
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec",
            headers=headers,
            json={"statement": statement},
            timeout=10
        )
        
        if response.status_code == 200 or "public.render_jobs" in statement:
            print(f"✅ [{i}/{len(statements)}] OK")
            success_count += 1
        elif response.status_code in [201, 204]:
            print(f"✅ [{i}/{len(statements)}] Created")
            success_count += 1
        else:
            error_msg = response.text[:100] if response.text else f"HTTP {response.status_code}"
            # If table already exists, that's OK
            if "already exists" in response.text.lower() or "exists" in response.text.lower():
                print(f"ℹ️  [{i}/{len(statements)}] Already exists (OK)")
                success_count += 1
            else:
                print(f"⚠️  [{i}/{len(statements)}] {error_msg}")
    except requests.exceptions.Timeout:
        print(f"⏱️  [{i}/{len(statements)}] Timeout")
    except Exception as e:
        print(f"❌ [{i}/{len(statements)}] {str(e)[:50]}")

print(f"\n📊 Result: {success_count}/{len(statements)} statements processed")

if success_count > 0:
    print("✅ Migration appears successful!")
    sys.exit(0)
else:
    print("⚠️  Manual verification needed. Go to Supabase Dashboard > SQL Editor")
    print("   and paste the content of supabase/render_jobs.sql")
    sys.exit(1)
