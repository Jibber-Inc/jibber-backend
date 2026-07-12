# Jibber Backend

Jibber's API is an Express application backed by Parse Server.

## Supported runtime

- Node.js 22.13 or newer in the Node 22 release line
- npm 10 or 11
- Parse Server 9.9.0 and Parse JavaScript SDK 8.6.0
- MongoDB 7
- Python 3.11 with PyMongo 4 for schema and index migrations

The production container pins Node 22.22.0. The local Compose stack runs a
MongoDB 7 service and defaults `DATABASE_URI` to
`mongodb://mongodb:27017/jibber`; an explicitly supplied `DATABASE_URI` still
takes precedence.

## Local setup

Install the JavaScript and migration dependencies:

```sh
npm ci
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

At minimum, configure `APP_ID`, `MASTER_KEY`, `DATABASE_URI`, `SERVER_URL`, and
`JIBBER_SECRET_PASSWORD_TOKEN`.
Production deployments should also configure the appropriate values for:

- `PUBLIC_SERVER_URL` and `CLOUD_CODE_MAIN`
- `S3_BUCKET` plus standard AWS credentials for file storage
- `IOS_APN_KEY`, `IOS_KEY_ID`, `IOS_TEAM_ID`, `IOS_BUNDLE_ID`, and
  `IOS_PUSH_PRODUCTION` for APNs
- `REDIS_URL` when LiveQuery is shared across multiple instances
- Twilio credentials when SMS verification is enabled

Run the source server with automatic reloads:

```sh
npm run dev:watch
```

Build and run the production output:

```sh
npm run build
npm start
```

The root endpoint returns application health. Parse Server health is available
at `/parse/health` unless `PARSE_MOUNT` changes the mount path.

## Database migrations

With the API running and `APP_ID`, `MASTER_KEY`, `SERVER_URL`, and
`DATABASE_URI` configured, apply the version-controlled Parse schemas and
MongoDB indexes:

```sh
python scripts/migrate.py
```

The migration fails if a required index exists with incompatible keys or
options.

## Parse-native messaging

Parse is the only messaging runtime. There is no external chat provider,
provider token endpoint, or provider webhook route. The cutover intentionally
starts with fresh Parse conversation history rather than importing messages
from the previous provider. Authenticated clients query the ACL-protected
`Conversation`, `ConversationMember`, `Message`, `MessageReaction`, and
`MessageReceipt` classes directly; Cloud triggers validate membership,
ownership, tombstones, attachment limits, and ACLs.

The migration Cloud functions are:

- `messagingGetCapabilities`
- `messagingCreateConversation`
- `messagingSendMessage`
- `messagingGetMessageByClientId` for duplicate-write recovery
- `messagingAddReaction`
- `messagingMarkRead`
- `messagingSetConversationHidden`

`messagingCreateConversation` accepts an optional `clientConversationId`
(unique per creator). A public `contextKey` is reserved for canonical Moment
comments: it must equal `moment:<Moment.objectId>`, the conversation type must
be `moment`, and the authenticated creator must be that Moment's author.
Retrying with either key returns the existing conversation instead of creating
a duplicate. Provisioning retries repair missing requested memberships only
while `membershipRevision` is zero; after provisioning completes, retries
require an active owner/admin and never reactivate members who intentionally
left. Both idempotency fields are immutable after creation. Message roots expose server-derived
`replyCount` and bounded latest-reply summary fields, so thread lists do not
need one query per message.

Set `PARSE_MESSAGING_ENABLED=false` to disable messaging writes.
`PARSE_MESSAGING_MINIMUM_APP_VERSION` is surfaced by the capability response
and is the mandatory-update gate for the single-release cutover.
`MESSAGING_ATTACHMENT_CLEANUP_HOURS` controls the grace period used by the
`messagingCleanupDeletedAttachments` Cloud job. Cleanup detaches expired
tombstone attachment references and marks the message purged; it does not
physically delete Parse.Files because another object may share the same file.
When a minimum version is configured, every messaging write must include an
`X-Jibber-App-Version` semantic-version header at or above that value. This is
enforced by both write Cloud functions and direct-write triggers; clients that
cannot attach the header to direct Parse saves must use the Cloud functions
during cutover. Capability discovery and idempotency recovery remain callable
so an outdated client can discover the upgrade requirement safely.

## Tests and checks

```sh
npm run build
npm run lint
npm test
```

`npm test` starts MongoDB 7 locally and stops it when Jest exits. Port 27017 and
the API port (1337 by default) must be available. Integration tests that reach
Twilio require Twilio test credentials. Focused suites that do not exercise
Twilio may set `SKIP_TWILIO_INTEGRATION_CHECK=true`; do not use that override
for the complete suite. A focused suite that creates all of its own fixtures
may additionally set `SKIP_TEST_DATABASE_SEED=true`.

## Docker

`docker compose up --build` starts the development image, MongoDB 7, and Parse
Dashboard. Build the final production stage directly with:

```sh
docker build --target production -t jibber-backend .
```

## License

[MIT](LICENSE)
