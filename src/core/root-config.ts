import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RootLibItem, RootOverlayItem, RootStaticConfig } from "../types";
import { resolveStaticDir } from "./config";

export function getRootStaticConfigPath(staticDir?: string): string {
  const baseDir = resolveStaticDir(staticDir);
  return join(baseDir, "overlay.config.json");
}

export function ensureStaticRoot(staticDir?: string): {
  staticDir: string;
  libsDir: string;
  configPath: string;
} {
  const baseDir = resolveStaticDir(staticDir);
  const libsDir = join(baseDir, "libs");
  const configPath = join(baseDir, "overlay.config.json");

  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }

  if (!existsSync(libsDir)) {
    mkdirSync(libsDir, { recursive: true });
  }

  if (!existsSync(configPath)) {
    const initialConfig: RootStaticConfig = {
      overlays: {},
      libs: {},
    };
    writeFileSync(configPath, JSON.stringify(initialConfig, null, 2) + "\n", "utf-8");
  }

  return {
    staticDir: baseDir,
    libsDir,
    configPath,
  };
}

export function loadRootStaticConfig(staticDir?: string): {
  config: RootStaticConfig;
  filePath: string;
  exists: boolean;
} {
  const filePath = getRootStaticConfigPath(staticDir);
  if (!existsSync(filePath)) {
    return {
      config: { overlays: {}, libs: {} },
      filePath,
      exists: false,
    };
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const config: RootStaticConfig = {
      ...parsed,
      overlays: parsed?.overlays && typeof parsed.overlays === "object" ? parsed.overlays : {},
      libs: parsed?.libs && typeof parsed.libs === "object" ? parsed.libs : {},
    };
    return { config, filePath, exists: true };
  } catch {
    return {
      config: { overlays: {}, libs: {} },
      filePath,
      exists: true,
    };
  }
}

export function saveRootStaticConfig(
  updates: Partial<RootStaticConfig>,
  staticDir?: string
): { config: RootStaticConfig; filePath: string } {
  const baseDir = resolveStaticDir(staticDir);
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }

  const { config: current, filePath } = loadRootStaticConfig(staticDir);
  const merged: RootStaticConfig = {
    ...current,
    ...updates,
    overlays: {
      ...(current.overlays || {}),
      ...(updates.overlays || {}),
    },
    libs: {
      ...(current.libs || {}),
      ...(updates.libs || {}),
    },
  };

  writeFileSync(filePath, JSON.stringify(merged, null, 2) + "\n", "utf-8");
  return { config: merged, filePath };
}

export function registerOverlayInRootConfig(
  overlayId: string,
  meta: Partial<RootOverlayItem> = {},
  staticDir?: string
): void {
  ensureStaticRoot(staticDir);
  const { config } = loadRootStaticConfig(staticDir);
  const overlays = config.overlays || {};
  const existing = overlays[overlayId] || { enabled: true };

  overlays[overlayId] = {
    ...existing,
    ...meta,
    enabled: meta.enabled !== undefined ? meta.enabled : (existing.enabled ?? true),
    updatedAt: new Date().toISOString(),
  };

  saveRootStaticConfig({ overlays }, staticDir);
}

export function registerLibInRootConfig(
  libName: string,
  meta: Partial<RootLibItem> = {},
  staticDir?: string
): void {
  ensureStaticRoot(staticDir);
  const { config } = loadRootStaticConfig(staticDir);
  const libs = config.libs || {};
  const existing = libs[libName] || { enabled: true };

  libs[libName] = {
    ...existing,
    ...meta,
    enabled: meta.enabled !== undefined ? meta.enabled : (existing.enabled ?? true),
    updatedAt: new Date().toISOString(),
  };

  saveRootStaticConfig({ libs }, staticDir);
}

export function setOverlayEnabled(
  overlayId: string,
  enabled: boolean,
  staticDir?: string
): boolean {
  const { config } = loadRootStaticConfig(staticDir);
  const overlays = config.overlays || {};
  if (!overlays[overlayId]) {
    overlays[overlayId] = { enabled };
  } else {
    overlays[overlayId].enabled = enabled;
  }
  saveRootStaticConfig({ overlays }, staticDir);
  return true;
}

export function setLibEnabled(
  libName: string,
  enabled: boolean,
  staticDir?: string
): boolean {
  const { config } = loadRootStaticConfig(staticDir);
  const libs = config.libs || {};
  if (!libs[libName]) {
    libs[libName] = { enabled };
  } else {
    libs[libName].enabled = enabled;
  }
  saveRootStaticConfig({ libs }, staticDir);
  return true;
}
