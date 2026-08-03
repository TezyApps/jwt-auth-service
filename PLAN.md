# Auth Side Project — Plan

## Goal

Build a REST auth API (register, login, /me) locally with DynamoDB Local. Optimize for learning systems design decisions, not just "make it work." See `SETUP.md` for environment and scaffolding.

## Sequencing principle

1. Local first — isolate business logic from infrastructure, so swapping the DB later is a config change, not a rewrite
2. Deploy to AWS
3. Enhance where it breaks (expect DynamoDB access-pattern pain here)
4. Repeat — each repetition tests one specific hypothesis (race conditions, throttling, etc.), not just "do it again"
5. Later: OAuth/SSO — compare hand-rolled auth against Auth0/Cognito once the hand-rolled version is solid
6. Load testing locally — pull this earlier; it can start as soon as Step 1 works, before any AWS bill is involved

Keep a running `DESIGN_LOG.md` — one entry per thing that broke and what changed. This log is the actual portfolio artifact, more than the code itself.

## Build order for Step 1 (each numbered item is a checkpoint — don't skip ahead)

1. **Server skeleton** — Express app with `GET /health` returning `{ status: "ok" }`
   Checkpoint: `curl localhost:3000/health` works.

2. **DynamoDB client** (`db/client.ts`) — points at `http://localhost:8000` when `NODE_ENV=local`. This is the one line that changes when you deploy to real AWS later — keep it isolated here on purpose.

3. **Create the Users table** — partition key `email` (string), via `CreateTableCommand` from `@aws-sdk/client-dynamodb`. Write this yourself rather than copying a snippet — this is where the DynamoDB mental model (partition keys, no free-text queries) actually clicks.

4. **User repo** (`services/user.repo.ts`) — two functions: `createUser(email, hashedPassword)` and `getUserByEmail(email)`. Pure data access, no HTTP concerns mixed in.

5. **Register route** — `POST /auth/register`
   - Validate body with `zod` (email format, password min 8 chars)
   - Check user doesn't already exist → `409` if so
   - Hash password with `bcrypt.hash(password, 10)`
   - Save to DynamoDB
   - Return `201 { userId: email }` — never return the password hash
   Checkpoint: register succeeds (`201`); registering the same email again returns `409`.

6. **Login route** — `POST /auth/login`
   - Fetch user by email → `401` if not found
   - `bcrypt.compare` the password
   - Sign a JWT (payload `{ email }`, short expiry e.g. `1h`, secret from `.env`)
   - Return `200 { accessToken }`
   - Use the same `401` for wrong email and wrong password — don't leak which one failed
   Checkpoint: correct credentials return a token; wrong password returns `401`.

7. **Auth middleware** (`middleware/auth.middleware.ts`) — reads `Authorization: Bearer <token>`, verifies with `jwt.verify`, attaches the decoded user to `req`, calls `next()` or returns `401`.

8. **/me route** — `GET /me`, protected by the middleware, returns the decoded email. This is the proof the whole chain works end to end.

## Definition of done for Step 1

A test sequence (Postman collection or curl script) that runs, in order:

```
register        → 201
register again  → 409
login            → 200, accessToken returned
/me (with token) → 200, email returned
/me (no token)   → 401
```

## Deliberately deferred

Not built in Step 1 — but note in `DESIGN_LOG.md` each time you consciously skip one, and why:

- Refresh tokens
- Password reset flow
- Rate limiting on login
- Keychain storage on the client side (that's Step 2, iOS)

## Next steps after Step 1

- **Step 2**: Consume the API from the SwiftUI app; token held in-memory for now, Keychain flagged as the correct final home
- **Step 3**: Load test locally with `autocannon` or `k6` against `/login` before deploying — cheap lessons (connection pool exhaustion, bcrypt cost factor vs throughput) learned before AWS costs are involved
- **Step 4**: Deploy to AWS (ECS Fargate + ALB + DynamoDB), treating the deployment itself as a design exercise — secrets management, health checks, cold starts