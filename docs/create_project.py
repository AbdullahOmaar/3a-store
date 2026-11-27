#!/usr/bin/env python3
"""Create the standalone 3a-store Supabase project under the token account's org.
The DB password is generated in-memory, used once for creation, and never printed or stored.
"""
import secrets
import string
import sys

sys.path.insert(0, "/home/hatch/workspace/custom-connectors/custom.supabase/bin")
from supabase_api import call

ORG = "plarxuqqydupkwfrndkv"

orgs = call("GET", "/v1/organizations")
print("orgs:", [(o.get("id"), o.get("name")) for o in orgs])

alphabet = string.ascii_letters + string.digits + "!@#%^*-_=+"
db_pass = "".join(secrets.choice(alphabet) for _ in range(32))

result = call("POST", "/v1/projects", {
    "name": "3a-store",
    "organization_id": ORG,
    "region": "eu-west-1",
    "db_pass": db_pass,
})
print("created:", result.get("id"), result.get("ref"), result.get("status"), result.get("name"))
