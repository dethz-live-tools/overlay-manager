import chalk from "chalk";
import type { CommandModule } from "yargs";
import { checkAllOverlays } from "../core/checker";
import { log } from "../core/logger";

export interface CheckArgs {
  name?: string;
  staticDir?: string;
}

export const checkCommand: CommandModule<{}, CheckArgs> = {
  command: "check [name]",
  describe: "Check overlay status, entrypoint files, and required target libraries",
  builder: (yargs) =>
    yargs
      .positional("name", {
        type: "string",
        describe: "Specific overlay name to check (checks all if omitted)",
      })
      .option("staticDir", {
        alias: "s",
        type: "string",
        describe: "Static directory path (default: config, env STATIC_DIR, or ./static)",
      }),
  handler: (argv) => {
    log.start("Checking stream overlays...");
    const results = checkAllOverlays(argv.staticDir, argv.name);

    if (results.length === 0) {
      log.warn("No overlays found in static directory.");
      return;
    }

    let hasErrors = false;

    for (const res of results) {
      const manifestLabel = res.manifestFile ? chalk.dim(`[${res.manifestFile}]`) : chalk.dim("[no manifest]");
      if (res.isValid) {
        log.success(`${chalk.green.bold("[VALID]")} ${chalk.bold(res.name)} ${manifestLabel}`);
        if (res.description) {
          console.log(`  └─ ${chalk.dim("Description:")} ${res.description}`);
        }
      } else {
        hasErrors = true;
        log.error(`${chalk.red.bold("[INVALID]")} ${chalk.bold(res.name)} ${manifestLabel}`);
        if (res.description) {
          console.log(`  └─ ${chalk.dim("Description:")} ${res.description}`);
        }
        for (const issue of res.issues) {
          console.log(`  └─ ${chalk.yellow("⚠️")}  ${issue}`);
        }
      }
    }

    if (hasErrors) {
      log.warn("Some overlays require attention. Run 'overlay-manager install-libs' to resolve missing libraries.");
      process.exitCode = 1;
    } else {
      log.success(`All ${results.length} checked overlays are healthy and ready!`);
    }
  },
};
