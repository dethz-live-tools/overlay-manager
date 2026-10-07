import { defineCommand, runMain } from "citty";
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

// Export Subcommands
export { checkCommand, configCommand, installCommand, installLibsCommand, listCommand };

// Define Root CLI Command
export const mainCommand = defineCommand({
  meta: {
    name: "overlay-manager",
    version,
    description: "Manage stream-overlay-socket overlays in static folder and install overlay libs",
  },
  subCommands: {
    config: configCommand,
    install: installCommand,
    check: checkCommand,
    "install-libs": installLibsCommand,
    list: listCommand,
  },
});

export const run = () => runMain(mainCommand);
