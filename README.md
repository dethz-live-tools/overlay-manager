# overlay-manager

A CLI tool for stream overlay management, built with [Bun](https://bun.com) and [citty](https://github.com/unjs/citty).

## Features

- ⚡️ Lightweight and fast CLI powered by **Citty** and **Consola**
- 📦 Dual-target distribution:
  - **Bundled JS** (`dist/cli.mjs`) compatible with `bunx` / `npx` / Node.js
  - **Standalone Native Binary** (`build/overlay-manager`) via `bun build --compile`
- 🧩 Modular subcommands architecture
- 📘 Full TypeScript type definitions included

---

## Getting Started

### Installation

```bash
bun install
```

### Development

Run the CLI in development mode:

```bash
bun run dev --help
```

Run subcommands directly:

```bash
bun run dev start --port 3000 --host localhost
bun run dev init --dir ./overlays
bun run dev list
```

### Testing

```bash
bun test
```

---

## Build & Distribution

| Command | Output | Description |
| :--- | :--- | :--- |
| `bun run build` | `dist/cli.mjs`, `dist/index.mjs`, `dist/*.d.ts` | Builds executable CLI bundle, library bundle, and type declarations |
| `bun run build:cli` | `dist/cli.mjs` | Builds standalone executable JS with shebang |
| `bun run build:bin` | `build/overlay-manager` | Compiles single-file native executable |
| `bun run build:all` | All artifacts | Builds bundles, types, and compiled binary |
| `bun run typecheck` | - | Validates TypeScript types |

---

## Usage

### Using Locally

After building:

```bash
./dist/cli.mjs --help
# or with the standalone binary
./build/overlay-manager --help
```

### Running via `bunx` / `npx`

Once published or linked locally (`npm link` / `bun link`):

```bash
overlay-manager start -p 8080
overlay-manager init -d ./custom-overlays
overlay-manager list
```

---

## Programmatic Usage

You can also import `overlay-manager` into your own TypeScript/JavaScript code:

```typescript
import { mainCommand, run, startCommand } from "overlay-manager";

// Run main CLI programmatically
await run();
```
