import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { AppConfig } from "../types";

export const CONFIG_FILE_NAMES = [
  "overlay.config.json",
  "overlay.config.yaml",
  "overlay.config.yml",
  ".overlayrc.json",
  ".overlayrc.yaml",
  ".overlayrc.yml",
  ".overlayrc",
];

export function findConfigFile(startDir?: string): { filePath?: string; format: "json" | "yaml" } {
  const baseDir = startDir || process.cwd();
  for (const name of CONFIG_FILE_NAMES) {
    const fullPath = resolve(baseDir, name);
    if (existsSync(fullPath)) {
      const isYaml = name.endsWith(".yaml") || name.endsWith(".yml");
      return { filePath: fullPath, format: isYaml ? "yaml" : "json" };
    }
  }
  return { format: "json" };
}

export function loadAppConfig(customConfigPath?: string): { config: AppConfig; filePath?: string } {
  let targetPath = customConfigPath ? resolve(process.cwd(), customConfigPath) : undefined;
  let isYaml = targetPath?.endsWith(".yaml") || targetPath?.endsWith(".yml");

  if (!targetPath) {
    const found = findConfigFile();
    targetPath = found.filePath;
    isYaml = found.format === "yaml";
  }

  if (!targetPath || !existsSync(targetPath)) {
    return { config: {} };
  }

  try {
    const content = readFileSync(targetPath, "utf-8");
    if (isYaml) {
      const parsed = parseYaml(content);
      return { config: (parsed && typeof parsed === "object" ? parsed : {}) as AppConfig, filePath: targetPath };
    }

    try {
      return { config: JSON.parse(content) as AppConfig, filePath: targetPath };
    } catch {
      // Fallback to YAML parser for .overlayrc without extension
      const parsed = parseYaml(content);
      return { config: (parsed && typeof parsed === "object" ? parsed : {}) as AppConfig, filePath: targetPath };
    }
  } catch {
    return { config: {}, filePath: targetPath };
  }
}

export function saveAppConfig(
  updates: Partial<AppConfig>,
  customConfigPath?: string
): { filePath: string; config: AppConfig } {
  const current = loadAppConfig(customConfigPath);
  const targetPath = current.filePath || (customConfigPath ? resolve(process.cwd(), customConfigPath) : resolve(process.cwd(), "overlay.config.json"));
  const isYaml = targetPath.endsWith(".yaml") || targetPath.endsWith(".yml");

  const newConfig: AppConfig = {
    ...current.config,
    ...updates,
  };

  const serialized = isYaml ? stringifyYaml(newConfig) : JSON.stringify(newConfig, null, 2) + "\n";
  writeFileSync(targetPath, serialized, "utf-8");

  return { filePath: targetPath, config: newConfig };
}

export function resolveStaticDir(customDir?: string, customConfigPath?: string): string {
  if (customDir) {
    return resolve(process.cwd(), customDir);
  }

  const envDir = process.env.STATIC_DIR || process.env.OVERLAY_STATIC_DIR;
  if (envDir) {
    return resolve(process.cwd(), envDir);
  }

  const { config } = loadAppConfig(customConfigPath);
  if (config.staticDir) {
    return resolve(process.cwd(), config.staticDir);
  }

  return resolve(process.cwd(), "./static");
}

export function resolveOverlaysDir(customDir?: string, customConfigPath?: string): string {
  const staticDir = resolveStaticDir(customDir, customConfigPath);
  const nestedOverlaysDir = resolve(staticDir, "overlays");
  if (existsSync(nestedOverlaysDir)) {
    return nestedOverlaysDir;
  }
  return staticDir;
}
