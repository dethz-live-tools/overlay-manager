import { input } from "@inquirer/prompts";
import chalk from "chalk";
import type { CommandModule } from "yargs";
import { cloneOverlayFromGit } from "../core/git";
import { installOverlayLibs } from "../core/libs";
import { log } from "../core/logger";
import { ensureStaticRoot, registerOverlayInRootConfig } from "../core/root-config";

export interface InstallArgs {
  gitUrl?: string;
  staticDir?: string;
  name?: string;
  branch?: string;
  skipLibs?: boolean;
}

export const installCommand: CommandModule<{}, InstallArgs> = {
  command: "install [gitUrl]",
  describe: "Install an overlay from a Git repository into the static folder",
  builder: (yargs) =>
    yargs
      .positional("gitUrl", {
        type: "string",
        describe: "Git repository URL or GitHub shorthand (e.g. dethz-live-tools/dethz-overlay-vertical)",
      })
      .option("name", {
        alias: "n",
        type: "string",
        describe: "Custom overlay folder name",
      })
      .option("branch", {
        alias: "b",
        type: "string",
        describe: "Specific Git branch or tag to clone",
      })
      .option("staticDir", {
        alias: "s",
        type: "string",
        describe: "Static directory path (default: config, env STATIC_DIR, or ./static)",
      })
      .option("skipLibs", {
        type: "boolean",
        describe: "Skip automatic installation of target libraries",
        default: false,
      }),
  handler: async (argv) => {
    let gitUrl = argv.gitUrl;

    if (!gitUrl && process.stdin.isTTY) {
      gitUrl = await input({
        message: "Enter Git repository URL or GitHub shorthand (e.g. owner/repo):",
        validate: (val) => (val.trim().length > 0 ? true : "Please enter a valid Git repository URL"),
      });
    }

    if (!gitUrl) {
      log.error("Missing required argument: gitUrl. Provide a URL or run interactively in a TTY terminal.");
      process.exitCode = 1;
      return;
    }

    // Ensure root static directory and root libs directory exist
    ensureStaticRoot(argv.staticDir);

    log.start(`Cloning overlay from ${chalk.cyan(gitUrl)}...`);

    const result = await cloneOverlayFromGit({
      gitUrl,
      staticDir: argv.staticDir,
      name: argv.name,
      branch: argv.branch,
    });

    if (!result.success) {
      log.error(result.error || "Failed to clone overlay");
      process.exitCode = 1;
      return;
    }

    // Register overlay in root static overlay.config.json
    registerOverlayInRootConfig(result.name, { enabled: true, entry: "index.html", gitUrl }, argv.staticDir);

    if (result.isUpdate) {
      log.success(`Successfully updated existing overlay '${chalk.bold(result.name)}' via git pull at: ${chalk.dim(result.destPath)}`);
    } else {
      log.success(`Successfully installed overlay '${chalk.bold(result.name)}' at: ${chalk.dim(result.destPath)}`);
    }

    if (!argv.skipLibs) {
      log.info("Checking for required target libraries in root libs folder...");
      const libResult = await installOverlayLibs(result.destPath, result.name, argv.staticDir);
      if (libResult.installed.length > 0) {
        log.success(`Installed/verified ${libResult.installed.length} target libraries in root libs: ${libResult.installed.map((l) => chalk.cyan(l.lib)).join(", ")}`);
      }
      if (libResult.failed.length > 0) {
        log.warn(`Failed to install ${libResult.failed.length} libraries: ${libResult.failed.map((f) => `${f.lib} (${f.reason})`).join(", ")}`);
      }
    }
  },
};
