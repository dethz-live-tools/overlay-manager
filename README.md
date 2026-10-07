# overlay-manager

A dedicated CLI tool and library for managing [stream-overlay-socket](https://github.com/dethz-tools) overlays in the static folder, installing overlays from Git, checking overlay health, and installing target libraries.

## Features

- 🛠 **CLI Framework**: Built with **yargs**, styled with **chalk**, and featuring interactive terminal prompts powered by **@inquirer/prompts**.
- ⚙️ **Persistent Configuration**: Store the static folder path in `overlay.config.json`, `overlay.config.yaml`, or `.overlayrc`.
- 🗂 **Root Control Configuration**: Auto-generates `<staticDir>/overlay.config.json` to manage enabled/disabled status and metadata for all overlays and shared libraries.
- 📁 **Centralized Root Libs**: Ensures `<staticDir>/libs` exists on setup and automatically installs shared libraries there for all overlays to use.
- 📄 **Native `meta.yaml` Support**: First-class parsing of `meta.yaml` / `meta.yml` manifest files (as used across `dethz-tools` overlays).
- 📥 **Install Overlays from Git**: Clone and set up overlays directly into the static overlays directory using full URLs or GitHub shorthands (e.g. `dethz-live-tools/dethz-overlay-vertical`). If an overlay already exists, `install` automatically pulls the latest changes.
- 🔄 **Git Pull & Update**: Pull latest upstream git changes for a single overlay or update all git-based overlays simultaneously via `overlay-manager pull` (alias `update`).
- 🩺 **Health & Dependency Checking**: Verify entrypoint files (`index.html`), `meta.yaml` manifests, preview images, and required target libraries.
- 📦 **Target Library Installer**: Automatically fetch and install CDN scripts, Git sub-repositories (such as `dethz-lib`), or vendor files needed by overlays, automatically pulling latest updates for existing git libs.
- 🔍 **Smart HTML Dependency Detection**: Automatically detects `./libs/<name>` references in `index.html` even if not declared in `meta.yaml`.
- 📋 **List & Inspect**: Overview of all installed overlays and separate listing for shared libraries in `<static folder>/libs`, displaying active/enabled status.
- 📚 **Programmatic API**: Full TypeScript library exports for integration into server backends or build pipelines.
- ⚡️ **Dual Distribution**: Runnable via `bunx` / `npx` (`dist/cli.mjs`) or standalone native binary (`build/overlay-manager`).

---

## Configuration (`overlay.config.json` / `overlay.config.yaml`)

You can persist the path to your static overlays directory so you never have to pass `--staticDir` or `-s`:

```json
{
  "staticDir": "./static"
}
```

Or in `overlay.config.yaml`:

```yaml
staticDir: "../stream-overlay-socket/static"
```

### Static Directory Resolution Precedence

1. CLI flag: `--staticDir` / `-s`
2. Environment variable: `STATIC_DIR` or `OVERLAY_STATIC_DIR`
3. Configuration file: `overlay.config.json`, `overlay.config.yaml`, or `.overlayrc`
4. Default fallback: `./static`

---

## Getting Started

### Installation

```bash
bun install
```

### Development

```bash
bun run dev --help
```

### Testing & Verification

```bash
bun test
bun run typecheck
```

---

## CLI Usage
### 1. Setup Static Workspace & Libs (`setup` / `init`)

Initializes the static root directory, ensures `<staticDir>/libs` exists, generates `<staticDir>/overlay.config.json` for controlling overlays and libs, and downloads missing libraries:

```bash
# Initialize static workspace and download missing libraries
overlay-manager setup

# Skip automatic downloading of missing libraries
overlay-manager setup --no-download

# Target a custom static directory
overlay-manager setup -s ../stream-overlay-socket/static
```

### 2. Manage Configuration (`config`)

View or set persistent settings (like `staticDir`):

```bash
# View active config file and resolved paths
overlay-manager config

# Get static directory path
overlay-manager config get staticDir

# Set static directory path
overlay-manager config set staticDir ./static
overlay-manager config set staticDir ../stream-overlay-socket/static
```

### 3. Install an Overlay from Git

Clones an overlay repository into `<staticDir>/<name>`:

```bash
# Using GitHub shorthand
overlay-manager install dethz-live-tools/dethz-overlay-vertical

# Using full Git URL
overlay-manager install https://github.com/dethz-live-tools/dethz-overlay-vertical.git

# With custom name and branch
overlay-manager install dethz-live-tools/dethz-overlay-vertical -n custom-vertical -b main

# Explicitly override static directory
overlay-manager install dethz-live-tools/dethz-overlay-vertical -s ./static
```

> **Note**: If the overlay directory already exists and is a Git repository, `install` will automatically pull latest changes (`git pull`) instead of throwing an error.

### 4. Pull & Update Overlays (`pull` / `update`)

Pulls upstream Git updates for a single overlay or all installed Git-based overlays:

```bash
# Update all installed git overlays in static directory
overlay-manager pull

# Update a specific overlay
overlay-manager pull dethz-overlay-vertical

# Pull updates using the update alias
overlay-manager update dethz-overlay-vertical

# Pull a specific branch
overlay-manager pull dethz-overlay-vertical -b main
```

### 5. Check Overlays

Inspects installed overlays, checks entry files, validates preview images, and reports missing libraries:

```bash
# Check all overlays
overlay-manager check

# Check a specific overlay
overlay-manager check dethz-overlay-vertical
```

### 6. Install Target Libraries

Downloads and installs required libraries specified in `meta.yaml` or referenced in `index.html`:

```bash
# Install libraries for all overlays
overlay-manager install-libs

# Install libraries for a single overlay
overlay-manager install-libs dethz-overlay-vertical
```

### 7. List Overlays & Shared Libraries

Lists all installed stream overlays in the static folder, followed by a dedicated separate list of all shared libraries installed in `<static folder>/libs`:

```bash
overlay-manager list
overlay-manager list -s ./static
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

## Overlay Manifest Specification (`meta.yaml`)

Each overlay in `stream-overlay-socket` can define its metadata in `meta.yaml` (or `meta.yml`):

```yaml
name: "deth'z overlay vertical"
description: "just another simple overlay on deth'z live stream (on tiktok and maybe another platform soon :3)"
image: "src/background.png"
author: "dethz"
entry: "index.html"
libs:
  # Shorthand for dethz-live-tools Git repo (clones to libs/dethz-lib)
  - dethz-lib

  # Direct script URL (downloads to libs/socket.io.min.js)
  - "https://cdn.socket.io/4.7.5/socket.io.min.js"

  # Explicit Git or custom path configuration
  - name: "custom-lib"
    git: "https://github.com/user/custom-lib.git"
    targetPath: "libs/custom-lib"
```

---

## Programmatic Library Usage

```typescript
import {
  loadAppConfig,
  saveAppConfig,
  resolveStaticDir,
  scanOverlays,
  scanStaticLibs,
  checkAllOverlays,
  cloneOverlayFromGit,
  pullOverlay,
  pullAllOverlays,
  installAllTargetLibs,
} from "overlay-manager";

// Get or update configuration
const { config, filePath } = loadAppConfig();
saveAppConfig({ staticDir: "./static" });

// Resolves path considering CLI flag, env, config file, and defaults
const staticDir = resolveStaticDir();

// Discover all installed overlays and shared libs
const overlays = scanOverlays(staticDir);
const sharedLibs = scanStaticLibs(staticDir);

// Check health and missing dependencies
const results = checkAllOverlays(staticDir);

// Pull latest changes for an overlay or all overlays
await pullOverlay("dethz-overlay-vertical");
await pullAllOverlays();
```
