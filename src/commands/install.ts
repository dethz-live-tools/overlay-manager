import { defineCommand } from "citty";
import { consola } from "consola";
import { cloneOverlayFromGit } from "../core/git";
import { installOverlayLibs } from "../core/libs";

export const installCommand = defineCommand({
  meta: {
    name: "install",
    description: "Install an overlay from a Git repository into the static folder",
  },
  args: {
    gitUrl: {
      type: "positional",
      description: "Git repository URL to clone (e.g. https://github.com/user/overlay.git)",
      required: true,
    },
    staticDir: {
      type: "string",
      description: "Static directory path (default: env STATIC_DIR or ./static)",
      alias: "s",
    },
    name: {
      type: "string",
      description: "Custom overlay folder name",
      alias: "n",
    },
    branch: {
      type: "string",
      description: "Specific Git branch or tag to clone",
      alias: "b",
    },
    skipLibs: {
      type: "boolean",
      description: "Skip automatic installation of target libraries",
      default: false,
    },
  },
  async run({ args }) {
    consola.start(`Cloning overlay from ${args.gitUrl}...`);

    const result = await cloneOverlayFromGit({
      gitUrl: args.gitUrl,
      staticDir: args.staticDir,
      name: args.name,
      branch: args.branch,
    });

    if (!result.success) {
      consola.error(result.error || "Failed to clone overlay");
      process.exitCode = 1;
      return;
    }

    consola.success(`Successfully installed overlay '${result.name}' at: ${result.destPath}`);

    if (!args.skipLibs) {
      consola.info("Checking for required target libraries...");
      const libResult = await installOverlayLibs(result.destPath, result.name);
      if (libResult.installed.length > 0) {
        consola.success(`Installed ${libResult.installed.length} target libraries: ${libResult.installed.map((l) => l.lib).join(", ")}`);
      }
      if (libResult.failed.length > 0) {
        consola.warn(`Failed to install ${libResult.failed.length} libraries: ${libResult.failed.map((f) => `${f.lib} (${f.reason})`).join(", ")}`);
      }
    }
  },
});
