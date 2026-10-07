import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CheckResult } from "../types";
import { resolveOverlaysDir } from "./config";
import { getOverlayInfo, scanOverlays } from "./scanner";

export function checkOverlay(overlayPath: string, overlayName?: string, customDir?: string): CheckResult {
  const info = getOverlayInfo(overlayPath, overlayName, customDir);
  const issues: string[] = [];

  if (!info.hasEntry) {
    issues.push(`Missing entry point file: ${info.entryFile}`);
  }

  if (!info.hasManifest) {
    issues.push("No meta.yaml or overlay.json found (using default entry: index.html)");
  }

  if (info.image && info.hasImage === false) {
    issues.push(`Specified preview image not found: ${info.image}`);
  }

  if (info.missingLibs.length > 0) {
    issues.push(`Missing target libraries (${info.missingLibs.length}): ${info.missingLibs.join(", ")}`);
  }

  const isValid = info.hasEntry && info.missingLibs.length === 0;

  return {
    id: info.id,
    name: info.name,
    description: info.description,
    path: info.path,
    isValid,
    entryExists: info.hasEntry,
    manifestFile: info.manifestFile,
    hasImage: info.hasImage,
    imagePath: info.image,
    missingLibs: info.missingLibs,
    issues,
  };
}

export function checkAllOverlays(customDir?: string, targetOverlayName?: string): CheckResult[] {
  const baseDir = resolveOverlaysDir(customDir);

  if (targetOverlayName) {
    const singlePath = join(baseDir, targetOverlayName);
    if (!existsSync(singlePath)) {
      return [{
        id: targetOverlayName,
        name: targetOverlayName,
        path: singlePath,
        isValid: false,
        entryExists: false,
        missingLibs: [],
        issues: [`Overlay directory does not exist: ${singlePath}`],
      }];
    }
    return [checkOverlay(singlePath, targetOverlayName, customDir)];
  }

  const overlays = scanOverlays(customDir);
  return overlays.map((overlay) => checkOverlay(overlay.path, overlay.id, customDir));
}
