import type { SetupOptions, SetupResult } from "../types";
import { installAllTargetLibs } from "./libs";
import { ensureStaticRoot, loadRootStaticConfig, saveRootStaticConfig } from "./root-config";
import { scanOverlays, scanStaticLibs } from "./scanner";

export async function setupStaticRoot(options: SetupOptions = {}): Promise<SetupResult> {
  // 1. Ensure staticDir, libsDir, and overlay.config.json exist
  const { staticDir, libsDir, configPath } = ensureStaticRoot(options.staticDir);

  // 2. Scan disk for overlays and libs
  const overlays = scanOverlays(options.staticDir);
  const libs = scanStaticLibs(options.staticDir);

  // 3. Load root config and populate any unconfigured items (default enabled: true)
  const { config } = loadRootStaticConfig(options.staticDir);
  const overlayMap = { ...(config.overlays || {}) };
  const libMap = { ...(config.libs || {}) };

  for (const o of overlays) {
    if (!overlayMap[o.id]) {
      overlayMap[o.id] = {
        enabled: true,
        name: o.name,
        entry: o.entryFile,
        manifestFile: o.manifestFile,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  for (const l of libs) {
    if (!libMap[l.name]) {
      libMap[l.name] = {
        enabled: true,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  saveRootStaticConfig({ overlays: overlayMap, libs: libMap }, options.staticDir);

  // 4. Optionally download missing libraries into staticDir/libs
  let libsInstalled = 0;
  if (options.downloadLibs !== false) {
    const installRes = await installAllTargetLibs({ staticDir: options.staticDir });
    libsInstalled = installRes.installed.length;

    // Rescan libs to register any newly installed libraries
    const updatedLibs = scanStaticLibs(options.staticDir);
    for (const l of updatedLibs) {
      if (!libMap[l.name]) {
        libMap[l.name] = {
          enabled: true,
          updatedAt: new Date().toISOString(),
        };
      }
    }
    saveRootStaticConfig({ libs: libMap }, options.staticDir);
  }

  return {
    staticDir,
    libsDir,
    configPath,
    overlaysConfigured: Object.keys(overlayMap).length,
    libsConfigured: Object.keys(libMap).length,
    libsInstalled,
  };
}
