import { defineCommand } from "citty";
import { consola } from "consola";
import { loadAppConfig, resolveStaticDir, saveAppConfig } from "../core/config";

export const configCommand = defineCommand({
  meta: {
    name: "config",
    description: "Manage overlay-manager configuration (e.g. static directory path)",
  },
  args: {
    action: {
      type: "positional",
      description: "Action to perform: 'get' or 'set' (defaults to 'get')",
      default: "get",
      required: false,
    },
    key: {
      type: "positional",
      description: "Configuration key (e.g. 'staticDir')",
      required: false,
    },
    value: {
      type: "positional",
      description: "Value to set when using action 'set'",
      required: false,
    },
    file: {
      type: "string",
      description: "Path to specific config file to read or update",
      alias: "f",
    },
  },
  run({ args }) {
    const action = args.action?.toLowerCase();

    if (action === "set") {
      if (!args.key || !args.value) {
        consola.error("Usage: overlay-manager config set <key> <value>");
        process.exitCode = 1;
        return;
      }

      const { filePath, config } = saveAppConfig(
        { [args.key]: args.value },
        args.file
      );

      consola.success(`Updated ${args.key} = "${args.value}" in: ${filePath}`);
      if (args.key === "staticDir") {
        consola.info(`Resolved static directory: ${resolveStaticDir()}`);
      }
      return;
    }

    // Action is 'get' or default overview
    const { config, filePath } = loadAppConfig(args.file);

    if (args.key) {
      const val = config[args.key];
      if (val === undefined) {
        if (args.key === "staticDir") {
          consola.log(resolveStaticDir(undefined, args.file));
        } else {
          consola.warn(`Key '${args.key}' is not set in configuration.`);
        }
      } else {
        consola.log(val);
      }
      return;
    }

    // Show full configuration summary
    const resolvedStatic = resolveStaticDir(undefined, args.file);
    consola.box({
      title: "Overlay Manager Configuration",
      message: [
        `Config File: ${filePath || "(No config file found - using defaults)"}`,
        `staticDir (configured): ${config.staticDir || "(not set)"}`,
        `staticDir (resolved):   ${resolvedStatic}`,
        Object.keys(config).length > 1
          ? `\nOther settings:\n${JSON.stringify(config, null, 2)}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  },
});
