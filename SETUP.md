# Auth Side Project — Setup

## Prerequisites

- Node.js LTS (18+) — check with `node -v`
- Docker Desktop (for DynamoDB Local)
- Postman, Insomnia, or curl for testing endpoints

## Project init

```bash
mkdir -p /Users/vengat/Source/personal/my-projects/full-stack-trials/auth
cd /Users/vengat/Source/personal/my-projects/full-stack-trials/auth
npm init -y
npm install express bcrypt jsonwebtoken zod @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb dotenv
npm install -D typescript ts-node-dev @types/express @types/node @types/bcrypt @types/jsonwebtoken
npx tsc --init
```

## Folder structure to create

```
src/
  index.ts
  routes/
    auth.ts
  services/
    auth.service.ts
    user.repo.ts
  middleware/
    auth.middleware.ts
  db/
    client.ts
.env
docker-compose.yml
DESIGN_LOG.md
PLAN.md
```

## DynamoDB Local

Create `docker-compose.yml`:

```yaml
services:
  dynamodb-local:
    image: amazon/dynamodb-local
    ports:
      - "8000:8000"
    command: "-jar DynamoDBLocal.jar -inMemory"
```

Start it:

```bash
docker compose up -d
```

Checkpoint: `curl http://localhost:8000` should respond — not with JSON, but it shouldn't connection-refuse. That confirms the container is up.

## Environment variables (`.env`)

```
NODE_ENV=local
DYNAMODB_ENDPOINT=http://localhost:8000
JWT_SECRET=replace-with-a-real-random-secret
PORT=3000
```

### How to generate a JWT secret key?

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Do not commit `.env` — add it to `.gitignore` immediately, before your first commit.

## Why DynamoDB Local instead of an in-memory store

The exact same `@aws-sdk/lib-dynamodb` calls you write against DynamoDB Local work unchanged against real AWS later — you only swap the endpoint URL. An in-memory Map would mean throwing away and rewriting the data-access layer once you deploy. DynamoDB Local also forces you to learn partition-key-based querying now, in a free/local sandbox, rather than debugging it for the first time after deployment.

Trade-off worth naming: if today's priority is purely nailing the auth/JWT mechanics fast, an in-memory Map is faster to stand up and defers the DynamoDB learning curve to its own session. Either is a legitimate choice — this setup assumes you're taking the slightly longer road on purpose.