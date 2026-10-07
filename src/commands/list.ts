import chalk from "chalk";
import { join } from "node:path";
import type { CommandModule } from "yargs";
import { resolveStaticDir } from "../core/config";
import { log, printBox } from "../core/logger";
import { scanOverlays, scanStaticLibs } from "../core/scanner";

function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ListArgs {
  staticDir?: string;
}

export const listCommand: CommandModule<{}, ListArgs> = {
  command: "list",
  describe: "List all stream overlays and shared static libraries in the static directory",
  builder: (yargs) =>
    yargs.option("staticDir", {
      alias: "s",
      type: "string",
      describe: "Static directory path (default: config, env STATIC_DIR, or ./static)",
    }),
  handler: (argv) => {
    const overlays = scanOverlays(argv.staticDir);
    const staticLibs = scanStaticLibs(argv.staticDir);
    const staticLibsPath = join(resolveStaticDir(argv.staticDir), "libs");

    // 1. Display Installed Stream Overlays
    if (overlays.length === 0) {
      log.warn("No overlays found in static directory.");
    } else {
      printBox(
        `Installed Stream Overlays (${overlays.length})`,
        overlays
          .map((o) => {
            const statusStr = o.isValid
              ? chalk.green("Healthy")
              : chalk.red(`Issues (${o.missingLibs.length} missing: ${o.missingLibs.join(", ")})`);

            const lines = [
              `• ${chalk.bold.white(o.name)} ${chalk.dim(`(id: ${o.id})`)}`,
              o.description ? `  Description: ${chalk.dim(o.description)}` : null,
              `  Path: ${chalk.dim(o.path)}`,
              `  Entry: ${o.entryFile} ${o.hasEntry ? chalk.green("(found)") : chalk.red("(missing)")}`,
              o.manifestFile ? `  Manifest: ${chalk.cyan(o.manifestFile)}` : null,
              o.image ? `  Image: ${o.image} ${o.hasImage ? chalk.green("(found)") : chalk.yellow("(missing)")}` : null,
              `  Status: ${statusStr}`,
            ].filter(Boolean);
            return lines.join("\n");
          })
          .join("\n\n")
      );
    }

    // 2. Display Shared Libraries in <static folder>/libs
    if (staticLibs.length === 0) {
      log.info(`No shared libraries found in: ${chalk.dim(staticLibsPath)}`);
    } else {
      printBox(
        `Shared Libraries in static/libs (${staticLibs.length})`,
        staticLibs
          .map((lib) => {
            const metaStr = lib.isDirectory
              ? chalk.cyan(`directory, ${lib.filesCount ?? 0} files`)
              : chalk.yellow(`file, ${formatFileSize(lib.sizeBytes)}`);
            return `• ${chalk.bold.white(lib.name)} (${metaStr})\n  Path: ${chalk.dim(lib.path)}`;
          })
          .join("\n\n")
      );
    }
  },
};
