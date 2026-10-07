import chalk from "chalk";
import type { CommandModule } from "yargs";
import { installAllTargetLibs } from "../core/libs";
import { log } from "../core/logger";

export interface InstallLibsArgs {
  name?: string;
  staticDir?: string;
}

export const installLibsCommand: CommandModule<{}, InstallLibsArgs> = {
  command: "install-libs [name]",
  describe: "Install or download target libraries required by static overlays",
  builder: (yargs) =>
    yargs
      .positional("name", {
        type: "string",
        describe: "Specific overlay name to install libraries for (installs for all if omitted)",
      })
      .option("staticDir", {
        alias: "s",
        type: "string",
        describe: "Static directory path (default: config, env STATIC_DIR, or ./static)",
      }),
  handler: async (argv) => {
    log.start("Installing target libraries for overlays...");

    const result = await installAllTargetLibs({
      staticDir: argv.staticDir,
      overlayName: argv.name,
    });

    if (result.installed.length > 0) {
      log.success(`Installed ${result.installed.length} library files:`);
      for (const item of result.installed) {
        console.log(`  ${chalk.green("✔")} [${chalk.bold(item.overlay)}] ${chalk.cyan(item.lib)} -> ${chalk.dim(item.path)}`);
      }
    } else if (result.failed.length === 0) {
      log.info("No missing target libraries detected.");
    }

    if (result.failed.length > 0) {
      log.error(`Failed to install ${result.failed.length} libraries:`);
      for (const fail of result.failed) {
        console.log(`  ${chalk.red("✖")} [${chalk.bold(fail.overlay)}] ${fail.lib}: ${chalk.yellow(fail.reason)}`);
      }
      process.exitCode = 1;
    }
  },
};
