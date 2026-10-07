import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import type { CommandModule } from "yargs";
import { loadAppConfig, resolveStaticDir, saveAppConfig } from "../core/config";
import { log, printBox } from "../core/logger";
import { loadRootStaticConfig } from "../core/root-config";

export interface ConfigArgs {
  action?: string;
  key?: string;
  value?: string;
  file?: string;
}

export const configCommand: CommandModule<{}, ConfigArgs> = {
  command: "config [action] [key] [value]",
  describe: "Manage overlay-manager configuration (e.g. static directory path)",
  builder: (yargs) =>
    yargs
      .positional("action", {
        type: "string",
        choices: ["get", "set"],
        default: "get",
        describe: "Action to perform: 'get' or 'set' (defaults to 'get')",
      })
      .positional("key", {
        type: "string",
        describe: "Configuration key (e.g. 'staticDir')",
      })
      .positional("value", {
        type: "string",
        describe: "Value to set when using action 'set'",
      })
      .option("file", {
        alias: "f",
        type: "string",
        describe: "Path to specific config file to read or update",
      }),
  handler: async (argv) => {
    const action = argv.action?.toLowerCase() || "get";

    if (action === "set") {
      let key = argv.key;
      let value = argv.value;

      if (!key && process.stdin.isTTY) {
        key = await select({
          message: "Select config key to set:",
          choices: [
            { name: "staticDir (Static overlays directory path)", value: "staticDir" },
          ],
        });
      }

      if (!value && process.stdin.isTTY) {
        value = await input({
          message: `Enter value for '${key}':`,
          validate: (val) => (val.trim().length > 0 ? true : "Value cannot be empty"),
        });
      }

      if (!key || !value) {
        log.error("Usage: overlay-manager config set <key> <value>");
        process.exitCode = 1;
        return;
      }

      const { filePath } = saveAppConfig({ [key]: value }, argv.file);

      log.success(`Updated ${chalk.bold(key)} = ${chalk.cyan(`"${value}"`)} in: ${chalk.dim(filePath)}`);
      if (key === "staticDir") {
        log.info(`Resolved static directory: ${chalk.cyan(resolveStaticDir(undefined, argv.file))}`);
      }
      return;
    }

    // Action is 'get' (or default overview)
    const { config, filePath } = loadAppConfig(argv.file);

    if (argv.key) {
      const val = config[argv.key];
      if (val === undefined) {
        if (argv.key === "staticDir") {
          console.log(resolveStaticDir(undefined, argv.file));
        } else {
          log.warn(`Key '${argv.key}' is not set in configuration.`);
        }
      } else {
        console.log(val);
      }
      return;
    }

    // Show full configuration overview
    const resolvedStatic = resolveStaticDir(undefined, argv.file);
    const rootConfigInfo = loadRootStaticConfig();
    printBox(
      "Overlay Manager Configuration",
      [
        `Config File:            ${filePath ? chalk.cyan(filePath) : chalk.yellow("(No config file found - using defaults)")}`,
        `staticDir (configured): ${config.staticDir ? chalk.bold(config.staticDir) : chalk.dim("(not set)")}`,
        `staticDir (resolved):   ${chalk.green(resolvedStatic)}`,
        `Root Control Config:    ${rootConfigInfo.exists ? chalk.green(rootConfigInfo.filePath) : chalk.dim(`${rootConfigInfo.filePath} (not created)`) }`,
        Object.keys(config).length > 1
          ? `\nOther settings:\n${chalk.dim(JSON.stringify(config, null, 2))}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    );
  },
};
