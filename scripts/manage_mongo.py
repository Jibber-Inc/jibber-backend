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


###############################################################################
### Manage Reservation Collection #############################################
###############################################################################

# Get Reservation Collection
reservation_collection = Collection(db, "Reservation")

# Should have 1 unique "code" index
code_indexes = []
for index in reservation_collection.list_indexes():
    if index.get("key").has_key("code"):
        code_indexes.append(index)

# create "code" index if doesnt exist
if not code_indexes:
    print("Reservation: no index with field 'code', creating...")
    reservation_collection.create_index("code", unique=True)
    reservation_collection.reindex()
else:
    # Should only be 1 code index
    if len(code_indexes) > 1:
        print("Reservation: too many index for 'code', dropping all and recreating...")
        for index in code_indexes:
            reservation_collection.drop_index(index.get("name"))
        reservation_collection.create_index("code", unique=True)
        reservation_collection.reindex()
    else:
        # To modify an existing index, you need to drop and recreate the index.
        if not code_indexes[0].get("unique"):
            print("Reservation: 'code' index is not unique, dropping/recreating...")
            reservation_collection.drop_index(code_indexes[0].get("name"))
            reservation_collection.create_index("code", unique=True)
            reservation_collection.reindex()
    print("Reservation: Nothing to update.")

