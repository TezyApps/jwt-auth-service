# Design Log

One entry per thing that broke and what changed, per PLAN.md.

## Step 1 — Server skeleton

- Initial `app.listen(3000)` had no callback, so the server gave zero console output on start — looked "hung" with no way to tell it was actually listening. Added a `listen` callback that logs a startup message.
- `res.send('Ok')` sent plain text, not the `{ status: "ok" }` JSON the checkpoint required. Switched to `res.send({ status: 'ok' })` (Express serializes objects to JSON automatically).
- Running via `node src/app.ts` and stopping with `Ctrl+C` always logs `pnpm`'s `ELIFECYCLE Command failed` — this is expected, not a bug. `SIGINT` has no handler, so Node exits with a non-zero/signal exit code, and pnpm reports any non-zero exit as a failed command. Harmless for local dev; would only matter if graceful shutdown (e.g. closing DB connections) is needed later.

## Tooling decision — running TypeScript directly

- Initially added `tsx` as a dev dependency to run `.ts` files, which also forced a `pnpm-workspace.yaml` `allowBuilds: esbuild: true` entry (pnpm blocks arbitrary postinstall scripts by default; `tsx`'s `esbuild` dependency needs one).
- Reversed this: `tsconfig.json` already sets `"erasableSyntaxOnly": true`, which restricts the code to the exact TS subset Node's native type-stripping supports (Node 24.16.0 supports this without flags). `tsx` was solving a problem that didn't exist yet (no non-erasable syntax, no need for file-watching). Removed `tsx` and `pnpm-workspace.yaml`, switched the `dev` script to `node src/app.ts` directly.

## Step 2 — DynamoDB client (`db/client.ts`)

- `noEmit: true` in `tsconfig.json` has no effect on how the app actually runs — `node`'s native type-stripping never consults `tsc`'s emit settings at all. `noEmit` only matters for a separate, future `tsc --noEmit` type-check step (e.g. in CI), not for running the app locally.
- First implementation built `client`/`docClient` inside an `if (NODE_ENV === 'local')` block with `const` — block-scoped and never exported, so nothing outside the file could use them, and there was no `else` branch for the real-AWS case. Fixed by declaring a `config: DynamoDBClientConfig` at module scope (default `{}` for the real-AWS path), conditionally overriding it for `local`, then constructing and exporting `dbClient`/`docClient` once, after the conditional.
- Used `region: process.env.NODE_ENV` initially (happened to evaluate to `"local"` and "work" only by coincidence, since DynamoDB Local ignores the region value). Replaced with an explicit `'local'` literal — passing the environment name as if it were an AWS region was semantically wrong and fragile.

## Step 3 — Users table (`db/create.users.table.ts`)

- `AttributeDefinitions` initially declared both `email` and `password`. DynamoDB requires `AttributeDefinitions` to list **only** attributes used in `KeySchema` (or a GSI/LSI) — including `password` caused a `ValidationException` at runtime (attribute count mismatch). DynamoDB is schemaless outside declared keys, so non-key attributes like `password` never need to be declared. Removed it — only `email` remains.
- Table-creation code originally lived directly inside `client.ts` and ran unconditionally at module load. Since `app.ts` imports from `client.ts` to get `docClient`, this meant `CreateTableCommand` would fire on every server start — throwing `ResourceInUseException` on the second run once the table already existed. Split table creation into its own one-time script (`create.users.table.ts`), separate from `client.ts`'s sole job of constructing the client.
- Import bug: `import { dbClient } from 'db/client'` (bare specifier, no `./`) — Node's ESM resolver treats this as a `node_modules` package lookup, which doesn't exist, throwing `ERR_MODULE_NOT_FOUND`. Since raw `.ts` files are run directly (no bundler), relative imports need the real file extension: `import { dbClient } from './client.ts'`.
- Credential format: DynamoDB Local (image version 3.3.1 tested here) throws `UnrecognizedClientException: The Access Key ID or security token is invalid` if the dummy `accessKeyId` contains characters outside the real AWS key format (e.g. a hyphen, as in `'local-access'`) — even though it never validates the credentials are *authentic*. This is a version-specific strictness, not documented behavior to assume holds everywhere. Fixed by using alphanumeric-only dummy values (`localaccesskeyid` / `localsecretaccesskey`).
- `CreateTableCommand` defaults to `BillingMode: 'PROVISIONED'` when unset, which then requires an explicit `ProvisionedThroughput` — omitting both throws `ValidationException: No provisioned throughput specified for the table`. Fixed by setting `BillingMode: "PAY_PER_REQUEST"` (on-demand), avoiding capacity planning for a project with unknown traffic patterns.
- DynamoDB Local runs with `SharedDb: false` (visible in its startup log) by default — this partitions its in-memory data by the unique `region` + `accessKeyId` combination used in each request, emulating per-account isolation. `aws dynamodb list-tables` returned an empty list until the CLI call used the *exact same* dummy credentials/region the creation script used — the table existed the whole time, just under a different credential "slot." Not currently changed (no `-sharedDb` flag added to `docker-compose.yml`) — noted as a deliberate trade-off: consistency of matching credentials everywhere vs. a single shared local database regardless of which key is used.

## Deliberately deferred (per PLAN.md)

Not built yet — noting here per PLAN.md's instruction to record each conscious skip:
- Refresh tokens
- Password reset flow
- Rate limiting on login
- Keychain storage (Step 2, iOS)
