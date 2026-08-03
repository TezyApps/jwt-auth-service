# Simple JWT Auth Service

## Tech Stack

| Function | Tool | Version |
|:---|:----|:----|
| API | Node / ExpressJS | v24.16.0 / express 5.2.1 |
| Package Manager | pnpm | v11.18.0 | 
| Language | TypeScript |  7.0.2 |
| Dev Dep | @types/express | 5.0.6 |
| Dev Dep | @types/node | 26.1.2 |

## Scaffold:

### Initial setup:

```sh
> pnpm init
> pnpm add express
> pnpm add --save-dev typescript @types/express @types/node
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

### Create entry file

1. Make `app.ts` file

```sh
> mkdir src
> touch src/app.ts
```

2. Update `app.ts` to `src/app.ts` in `package.json` file.

## Run the app:

```sh
# step 1:
> pnpm run dev

# output
$ node src/app.ts
Server listening on PORT 3000

# step 2:
> curl -i localhost:3000/health

# output:
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 15
ETag: W/"f-VaSQ4oDUiZblZNAEkkN+sX+q3Sg"
Date: Mon, 03 Aug 2026 03:46:02 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"status":"ok"}
```
