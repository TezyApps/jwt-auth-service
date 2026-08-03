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