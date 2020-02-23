#!/usr/bin/python3

"""

Save schema json to fresh db

"""

import os
import json
import requests
import glob

SERVER_URL = os.getenv("SERVER_URL")
APP_ID = os.getenv("APP_ID")
MASTER_KEY = os.getenv("MASTER_KEY")


glob_pattern = "src/schemas/*.json"


print()
message = f"Updating schema from files: {glob_pattern}"
print("-" * len(message) + f"\n{message}\n" + "-" * len(message))


file_list = glob.glob(glob_pattern)


for filename in file_list:
    with open(filename, "r") as schema_file:
        obj = json.loads(schema_file.read())
        className = obj.get("className")
        print("className:", className)

        # These properties cannot be include in post call
        bad_fields = ["objectId", "createdAt", "updatedAt", "ACL"]
        for field in bad_fields:
            obj.get("fields").pop(field)
        obj.pop("indexes", None)

        # Build request to REST api server
        url = f"{SERVER_URL}/schemas/{className}"
        headers = {
            "X-Parse-Application-Id": APP_ID,
            "X-Parse-Master-Key": MASTER_KEY,
            "Content-Type": "application/json",
        }
        data = json.dumps(obj)

        # Post new schema
        response = requests.post(url, headers=headers, data=data)
        print("...", response.status_code, [f for f in obj.get("fields").keys()])

        # ...or try to patch schema if post fails
        if not response.ok and response.json().get("code") == 103:

            response = requests.put(url, headers=headers, data=data)
            print("...", response.status_code)
