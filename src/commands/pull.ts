import chalk from "chalk";
import type { CommandModule } from "yargs";
import { pullAllOverlays, pullOverlay } from "../core/git";
import { log } from "../core/logger";

export interface PullArgs {
  name?: string;
  staticDir?: string;
  branch?: string;
}

export const pullCommand: CommandModule<{}, PullArgs> = {
  command: "pull [name]",
  aliases: ["update"],
  describe: "Pull latest git changes for one or all stream overlays",
  builder: (yargs) =>
    yargs
      .positional("name", {
        type: "string",
        describe: "Specific overlay name to pull (pulls all git overlays if omitted)",
      })
      .option("staticDir", {
        alias: "s",
        type: "string",
        describe: "Static directory path (default: config, env STATIC_DIR, or ./static)",
      })
      .option("branch", {
        alias: "b",
        type: "string",
        describe: "Specific git branch to pull",
      }),
  handler: async (argv) => {
    if (argv.name) {
      log.start(`Pulling git updates for ${chalk.bold(argv.name)}...`);
      const res = await pullOverlay(argv.name, argv.staticDir, argv.branch);

      if (!res.success) {
        log.error(`Failed to pull overlay '${argv.name}': ${res.message}`);
        process.exitCode = 1;
        return;
      }

      if (res.status === "up-to-date") {
        log.info(`Overlay '${chalk.bold(res.name)}' is already up to date.`);
      } else {
        log.success(`Overlay '${chalk.bold(res.name)}' updated successfully!`);
      }
      return;
    }

    log.start("Pulling git updates for all installed overlays...");
    const results = await pullAllOverlays(argv.staticDir, argv.branch);

    if (results.length === 0) {
      log.warn("No git-based overlays found in static directory.");
      return;
    }

    let failureCount = 0;
    for (const res of results) {
      if (res.success) {
        if (res.status === "up-to-date") {
          log.info(`[UP-TO-DATE] ${chalk.bold(res.name)}`);
        } else {
          log.success(`[UPDATED] ${chalk.bold(res.name)}`);
        }
      } else {
        failureCount++;
        log.error(`[FAILED] ${chalk.bold(res.name)}: ${res.message}`);
      }
    }

    if (failureCount > 0) {
      log.warn(`Completed with ${failureCount} failed repository update(s).`);
      process.exitCode = 1;
    } else {
      log.success(`Finished updating ${results.length} overlay(s).`);
    }
  },
};
