#!/usr/bin/python3

"""Apply Parse schemas and the database indexes required by messaging.

Parse's schema endpoint does not support unique index options on this server
version, so unique messaging indexes are versioned separately and applied
directly to MongoDB. The migration verifies the persisted keys and options and
fails before messaging is enabled if an incompatible index already exists.
"""

import glob
import json
import os
import sys

import requests
from pymongo import MongoClient


SCHEMA_GLOB = "src/schemas/*.json"
INDEX_GLOB = "src/schemas/indexes/*.json"


def required_environment(name):
    value = os.getenv(name)
    if not value:
        sys.exit(f"{name} required")
    return value


def load_index_definitions(pattern=INDEX_GLOB):
    definitions = []
    for filename in sorted(glob.glob(pattern)):
        with open(filename, "r") as index_file:
            definitions.extend(json.load(index_file))
    return definitions


def migrate_schema(filename, server_url, headers):
    with open(filename, "r") as schema_file:
        schema = json.load(schema_file)

    class_name = schema.get("className")
    print("className:", class_name)

    # Parse-managed fields cannot be included in a schema create/update. Index
    # metadata is retained in source control but applied by the database phase
    # below so unique compound options are not silently discarded.
    for field in ["objectId", "createdAt", "updatedAt", "ACL"]:
        schema.get("fields", {}).pop(field, None)
    schema.pop("indexes", None)

    url = f"{server_url}/schemas/{class_name}"
    response = requests.post(url, headers=headers, data=json.dumps(schema))
    print("...", response.status_code, list(schema.get("fields", {}).keys()))

    if not response.ok and response.json().get("code") == 103:
        response = requests.put(url, headers=headers, data=json.dumps(schema))
        print("...", response.status_code)

    if not response.ok:
        raise RuntimeError(
            f"Schema migration failed for {class_name}: "
            f"{response.status_code} {response.text}"
        )


def connect_database(database_uri):
    username = os.getenv("PRODUCTION_DATABASE_USERNAME")
    password = os.getenv("PRODUCTION_DATABASE_PASSWORD")
    options = {}
    if username:
        options["username"] = username
    if password:
        options["password"] = password
    client = MongoClient(database_uri, **options)
    client.admin.command("ping")
    return client, client.get_default_database()


def normalized_keys(index):
    return [[key, direction] for key, direction in index.get("key", [])]


def index_matches(index, definition):
    return (
        normalized_keys(index) == definition.get("keys")
        and bool(index.get("unique", False))
        == bool(definition.get("unique", False))
        and index.get("partialFilterExpression")
        == definition.get("partialFilterExpression")
    )


def apply_and_verify_indexes(database, definitions):
    verified = []
    for definition in definitions:
        class_name = definition["className"]
        index_name = definition["name"]
        collection = database[class_name]
        existing = collection.index_information().get(index_name)

        if existing and not index_matches(existing, definition):
            raise RuntimeError(
                f"Messaging index {class_name}.{index_name} has "
                "incompatible keys or options"
            )

        if not existing:
            options = {
                "name": index_name,
                "unique": bool(definition.get("unique", False)),
            }
            partial_filter = definition.get("partialFilterExpression")
            if partial_filter:
                options["partialFilterExpression"] = partial_filter
            collection.create_index(
                [tuple(key) for key in definition["keys"]],
                **options,
            )

        persisted = collection.index_information().get(index_name)
        if not persisted or not index_matches(persisted, definition):
            raise RuntimeError(
                f"Messaging index {class_name}.{index_name} could not be verified"
            )

        qualified_name = f"{class_name}.{index_name}"
        print("Verified index:", qualified_name)
        verified.append(qualified_name)
    return verified


def main():
    server_url = required_environment("SERVER_URL")
    app_id = required_environment("APP_ID")
    master_key = required_environment("MASTER_KEY")
    headers = {
        "X-Parse-Application-Id": app_id,
        "X-Parse-Master-Key": master_key,
        "Content-Type": "application/json",
    }

    print()
    message = f"Updating schema from files: {SCHEMA_GLOB}"
    print("-" * len(message) + f"\n{message}\n" + "-" * len(message))
    for filename in sorted(glob.glob(SCHEMA_GLOB)):
        migrate_schema(filename, server_url, headers)

    definitions = load_index_definitions()
    if not definitions:
        return

    if os.getenv("SKIP_DATABASE_INDEXES") == "true":
        print("Skipping database index migration by explicit request.")
        return

    database_uri = os.getenv("DATABASE_URI") or os.getenv(
        "PRODUCTION_DATABASE_URI"
    )
    if not database_uri:
        sys.exit(
            "DATABASE_URI or PRODUCTION_DATABASE_URI required to apply "
            "messaging indexes (or set SKIP_DATABASE_INDEXES=true explicitly)"
        )

    client, database = connect_database(database_uri)
    try:
        apply_and_verify_indexes(database, definitions)
    finally:
        client.close()


if __name__ == "__main__":
    main()
