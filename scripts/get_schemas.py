"""

Get all schemas from production API and copy data to schemas dir

"""

import os
import sys
import json
import requests


# Load environment variables
PRODUCTION_SERVER_URL = os.getenv("PRODUCTION_SERVER_URL")
PRODUCTION_APP_ID = os.getenv("PRODUCTION_APP_ID")
PRODUCTION_MASTER_KEY = os.getenv("PRODUCTION_MASTER_KEY")


# Check environment variables
if not PRODUCTION_SERVER_URL:
    sys.exit("PRODUCTION_SERVER_URL required")
if not PRODUCTION_APP_ID:
    sys.exit("PRODUCTION_APP_ID required")
if not PRODUCTION_MASTER_KEY:
    sys.exit("PRODUCTION_MASTER_KEY required")


# Make request to production server
response = requests.get(
    f"{PRODUCTION_SERVER_URL}/schemas",
    headers={
        "X-Parse-Application-Id": PRODUCTION_APP_ID,
        "X-Parse-Master-Key": PRODUCTION_MASTER_KEY,
        "Content-Type": "application/json",
    },
)


print(f"\nResponse: {response.status_code} {response.reason}\n")


# Save response data to src/schemas
if response.ok:
    results = response.json().get("results")
    for schema in results:
        className = schema.get("className")
        if className[0] is not "_":
            filename = f"src/schemas/{className}.json"
            with open(filename, "w") as schema_file:
                print(f"Saving {filename} ...")
                schema_file.write(f"{json.dumps(schema, indent=2)}\n")
