import chalk from "chalk";
import type { CommandModule } from "yargs";
import { log, printBox } from "../core/logger";
import { setupStaticRoot } from "../core/setup";

export interface SetupArgs {
  staticDir?: string;
  download?: boolean;
}

export const setupCommand: CommandModule<{}, SetupArgs> = {
  command: "setup",
  aliases: ["init"],
  describe: "Setup static root, check/create libs folder, and initialize overlay/libs control config",
  builder: (yargs) =>
    yargs
      .option("staticDir", {
        alias: "s",
        type: "string",
        describe: "Static directory path (default: config, env STATIC_DIR, or ./static)",
      })
      .option("download", {
        type: "boolean",
        describe: "Download missing libraries during setup",
        default: true,
      }),
  handler: async (argv) => {
    log.start("Checking static root workspace and libs folder...");

    const res = await setupStaticRoot({
      staticDir: argv.staticDir,
      downloadLibs: argv.download,
    });

    log.success(`Static root verified at: ${chalk.dim(res.staticDir)}`);
    log.success(`Libs directory verified: ${chalk.dim(res.libsDir)}`);
    log.success(`Root control config ready: ${chalk.dim(res.configPath)}`);

    if (res.libsInstalled > 0) {
      log.success(`Downloaded/updated ${res.libsInstalled} target library file(s).`);
    }

    printBox(
      "Static Root Setup",
      [
        `Static Root : ${chalk.cyan(res.staticDir)}`,
        `Libs Folder : ${chalk.cyan(res.libsDir)}`,
        `Config File : ${chalk.cyan(res.configPath)}`,
        `Overlays    : ${chalk.yellow(res.overlaysConfigured)} configured`,
        `Libraries   : ${chalk.yellow(res.libsConfigured)} configured`,
      ].join("\n")
    );
  },
};
