import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { InstallLibsOptions, InstallLibsResult, TargetLibConfig } from "../types";
import { resolveOverlaysDir } from "./config";
import { normalizeGitUrl } from "./git";
import { getOverlayInfo, scanOverlays } from "./scanner";

function runGitClone(gitUrl: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const parent = dirname(destPath);
    if (!existsSync(parent)) {
      mkdirSync(parent, { recursive: true });
    }
    const proc = spawn("git", ["clone", "--depth", "1", gitUrl, destPath], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Git clone failed (exit code ${code}): ${stderr.trim()}`));
      }
    });
  });
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

export async function installOverlayLibs(overlayPath: string, overlayName?: string): Promise<{
  installed: Array<{ lib: string; path: string }>;
  failed: Array<{ lib: string; reason: string }>;
}> {
  const info = getOverlayInfo(overlayPath, overlayName);
  const installed: Array<{ lib: string; path: string }> = [];
  const failed: Array<{ lib: string; reason: string }> = [];

  // Combine explicit manifest libs and auto-detected missing libs
  const libsToInstall = new Map<string, string | TargetLibConfig>();

  if (info.manifest?.libs && Array.isArray(info.manifest.libs)) {
    for (const lib of info.manifest.libs) {
      const name = typeof lib === "string" ? lib : lib.name;
      libsToInstall.set(name, lib);
    }
  }

  // Also include any detected missing libs (e.g. from HTML ./libs/...)
  for (const missing of info.missingLibs) {
    if (!libsToInstall.has(missing)) {
      libsToInstall.set(missing, missing);
    }
  }

  for (const [key, lib] of libsToInstall.entries()) {
    let libName = key;
    let url: string | undefined;
    let gitUrl: string | undefined;
    let targetPath = "";

    if (typeof lib === "string") {
      libName = lib;
      if (lib.startsWith("http://") || lib.startsWith("https://")) {
        if (lib.endsWith(".git")) {
          gitUrl = lib;
          targetPath = join(overlayPath, "libs", lib.split("/").pop()?.replace(/\.git$/, "") || "lib");
        } else {
          url = lib;
          const filename = lib.split("/").filter(Boolean).pop()?.split("?")[0] || "lib.js";
          targetPath = join(overlayPath, "libs", filename);
        }
      } else if (lib.includes("/")) {
        // e.g. dethz-live-tools/dethz-lib
        gitUrl = normalizeGitUrl(lib);
        targetPath = join(overlayPath, "libs", lib.split("/").pop() || "lib");
      } else {
        // E.g. 'dethz-lib' - convention fallback to dethz-live-tools/<libName>
        gitUrl = `https://github.com/dethz-live-tools/${lib}.git`;
        targetPath = join(overlayPath, "libs", lib);
      }
    } else {
      const config = lib as TargetLibConfig;
      libName = config.name;
      url = config.url;
      gitUrl = config.git ? normalizeGitUrl(config.git) : undefined;
      targetPath = config.targetPath
        ? join(overlayPath, config.targetPath)
        : join(overlayPath, "libs", config.name);
    }

    if (existsSync(targetPath)) {
      continue;
    }

    try {
      if (gitUrl) {
        await runGitClone(gitUrl, targetPath);
        installed.push({ lib: libName, path: targetPath });
      } else if (url) {
        await downloadFile(url, targetPath);
        installed.push({ lib: libName, path: targetPath });
      } else {
        failed.push({
          lib: libName,
          reason: "No download URL or git repository specified for this library",
        });
      }
    } catch (err: any) {
      failed.push({
        lib: libName,
        reason: err?.message || String(err),
      });
    }
  }

  return { installed, failed };
}

export async function installAllTargetLibs(options: InstallLibsOptions = {}): Promise<InstallLibsResult> {
  const baseDir = resolveOverlaysDir(options.staticDir);
  const allInstalled: Array<{ overlay: string; lib: string; path: string }> = [];
  const allFailed: Array<{ overlay: string; lib: string; reason: string }> = [];

  let overlaysToProcess = scanOverlays(options.staticDir);

  if (options.overlayName) {
    overlaysToProcess = overlaysToProcess.filter((o) => o.id === options.overlayName || o.name === options.overlayName);
    if (overlaysToProcess.length === 0) {
      const targetPath = join(baseDir, options.overlayName);
      if (existsSync(targetPath)) {
        overlaysToProcess = [getOverlayInfo(targetPath, options.overlayName)];
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
    const res = await installOverlayLibs(overlay.path, overlay.id);
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
