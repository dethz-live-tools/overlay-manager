import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { OverlayInfo, OverlayManifest, StaticLibInfo } from "../types";
import { resolveOverlaysDir, resolveStaticDir } from "./config";
import { normalizeLibName } from "./libs";
import { loadRootStaticConfig } from "./root-config";

export function readOverlayManifest(overlayDir: string): { manifest?: OverlayManifest; manifestFile?: string } {
  const possibleFiles = ["meta.yaml", "meta.yml", "overlay.json", "manifest.json", "package.json"];

  for (const filename of possibleFiles) {
    const filePath = join(overlayDir, filename);
    if (existsSync(filePath)) {
      try {
        const raw = readFileSync(filePath, "utf-8");

        if (filename.endsWith(".yaml") || filename.endsWith(".yml")) {
          const parsed = parseYaml(raw);
          if (parsed && typeof parsed === "object") {
            return {
              manifest: {
                name: parsed.name,
                version: parsed.version,
                description: parsed.description,
                image: parsed.image,
                entry: parsed.entry || "index.html",
                author: parsed.author,
                libs: parsed.libs,
                dependencies: parsed.dependencies,
              },
              manifestFile: filename,
            };
          }
        }

        const parsed = JSON.parse(raw);
        if (filename === "package.json") {
          return {
            manifest: {
              name: parsed.name,
              version: parsed.version,
              description: parsed.description,
              image: parsed.overlay?.image,
              entry: parsed.overlay?.entry || "index.html",
              author: parsed.author,
              libs: parsed.overlay?.libs || (parsed.dependencies ? Object.keys(parsed.dependencies) : []),
            },
            manifestFile: filename,
          };
        }

        return {
          manifest: parsed as OverlayManifest,
          manifestFile: filename,
        };
      } catch {
        // Ignored if invalid format
      }
    }
  }

  return {};
}

export function detectLibsFromHtml(htmlContent: string): string[] {
  const matches = htmlContent.matchAll(/(?:src|href)=["'](?:\.\/)?libs\/([^/'"?]+)/g);
  const libs = new Set<string>();
  for (const match of matches) {
    if (match[1]) {
      libs.add(match[1]);
    }
  }
  return Array.from(libs);
}

export function getOverlayInfo(overlayPath: string, overlayId?: string, customDir?: string): OverlayInfo {
  const id = overlayId || overlayPath.split("/").filter(Boolean).pop() || "unknown";
  const { manifest, manifestFile } = readOverlayManifest(overlayPath);
  const entryFile = manifest?.entry || "index.html";
  const entryPath = join(overlayPath, entryFile);
  const hasEntry = existsSync(entryPath);
  const hasManifest = Boolean(manifest);

  const image = manifest?.image;
  const hasImage = image ? existsSync(join(overlayPath, image)) : undefined;

  const staticLibsDir = join(resolveStaticDir(customDir), "libs");
  const missingLibs: string[] = [];
  const detectedLibs: string[] = [];

  // 1. Check explicit libs in manifest
  if (manifest?.libs && Array.isArray(manifest.libs)) {
    for (const lib of manifest.libs) {
      const rawName = typeof lib === "string" ? lib : lib.name;
      const canonicalName = normalizeLibName(rawName);
      const targetPath = typeof lib === "object" && lib.targetPath
        ? join(overlayPath, lib.targetPath)
        : join(overlayPath, "libs", canonicalName);

      if (!detectedLibs.includes(canonicalName)) {
        detectedLibs.push(canonicalName);
      }

      const inOverlay = existsSync(targetPath) || existsSync(join(overlayPath, "libs", canonicalName));
      const inStatic = existsSync(join(staticLibsDir, canonicalName)) || existsSync(join(staticLibsDir, rawName));

      if (!inOverlay && !inStatic && !missingLibs.includes(canonicalName)) {
        missingLibs.push(canonicalName);
      }
    }
  }

  // 2. Scan entry HTML for referenced ./libs/... dependencies
  if (hasEntry) {
    try {
      const htmlContent = readFileSync(entryPath, "utf-8");
      const htmlLibs = detectLibsFromHtml(htmlContent);
      for (const rawLib of htmlLibs) {
        const canonical = normalizeLibName(rawLib);
        if (!detectedLibs.includes(canonical)) {
          detectedLibs.push(canonical);
        }

        const libInOverlay = existsSync(join(overlayPath, "libs", rawLib)) || existsSync(join(overlayPath, "libs", canonical));
        const libInStatic = existsSync(join(staticLibsDir, rawLib)) || existsSync(join(staticLibsDir, canonical));

        if (!libInOverlay && !libInStatic && !missingLibs.includes(canonical)) {
          missingLibs.push(canonical);
        }
      }
    } catch {
      // Ignore reading error
    }
  }

  const isValid = hasEntry && missingLibs.length === 0;
  const rootConfig = loadRootStaticConfig(customDir).config;
  const enabled = rootConfig.overlays?.[id]?.enabled !== false;

  return {
    id,
    name: manifest?.name || id,
    description: manifest?.description,
    image,
    hasImage,
    path: overlayPath,
    entryFile,
    hasEntry,
    manifest,
    manifestFile,
    hasManifest,
    isValid,
    enabled,
    missingLibs,
    detectedLibs,
  };
}

export function scanOverlays(customDir?: string): OverlayInfo[] {
  const baseDir = resolveOverlaysDir(customDir);
  if (!existsSync(baseDir)) {
    return [];
  }

  const entries = readdirSync(baseDir, { withFileTypes: true });
  const overlays: OverlayInfo[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "libs") {
      const fullPath = join(baseDir, entry.name);
      overlays.push(getOverlayInfo(fullPath, entry.name, customDir));
    }
  }

  return overlays;
}

export function scanStaticLibs(customDir?: string): StaticLibInfo[] {
  const staticDir = resolveStaticDir(customDir);
  const libsDir = join(staticDir, "libs");

  if (!existsSync(libsDir)) {
    return [];
  }

  const entries = readdirSync(libsDir, { withFileTypes: true });
  const libs: StaticLibInfo[] = [];
  const rootConfig = loadRootStaticConfig(customDir).config;

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = join(libsDir, entry.name);
    const isDirectory = entry.isDirectory();
    const enabled = rootConfig.libs?.[entry.name]?.enabled !== false;

    let filesCount: number | undefined;
    let sizeBytes: number | undefined;

    if (isDirectory) {
      try {
        filesCount = readdirSync(fullPath).length;
      } catch {
        filesCount = 0;
      }
    } else {
      try {
        sizeBytes = statSync(fullPath).size;
      } catch {
        sizeBytes = 0;
      }
    }

    libs.push({
      name: entry.name,
      path: fullPath,
      isDirectory,
      enabled,
      filesCount,
      sizeBytes,
    });
  }

  return libs;
}
