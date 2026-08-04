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

## Step 4 — User repo (`services/user.repo.ts`)

- Initial draft declared `createUser`, `getUserByEmail`, and a debug-only `listUsers` as plain `async function`s with no `export` — none of them were usable outside the file, same "built but unreachable" mistake as the earlier `client.ts` scoping bug.
- `getUserByEmail` fetched `res.Item` but only `console.log`ged it, never `return`ed it — every caller would get `undefined` back regardless of whether the user existed, breaking the login route's ability to check credentials.
- All three functions wrapped their DynamoDB call in `try/catch` and only `console.error`ed on failure, letting the function resolve normally either way. Concretely: `createUser`'s `ConditionExpression: "attribute_not_exists(email)"` (added to prevent a race condition where two concurrent registrations both pass a `getUserByEmail` check before either writes) would throw `ConditionalCheckFailedException` on a duplicate email — but that error was being swallowed here, so the register route would have no way to distinguish "created" from "already exists" and could never return the required `409`. Decision: this layer should let errors propagate untouched (no `try/catch` in the repo) and leave the interpretation of failures (e.g. mapping a conditional-check failure to a 409) to the route layer, consistent with repo functions being "pure data access, no HTTP concerns."
- `listUsers` (debug helper, not one of the two functions PLAN.md specifies) imported `ScanCommand` from `@aws-sdk/client-dynamodb` (the low-level client) instead of `@aws-sdk/lib-dynamodb`. `docClient`'s automatic marshalling/unmarshalling is keyed to the document-client command classes, so using the low-level `ScanCommand` risked returning raw `{ S: "..." }`-wrapped attribute values instead of plain objects, unlike the other two functions.

## Step 5 — Register route (`routes/auth.ts`)

- Mounted the router with `app.use('/auth', authRouter)` in `app.ts`, but the route inside was also defined as `authRouter.post('/auth/register', ...)` — Express concatenates both, so the real path became `/auth/auth/register`, unreachable at the intended `/auth/register`. Fixed by defining the route as just `'/register'` and letting the mount point supply the `/auth` prefix.
- Express 5 does not parse JSON request bodies by default — `req.body` was `undefined` until `app.use(express.json())` was added in `app.ts`, before the router mount.
- Error-handling branches originally called `res.status(409)` / `res.status(500)` without a following `.json()`/`.send()` — `res.status()` alone only sets the status code, it doesn't send a response. Without finalizing the response, the request would hang until client timeout. Fixed by chaining `.json({...})` after every `.status()` call.
- Also caught before it shipped: the success response briefly had a typo key (`usedId` instead of `userId`), and the 500 branch was serializing the raw `Error` object into the JSON response body. `Error` instances don't serialize usefully via `JSON.stringify` (message/stack are non-enumerable) and forwarding exception internals to the client is an information-leak risk on a public repo. Fixed by logging the full error server-side via `console.error` and returning a generic `{ error: 'Internal server error' }` to the client.
- Verified end-to-end: `POST /auth/register` returns `201 { userId: email }` on first registration and `409 { error: 'User already exists' }` on a duplicate, matching PLAN.md's checkpoint definition of done.

## Step 6 — Login route (`services/auth.service.ts`, `routes/auth.ts`)

- Refactored zod validation into a shared `validateSchema` helper used by both `registerNewUser` and `login`, instead of duplicating the schema.
- Same bug class as Step 4's `createUser`: the route's `401` branch initially checked `error.name === "Invalid credentials"`, but `login` throws a plain `new Error(ErrorCode.loginInvalidCredentials)`, which sets `error.message`, not `.name` — `.name` on a plain `Error` is always the literal `"Error"`, so the condition could never be true. Compounded by a typo'd duplicate of the error string instead of referencing the shared `ErrorCode` constant (case mismatch: `"Invalid credentials"` vs. the actual `"Invalid Credentials"`). Fixed by checking `error.message === ErrorCode.loginInvalidCredentials`, and later also converted the register route's `"ConditionalCheckFailedException"` literal into a matching named constant (`ErrorCode.awsDBConditionalCheckFailedException`) to remove the same drift risk there.
- `res.send(401).json({...})` — `res.send()` sends and finalizes the response immediately when given an argument; chaining `.json()` after it hit Express's "Cannot set headers after they are sent" error. Fixed to `res.status(401).json({...})`, matching the correct pattern already used elsewhere.
- JWT payload initially used object-shorthand `{ validEmail }`, which produces a claim key literally named `validEmail` instead of `email` — PLAN.md specifies payload `{ email }`, and the upcoming `/me` route depends on that exact claim name. Fixed to `{ email: validEmail }`.
- Response body key was `{ token }`; PLAN.md's checkpoint specifies `{ accessToken }`. Fixed.
- Confirmed both credential-failure branches (email not found, wrong password) throw the identical error and produce the identical `401 { error: "Invalid credentials" }` response — satisfies PLAN.md's "don't leak which one failed" requirement.
- Hit a stale-server issue while manually verifying: `curl` returned `404 Cannot POST /auth/login` even though the route existed in source. Root cause: the `dev` script (`node src/app.ts`) has no file-watching, and the running process predated the route being added — Node never picked up the change. Resolved by restarting the process manually. Not yet fixed at the tooling level (deliberately deferred, per explicit instruction) — `node --watch src/app.ts` would solve this without adding a dependency, same reasoning as the earlier `tsx` removal.

## Deliberately deferred (per PLAN.md)

Not built yet — noting here per PLAN.md's instruction to record each conscious skip:
- Refresh tokens
- Password reset flow
- Rate limiting on login
- Keychain storage (Step 2, iOS)
