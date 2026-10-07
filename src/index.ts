import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { checkCommand } from "./commands/check";
import { configCommand } from "./commands/config";
import { installCommand } from "./commands/install";
import { installLibsCommand } from "./commands/install-libs";
import { listCommand } from "./commands/list";
import { pullCommand } from "./commands/pull";
import { setupCommand } from "./commands/setup";
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
export {
  ensureStaticRoot,
  getRootStaticConfigPath,
  loadRootStaticConfig,
  registerLibInRootConfig,
  registerOverlayInRootConfig,
  saveRootStaticConfig,
  setLibEnabled,
  setOverlayEnabled,
} from "./core/root-config";
export { setupStaticRoot } from "./core/setup";
export { getOverlayInfo, readOverlayManifest, scanOverlays, scanStaticLibs } from "./core/scanner";
export { checkAllOverlays, checkOverlay } from "./core/checker";
export {
  cloneOverlayFromGit,
  extractRepoName,
  isGitRepo,
  normalizeGitUrl,
  pullAllOverlays,
  pullGitRepo,
  pullOverlay,
  runGitCommand,
} from "./core/git";
export { installAllTargetLibs, installOverlayLibs, normalizeLibName } from "./core/libs";
export { log, printBox } from "./core/logger";

// Export Subcommands
export { checkCommand, configCommand, installCommand, installLibsCommand, listCommand, pullCommand, setupCommand };

// Build and configure Yargs CLI instance
export function createCli(args: string[] = hideBin(process.argv)) {
  return yargs(args)
    .scriptName("overlay-manager")
    .version(version)
    .usage("$0 <command> [options]")
    .command(setupCommand)
    .command(installCommand)
    .command(pullCommand)
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
