import { defineCommand } from "citty";
import { consola } from "consola";

export const startCommand = defineCommand({
  meta: {
    name: "start",
    description: "Start the overlay manager server",
  },
  args: {
    port: {
      type: "string",
      description: "Port to run the overlay server on",
      default: "3000",
      alias: "p",
    },
    host: {
      type: "string",
      description: "Host address to bind",
      default: "localhost",
      alias: "h",
    },
    dir: {
      type: "string",
      description: "Directory containing overlay assets",
      default: "./overlays",
      alias: "d",
    },
  },
  run({ args }) {
    consola.box({
      title: "Overlay Manager",
      message: `Starting server at http://${args.host}:${args.port}\nOverlays directory: ${args.dir}`,
    });
    consola.success("Overlay Manager server ready!");
  },
});
