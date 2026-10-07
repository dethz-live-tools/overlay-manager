import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { checkCommand } from "./commands/check";
import { configCommand } from "./commands/config";
import { installCommand } from "./commands/install";
import { installLibsCommand } from "./commands/install-libs";
import { listCommand } from "./commands/list";
import { version } from "./version";

// Export Core Library APIs
export * from "./types";
export * from "./version";
export {
  CONFIG_FILE_NAMES,
  findConfigFile,
  loadAppConfig,
  resolveOverlaysDir,
  resolveStaticDir,
  saveAppConfig,
} from "./core/config";
export { getOverlayInfo, readOverlayManifest, scanOverlays, scanStaticLibs } from "./core/scanner";
export { checkAllOverlays, checkOverlay } from "./core/checker";
export { cloneOverlayFromGit } from "./core/git";
export { installAllTargetLibs, installOverlayLibs } from "./core/libs";
export { log, printBox } from "./core/logger";

// Export Subcommands
export { checkCommand, configCommand, installCommand, installLibsCommand, listCommand };

// Build and configure Yargs CLI instance
export function createCli(args: string[] = hideBin(process.argv)) {
  return yargs(args)
    .scriptName("overlay-manager")
    .version(version)
    .usage("$0 <command> [options]")
    .command(installCommand)
    .command(checkCommand)
    .command(installLibsCommand)
    .command(listCommand)
    .command(configCommand)
    .demandCommand(1, "Please specify a command. Run --help to see available commands.")
    .strict()
    .help()
    .alias("h", "help")
    .alias("v", "version");
}

export async function run(args: string[] = hideBin(process.argv)) {
  const cli = createCli(args);
  await cli.parseAsync();
}
