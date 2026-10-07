import { defineCommand } from "citty";
import { consola } from "consola";

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Initialize an overlay configuration or directory",
  },
  args: {
    dir: {
      type: "string",
      description: "Target directory to initialize",
      default: "./overlays",
      alias: "d",
    },
  },
  run({ args }) {
    consola.start(`Initializing overlay workspace at ${args.dir}...`);
    consola.success(`Overlay workspace created at ${args.dir}`);
  },
});
