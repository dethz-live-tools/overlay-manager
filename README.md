# overlay-manager

[![GitHub repository](https://img.shields.io/badge/GitHub-dethz--live--tools%2Foverlay--manager-blue?logo=github)](https://github.com/dethz-live-tools/overlay-manager)
[![Version](https://img.shields.io/badge/version-1.5.0-green.svg)](https://github.com/dethz-live-tools/overlay-manager/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Built%20with-Bun-f472b6?logo=bun)](https://bun.sh)

> *Just a little package to controlling overlay.*

A dedicated CLI tool and TypeScript library for managing [stream-overlay-socket](https://github.com/dethz-live-tools/stream-overlay-socket) overlays in the static folder, installing overlays from Git, checking overlay health, auto-setting up the shared `libs` directory, and controlling overlays and libraries via `overlay.config.json`.

---

## Features

- 🛠 **CLI Framework**: Built with **yargs**, styled with **chalk**, and featuring interactive terminal prompts powered by **@inquirer/prompts**.
- ⚙️ **Persistent Tool Configuration**: Store the static folder path in `overlay.config.json`, `overlay.config.yaml`, or `.overlayrc`.
- 🗂 **Root Control Configuration**: Auto-generates and synchronizes `<staticDir>/overlay.config.json` to manage enabled/disabled states and metadata for all overlays and shared libraries.
- 📁 **Centralized Root Libs**: Ensures `<staticDir>/libs` exists on setup and automatically installs/updates shared libraries there for all overlays to use.
- 📄 **Native `meta.yaml` Support**: First-class parsing of `meta.yaml` / `meta.yml` manifest files (as used across `dethz-live-tools` overlays).
- 📥 **Install Overlays from Git**: Clone and set up overlays directly into the static overlays directory using full URLs or GitHub shorthands (e.g. `dethz-live-tools/dethz-overlay-vertical`). If an overlay already exists, `install` automatically pulls latest changes.
- 🔄 **Git Pull & Update**: Pull latest upstream git changes for a single overlay or update all git-based overlays simultaneously via `overlay-manager pull` (alias `update`).
- 🩺 **Health & Dependency Checking**: Verify entrypoint files (`index.html`), `meta.yaml` manifests, preview images, and required target libraries.
- 📦 **Target Library Installer**: Automatically fetch and install CDN scripts, Git sub-repositories (such as `dethz-lib`), or vendor files needed by overlays, automatically pulling latest updates for existing git libs with canonical name deduplication.
- 🔍 **Smart HTML Dependency Detection**: Automatically detects `./libs/<name>` references in `index.html` even if not declared in `meta.yaml`.
- 📋 **List & Inspect**: Overview of all installed overlays and separate listing for shared libraries in `<static folder>/libs`, displaying active/enabled status.
- 📚 **Programmatic API**: Full TypeScript library exports for integration into server backends or build pipelines.
- ⚡️ **Dual Distribution**: Runnable via Node/Bun (`dist/cli.mjs`) or standalone single-file binary (`build/overlay-manager`).

---

## Configuration Architecture

`overlay-manager` uses a clean two-level configuration design:

### 1. Tool Configuration (Project / Workspace Root)

Defines where your static assets live (`staticDir`), so you never need to repeatedly pass `--staticDir` or `-s`:

**`overlay.config.json`**:
```json
{
  "staticDir": "../stream-overlay-socket/static"
}
```

Or in **`overlay.config.yaml`**:
```yaml
staticDir: "../stream-overlay-socket/static"
```

#### Static Directory Resolution Precedence
1. CLI flag: `--staticDir` / `-s`
2. Environment variable: `STATIC_DIR` or `OVERLAY_STATIC_DIR`
3. Configuration file: `overlay.config.json`, `overlay.config.yaml`, or `.overlayrc`
4. Default fallback: `./static`

### 2. Root Control Configuration (`<staticDir>/overlay.config.json`)

Created and managed in the root of the static directory by `overlay-manager setup` or `overlay-manager install`. This file acts as the source of truth for all installed overlays and shared libraries:

```json
{
  "overlays": {
    "dethz-overlay-vertical": {
      "enabled": true,
      "name": "deth'z overlay vertical",
      "entry": "index.html",
      "manifestFile": "meta.yaml",
      "gitUrl": "https://github.com/dethz-live-tools/dethz-overlay-vertical.git",
      "updatedAt": "2026-10-07T11:00:00.000Z"
    }
  },
  "libs": {
    "dethz-lib": {
      "enabled": true,
      "source": "https://github.com/dethz-live-tools/dethz-lib.git",
      "updatedAt": "2026-10-07T11:00:00.000Z"
    }
  }
}
```

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

### 3. Install an Overlay from Git (`install`)

Clones an overlay repository into `<staticDir>/<name>`, verifies root `<staticDir>/libs`, downloads any required target libraries into `<staticDir>/libs`, and registers the overlay in `<staticDir>/overlay.config.json`:

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

### 5. Check Overlays (`check`)

Inspects installed overlays, checks entry files, validates preview images, and reports missing libraries:

```bash
# Check all overlays
overlay-manager check

# Check a specific overlay
overlay-manager check dethz-overlay-vertical
```

### 6. Install Target Libraries (`install-libs`)

Downloads and installs required libraries specified in `meta.yaml` or referenced in `index.html` into `<staticDir>/libs`:

```bash
# Install libraries for all overlays
overlay-manager install-libs

# Install libraries for a single overlay
overlay-manager install-libs dethz-overlay-vertical
```

### 7. List Overlays & Shared Libraries (`list`)

Lists all installed stream overlays in the static folder (with `[ENABLED]` / `[DISABLED]` badges), followed by a dedicated separate list of all shared libraries installed in `<static folder>/libs`:

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
  # Shorthand for dethz-live-tools Git repo (clones to <staticDir>/libs/dethz-lib)
  - dethz-lib

  # Direct script URL (downloads to <staticDir>/libs/socket.io.min.js)
  - "https://cdn.socket.io/4.7.5/socket.io.min.js"

  # Explicit Git configuration
  - name: "custom-lib"
    git: "https://github.com/user/custom-lib.git"
```

---

## Programmatic Library Usage

```typescript
import {
  setupStaticRoot,
  ensureStaticRoot,
  loadRootStaticConfig,
  saveRootStaticConfig,
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
  installOverlayLibs,
} from "overlay-manager";

// 1. Setup static workspace & libs directory
await setupStaticRoot({ staticDir: "./static" });

// 2. Read or modify tool configuration
const { config } = loadAppConfig();
saveAppConfig({ staticDir: "./static" });

// 3. Inspect root control config (enabled / disabled status)
const { config: rootConfig } = loadRootStaticConfig("./static");

// 4. Discover all installed overlays and shared libs
const staticDir = resolveStaticDir();
const overlays = scanOverlays(staticDir);
const sharedLibs = scanStaticLibs(staticDir);

// 5. Check overlay health and missing dependencies
const results = checkAllOverlays(staticDir);

// 6. Pull updates
await pullOverlay("dethz-overlay-vertical");
await pullAllOverlays();
```

---

## License

MIT © [dethz-live-tools](https://github.com/dethz-live-tools)
