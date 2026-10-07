import { defineCommand } from "citty";
import { consola } from "consola";
import { join } from "node:path";
import { resolveStaticDir } from "../core/config";
import { scanOverlays, scanStaticLibs } from "../core/scanner";

function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const listCommand = defineCommand({
  meta: {
    name: "list",
    description: "List all stream overlays and shared static libraries in the static directory",
  },
  args: {
    staticDir: {
      type: "string",
      description: "Static directory path (default: env STATIC_DIR or ./static)",
      alias: "s",
    },
  },
  run({ args }) {
    const overlays = scanOverlays(args.staticDir);
    const staticLibs = scanStaticLibs(args.staticDir);
    const staticLibsPath = join(resolveStaticDir(args.staticDir), "libs");

    // 1. Display Installed Stream Overlays
    if (overlays.length === 0) {
      consola.warn("No overlays found in static directory.");
    } else {
      consola.box({
        title: `Installed Stream Overlays (${overlays.length})`,
        message: overlays
          .map((o) => {
            const lines = [
              `• ${o.name} (id: ${o.id})`,
              o.description ? `  Description: ${o.description}` : null,
              `  Path: ${o.path}`,
              `  Entry: ${o.entryFile} (${o.hasEntry ? "found" : "missing"})`,
              o.manifestFile ? `  Manifest: ${o.manifestFile}` : null,
              o.image ? `  Image: ${o.image} (${o.hasImage ? "found" : "missing"})` : null,
              `  Status: ${o.isValid ? "Healthy" : `Issues (${o.missingLibs.length} missing libs: ${o.missingLibs.join(", ")})`}`,
            ].filter(Boolean);
            return lines.join("\n");
          })
          .join("\n\n"),
      });
    }

    // 2. Display Shared Libraries in <static folder>/libs
    if (staticLibs.length === 0) {
      consola.info(`No shared libraries found in: ${staticLibsPath}`);
    } else {
      consola.box({
        title: `Shared Libraries in static/libs (${staticLibs.length})`,
        message: staticLibs
          .map((lib) => {
            const metaStr = lib.isDirectory
              ? `directory, ${lib.filesCount ?? 0} files`
              : `file, ${formatFileSize(lib.sizeBytes)}`;
            return `• ${lib.name} (${metaStr})\n  Path: ${lib.path}`;
          })
          .join("\n\n"),
      });
    }
  },
});
