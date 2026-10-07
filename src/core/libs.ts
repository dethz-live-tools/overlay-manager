import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import type { InstallLibsOptions, InstallLibsResult, TargetLibConfig } from "../types";
import { resolveOverlaysDir, resolveStaticDir } from "./config";
import { isGitRepo, normalizeGitUrl, pullGitRepo, runGitCommand } from "./git";
import { ensureStaticRoot, registerLibInRootConfig } from "./root-config";
import { getOverlayInfo, scanOverlays } from "./scanner";

export function normalizeLibName(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const clean = (trimmed.split("?")[0] || "").replace(/\/+$/, "");
    const last = clean.split("/").filter(Boolean).pop() || "lib";
    return last.replace(/\.git$/, "");
  }
  const parts = trimmed.split("/").filter(Boolean);
  return parts.pop()?.replace(/\.git$/, "") || trimmed;
}

async function runGitClone(gitUrl: string, destPath: string): Promise<void> {
  const parent = dirname(destPath);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }
  const result = await runGitCommand(["clone", "--depth", "1", gitUrl, destPath]);
  if (result.code !== 0) {
    throw new Error(`Git clone failed (exit code ${result.code}): ${result.stderr.trim() || result.stdout.trim()}`);
  }
}

async function downloadFile(url: string, targetPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} while fetching ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const dir = dirname(targetPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(targetPath, Buffer.from(arrayBuffer));
}

export async function installOverlayLibs(
  overlayPath: string,
  overlayName?: string,
  staticDir?: string
): Promise<{
  installed: Array<{ lib: string; path: string }>;
  failed: Array<{ lib: string; reason: string }>;
}> {
  // Ensure the config root path and libs folder exist
  const { libsDir: rootLibsDir } = ensureStaticRoot(staticDir);
  const info = getOverlayInfo(overlayPath, overlayName, staticDir);
  const installed: Array<{ lib: string; path: string }> = [];
  const failed: Array<{ lib: string; reason: string }> = [];

  // Deduplicate libraries by normalized canonical name
  const libsToInstall = new Map<string, string | TargetLibConfig>();

  if (info.manifest?.libs && Array.isArray(info.manifest.libs)) {
    for (const lib of info.manifest.libs) {
      const rawName = typeof lib === "string" ? lib : lib.name;
      const canonical = typeof lib === "string" ? normalizeLibName(rawName) : rawName;
      libsToInstall.set(canonical, lib);
    }
  }

  // Also include any detected missing libs (e.g. from HTML ./libs/...)
  for (const missing of info.missingLibs) {
    const canonical = normalizeLibName(missing);
    if (!libsToInstall.has(canonical)) {
      libsToInstall.set(canonical, missing);
    }
  }

  for (const [canonicalName, lib] of libsToInstall.entries()) {
    let url: string | undefined;
    let gitUrl: string | undefined;
    let targetPath = "";

    if (typeof lib === "string") {
      if (lib.startsWith("http://") || lib.startsWith("https://")) {
        if (lib.endsWith(".git")) {
          gitUrl = lib;
          targetPath = join(rootLibsDir, canonicalName);
        } else {
          url = lib;
          const filename = lib.split("/").filter(Boolean).pop()?.split("?")[0] || `${canonicalName}.js`;
          targetPath = join(rootLibsDir, filename);
        }
      } else if (lib.includes("/")) {
        // e.g. dethz-live-tools/dethz-lib
        gitUrl = normalizeGitUrl(lib);
        targetPath = join(rootLibsDir, canonicalName);
      } else {
        // E.g. 'dethz-lib' - convention fallback to dethz-live-tools/<libName>
        gitUrl = `https://github.com/dethz-live-tools/${lib}.git`;
        targetPath = join(rootLibsDir, canonicalName);
      }
    } else {
      const config = lib as TargetLibConfig;
      url = config.url;
      gitUrl = config.git ? normalizeGitUrl(config.git) : undefined;
      if (config.targetPath) {
        targetPath = isAbsolute(config.targetPath)
          ? config.targetPath
          : join(rootLibsDir, config.targetPath.replace(/^libs\//, ""));
      } else {
        targetPath = join(rootLibsDir, canonicalName);
      }
    }

    // Check if target library already exists in root libs dir or overlay local libs dir
    const overlayLocalPath = join(overlayPath, "libs", canonicalName);
    const existingPath = existsSync(targetPath)
      ? targetPath
      : existsSync(overlayLocalPath)
      ? overlayLocalPath
      : undefined;

    if (existingPath) {
      if (gitUrl && isGitRepo(existingPath)) {
        try {
          await pullGitRepo(existingPath);
          installed.push({ lib: canonicalName, path: existingPath });
          registerLibInRootConfig(canonicalName, { source: gitUrl, enabled: true }, staticDir);
        } catch {
          // If pull fails or up to date, keep going
        }
      } else {
        registerLibInRootConfig(canonicalName, { source: gitUrl || url, enabled: true }, staticDir);
      }
      continue;
    }

    try {
      if (gitUrl) {
        await runGitClone(gitUrl, targetPath);
        installed.push({ lib: canonicalName, path: targetPath });
        registerLibInRootConfig(canonicalName, { source: gitUrl, enabled: true }, staticDir);
      } else if (url) {
        await downloadFile(url, targetPath);
        installed.push({ lib: canonicalName, path: targetPath });
        registerLibInRootConfig(canonicalName, { source: url, enabled: true }, staticDir);
      } else {
        failed.push({
          lib: canonicalName,
          reason: "No download URL or git repository specified for this library",
        });
      }
    } catch (err: any) {
      failed.push({
        lib: canonicalName,
        reason: err?.message || String(err),
      });
    }
  }

  return { installed, failed };
}

export async function installAllTargetLibs(options: InstallLibsOptions = {}): Promise<InstallLibsResult> {
  const baseDir = resolveOverlaysDir(options.staticDir);
  ensureStaticRoot(options.staticDir);

  const allInstalled: Array<{ overlay: string; lib: string; path: string }> = [];
  const allFailed: Array<{ overlay: string; lib: string; reason: string }> = [];

  let overlaysToProcess = scanOverlays(options.staticDir);

  if (options.overlayName) {
    overlaysToProcess = overlaysToProcess.filter((o) => o.id === options.overlayName || o.name === options.overlayName);
    if (overlaysToProcess.length === 0) {
      const targetPath = join(baseDir, options.overlayName);
      if (existsSync(targetPath)) {
        overlaysToProcess = [getOverlayInfo(targetPath, options.overlayName, options.staticDir)];
      } else {
        return {
          success: false,
          installed: [],
          failed: [{ overlay: options.overlayName, lib: "all", reason: `Overlay directory not found: ${targetPath}` }],
        };
      }
    }
  }

  for (const overlay of overlaysToProcess) {
    const res = await installOverlayLibs(overlay.path, overlay.id, options.staticDir);
    for (const item of res.installed) {
      allInstalled.push({ overlay: overlay.name, ...item });
    }
    for (const item of res.failed) {
      allFailed.push({ overlay: overlay.name, ...item });
    }
  }

  return {
    success: allFailed.length === 0,
    installed: allInstalled,
    failed: allFailed,
  };
}
