import { defineCommand } from "citty";
import { consola } from "consola";

export const listCommand = defineCommand({
  meta: {
    name: "list",
    description: "List configured overlays",
  },
  args: {
    dir: {
      type: "string",
      description: "Directory containing overlay assets",
      default: "./overlays",
      alias: "d",
    },
  },
  run({ args }) {
    consola.info(`Scanning for overlays in ${args.dir}...`);
    consola.log("No active overlays configured yet.");
  },
});
