#!/usr/bin/python3

import os
import sys

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.errors import ConnectionFailure


###############################################################################
### Make connection ###########################################################
###############################################################################

# Load environment variables
PRODUCTION_DATABASE_URI = os.getenv("PRODUCTION_DATABASE_URI")
PRODUCTION_DATABASE_USERNAME = os.getenv("PRODUCTION_DATABASE_USERNAME")
PRODUCTION_DATABASE_PASSWORD = os.getenv("PRODUCTION_DATABASE_PASSWORD")

# Check environment variables
if not PRODUCTION_DATABASE_URI:
    sys.exit("PRODUCTION_DATABASE_URI required")
if not PRODUCTION_DATABASE_USERNAME:
    sys.exit("PRODUCTION_DATABASE_USERNAME required")
if not PRODUCTION_DATABASE_PASSWORD:
    sys.exit("PRODUCTION_DATABASE_PASSWORD required")

# Build client
client = MongoClient(
    PRODUCTION_DATABASE_URI,
    username=PRODUCTION_DATABASE_USERNAME,
    password=PRODUCTION_DATABASE_PASSWORD,
)

# Confirm client can issue commands
try:
    # The ismaster command is cheap and does not require auth.
    client.admin.command("ismaster")
except ConnectionFailure:
    sys.exit("Server not available")

# Get default database
db = client.get_default_database()


def make_unique_indexes(name, field, collection):
    """Ensure that index for field in collection is unique.

    Parameters
    ----------
    name : str
        The name of the collection
    field : str
        The name of the field
    collection : Collection
        The collection
    """
    # Should have 1 unique index
    indexes = []
    for index in collection.list_indexes():
        if index.get("key").has_key(field):
            indexes.append(index)

    def create():
        # Create
        collection.create_index(field, unique=True)
        collection.reindex()

    # create index if doesn't exist
    if not indexes:
        print(f"{name}: no index with field {field}, creating...")
        create()
    else:
        # Should only be 1 index
        if len(indexes) > 1:
            print(f"{name}: too many index for {field}, dropping*/recreating...")
            for index in indexes:
                collection.drop_index(index.get("name"))
            create()
        else:
            # To modify an existing index, you need to drop and recreate the index.
            if not indexes[0].get("unique"):
                print(f"{name}: {field} index not unique, dropping/recreating...")
                collection.drop_index(indexes[0].get("name"))
                create()
        print(f"{name}: Nothing to update.")


###############################################################################
### Manage User Collection ####################################################
###############################################################################

# Get User Collection
name = "User"
collection = Collection(db, name)
make_unique_indexes(name, "phoneNumber", Collection(db, name))
make_unique_indexes(name, "handle", Collection(db, name))

###############################################################################
### Manage Reservation Collection #############################################
###############################################################################

# Get Reservation Collection
name = "Reservation"
collection = Collection(db, name)
make_unique_indexes(name, "code", collection)
make_unique_indexes(name, "position", collection)
