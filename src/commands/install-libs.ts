import { defineCommand } from "citty";
import { consola } from "consola";
import { installAllTargetLibs } from "../core/libs";

export const installLibsCommand = defineCommand({
  meta: {
    name: "install-libs",
    description: "Install or download target libraries required by static overlays",
  },
  args: {
    name: {
      type: "positional",
      description: "Specific overlay name to install libraries for (installs for all if omitted)",
      required: false,
    },
    staticDir: {
      type: "string",
      description: "Static directory path (default: env STATIC_DIR or ./static)",
      alias: "s",
    },
  },
  async run({ args }) {
    consola.start("Installing target libraries for overlays...");

    const result = await installAllTargetLibs({
      staticDir: args.staticDir,
      overlayName: args.name,
    });

    if (result.installed.length > 0) {
      consola.success(`Installed ${result.installed.length} library files:`);
      for (const item of result.installed) {
        consola.log(`  ✔ [${item.overlay}] ${item.lib} -> ${item.path}`);
      }
    } else if (result.failed.length === 0) {
      consola.info("No missing target libraries detected.");
    }

    if (result.failed.length > 0) {
      consola.error(`Failed to install ${result.failed.length} libraries:`);
      for (const fail of result.failed) {
        consola.log(`  ✖ [${fail.overlay}] ${fail.lib}: ${fail.reason}`);
      }
      process.exitCode = 1;
    }
  },
});
