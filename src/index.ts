import { defineCommand, runMain } from "citty";
import { startCommand } from "./commands/start";
import { initCommand } from "./commands/init";
import { listCommand } from "./commands/list";
import { version } from "./version";

export * from "./types";
export * from "./version";
export { startCommand, initCommand, listCommand };

export const mainCommand = defineCommand({
  meta: {
    name: "overlay-manager",
    version,
    description: "CLI tool for overlay management",
  },
  subCommands: {
    start: startCommand,
    init: initCommand,
    list: listCommand,
  },
});

export const run = () => runMain(mainCommand);
