import { checkbox, select } from "@inquirer/prompts";
import chalk from "chalk";
import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function runCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: "inherit",
      shell: true,
    });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => resolve(code ?? 0));
  });
}

export interface OsTarget {
  id: string;
  name: string;
  bunTarget?: string;
  output: string;
  isExecutable: boolean;
}

export const OS_TARGETS: OsTarget[] = [
  {
    id: "current",
    name: "Current Host OS",
    output: "build/overlay-manager",
    isExecutable: true,
  },
  {
    id: "darwin-arm64",
    name: "macOS Apple Silicon (arm64)",
    bunTarget: "bun-darwin-arm64",
    output: "build/overlay-manager-darwin-arm64",
    isExecutable: true,
  },
  {
    id: "darwin-x64",
    name: "macOS Intel (x64)",
    bunTarget: "bun-darwin-x64",
    output: "build/overlay-manager-darwin-x64",
    isExecutable: true,
  },
  {
    id: "linux-x64",
    name: "Linux (x64)",
    bunTarget: "bun-linux-x64",
    output: "build/overlay-manager-linux-x64",
    isExecutable: true,
  },
  {
    id: "linux-arm64",
    name: "Linux (arm64)",
    bunTarget: "bun-linux-arm64",
    output: "build/overlay-manager-linux-arm64",
    isExecutable: true,
  },
  {
    id: "windows-x64",
    name: "Windows (x64)",
    bunTarget: "bun-windows-x64",
    output: "build/overlay-manager-windows-x64.exe",
    isExecutable: false,
  },
];

async function buildDist(): Promise<boolean> {
  console.log(chalk.cyan("\n📦 Building JavaScript binary & library bundle in ./dist..."));
  mkdirSync("dist", { recursive: true });

  const start = Date.now();

  // 1. Build CLI binary bundle
  console.log(chalk.dim("  → Bundling CLI (dist/cli.mjs)..."));
  const cliCode = await runCommand("bun", ["build", "src/cli.ts", "--outfile", "dist/cli.mjs", "--target", "node"]);
  if (cliCode !== 0) return false;
  try {
    chmodSync("dist/cli.mjs", 0o755);
  } catch {}

  // 2. Build Library bundle
  console.log(chalk.dim("  → Bundling Library (dist/index.mjs)..."));
  const libCode = await runCommand("bun", ["build", "src/index.ts", "--outfile", "dist/index.mjs", "--target", "node"]);
  if (libCode !== 0) return false;

  // 3. Build Types declarations
  console.log(chalk.dim("  → Generating TypeScript declarations..."));
  const typesCode = await runCommand("tsc", ["-p", "tsconfig.build.json"]);
  if (typesCode !== 0) return false;

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  const cliSize = existsSync("dist/cli.mjs") ? formatFileSize(statSync("dist/cli.mjs").size) : "";
  const libSize = existsSync("dist/index.mjs") ? formatFileSize(statSync("dist/index.mjs").size) : "";

  console.log(
    chalk.green(`✔ Built ./dist in ${duration}s (cli.mjs: ${cliSize}, index.mjs: ${libSize})`)
  );
  return true;
}

async function buildOsTarget(target: OsTarget): Promise<{ success: boolean; path: string; size?: string; duration: string }> {
  mkdirSync("build", { recursive: true });
  const start = Date.now();

  const args = ["build", "src/cli.ts", "--compile"];
  if (target.bunTarget) {
    args.push(`--target=${target.bunTarget}`);
  }
  args.push("--outfile", target.output);

  console.log(chalk.cyan(`\n🔨 Compiling native binary for ${chalk.bold(target.name)}...`));
  console.log(chalk.dim(`  → Target output: ${target.output}`));

  const code = await runCommand("bun", args);
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  if (code !== 0) {
    console.log(chalk.red(`✖ Failed to compile ${target.name}`));
    return { success: false, path: target.output, duration };
  }

  if (target.isExecutable && existsSync(target.output)) {
    try {
      chmodSync(target.output, 0o755);
    } catch {}
  }

  const size = existsSync(target.output) ? formatFileSize(statSync(target.output).size) : "unknown";
  console.log(chalk.green(`✔ Compiled ${target.name} -> ${chalk.bold(target.output)} (${size}) in ${duration}s`));
  return { success: true, path: target.output, size, duration };
}

async function main() {
  const args = process.argv.slice(2);

  let buildDistSelected = false;
  let selectedOsTargets: OsTarget[] = [];

  const hasAllFlag = args.includes("--all") || args.includes("-a");
  const hasDistFlag = args.includes("--dist") || args.includes("-d");
  const hasOsAllFlag = args.includes("--all-os") || args.includes("--os=all");
  const specificOsFlag = args.find((a) => a.startsWith("--os=") && a !== "--os=all");

  if (hasAllFlag) {
    buildDistSelected = true;
    selectedOsTargets = [...OS_TARGETS];
  } else if (hasDistFlag) {
    buildDistSelected = true;
  } else if (hasOsAllFlag) {
    selectedOsTargets = [...OS_TARGETS];
  } else if (specificOsFlag) {
    const osId = specificOsFlag.replace("--os=", "");
    const found = OS_TARGETS.find((t) => t.id === osId);
    if (!found) {
      console.error(chalk.red(`Unknown OS target: ${osId}. Available: ${OS_TARGETS.map((t) => t.id).join(", ")}`));
      process.exit(1);
    }
    selectedOsTargets = [found];
  } else if (!process.stdin.isTTY) {
    // Non-interactive fallback: default to building ./dist and current host binary
    buildDistSelected = true;
    selectedOsTargets = [OS_TARGETS[0]!];
  } else {
    // Interactive prompt mode
    console.log(chalk.magenta("\n╭──────────────────────────────────────────────────────────╮"));
    console.log(chalk.magenta("│ ") + chalk.bold.white("  Overlay Manager - Multi-Target Build Script            ") + chalk.magenta("│"));
    console.log(chalk.magenta("│ ") + chalk.dim("  Select which targets to build (binary in ./dist / OS in ./build) ") + chalk.magenta("│"));
    console.log(chalk.magenta("╰──────────────────────────────────────────────────────────╯\n"));

    const choice = await select({
      message: "What would you like to build?",
      choices: [
        {
          name: "📦 Build All (JS binary in ./dist + All OS binaries in ./build)",
          value: "all",
          description: "Compiles CLI bundle, types, and standalone binaries for macOS, Linux, and Windows",
        },
        {
          name: "🌐 JS Binary & Declarations only (to ./dist)",
          value: "dist",
          description: "Builds dist/cli.mjs, dist/index.mjs, and TypeScript declaration files",
        },
        {
          name: "💻 Current OS Binary only (to ./build/overlay-manager)",
          value: "current",
          description: "Compiles a standalone native executable for your current machine",
        },
        {
          name: "🖥️ All OS Native Binaries (to ./build)",
          value: "all-os",
          description: "Cross-compiles standalone native binaries for macOS, Linux, and Windows",
        },
        {
          name: "🎯 Custom Target Selection (choose specific targets)",
          value: "custom",
          description: "Pick and choose individual OS platforms and ./dist output",
        },
      ],
    });

    if (choice === "all") {
      buildDistSelected = true;
      selectedOsTargets = [...OS_TARGETS];
    } else if (choice === "dist") {
      buildDistSelected = true;
    } else if (choice === "current") {
      selectedOsTargets = [OS_TARGETS[0]!];
    } else if (choice === "all-os") {
      selectedOsTargets = [...OS_TARGETS];
    } else if (choice === "custom") {
      const selections = await checkbox({
        message: "Select targets to build:",
        choices: [
          { name: "🌐 JS Bundle & Types (./dist)", value: "dist", checked: true },
          ...OS_TARGETS.map((t) => ({
            name: `${t.id === "current" ? "💻" : "🖥️"} ${t.name} (./${t.output})`,
            value: t.id,
            checked: t.id === "current",
          })),
        ],
      });

      if (selections.includes("dist")) {
        buildDistSelected = true;
      }

      selectedOsTargets = OS_TARGETS.filter((t) => selections.includes(t.id));
    }
  }

  if (!buildDistSelected && selectedOsTargets.length === 0) {
    console.log(chalk.yellow("No targets selected. Exiting."));
    return;
  }

  console.log(chalk.blue(`\n🚀 Starting build process for ${[buildDistSelected ? "./dist" : null, ...selectedOsTargets.map((t) => t.id)].filter(Boolean).join(", ")}...\n`));

  let hasError = false;

  // 1. Build ./dist if selected
  if (buildDistSelected) {
    const success = await buildDist();
    if (!success) hasError = true;
  }

  // 2. Build OS binaries if selected
  const osResults: Array<{ name: string; path: string; size?: string; duration: string; success: boolean }> = [];
  for (const target of selectedOsTargets) {
    const res = await buildOsTarget(target);
    osResults.push({ name: target.name, ...res });
    if (!res.success) hasError = true;
  }

  // Print Summary Table
  console.log(chalk.magenta("\n╭──────────────────────────────────────────────────────────╮"));
  console.log(chalk.magenta("│ ") + chalk.bold.white("  Build Results Summary                                  ") + chalk.magenta("│"));
  console.log(chalk.magenta("╰──────────────────────────────────────────────────────────╯"));

  if (buildDistSelected) {
    console.log(`  ${chalk.green("✔")} ${chalk.bold("JS Bundle & Types")} -> ${chalk.cyan("./dist")} (cli.mjs, index.mjs, *.d.ts)`);
  }

  for (const item of osResults) {
    if (item.success) {
      console.log(`  ${chalk.green("✔")} ${chalk.bold(item.name.padEnd(30))} -> ${chalk.cyan(item.path.padEnd(42))} ${chalk.dim(`(${item.size || "done"})`)}`);
    } else {
      console.log(`  ${chalk.red("✖")} ${chalk.bold(item.name.padEnd(30))} -> ${chalk.red("FAILED")}`);
    }
  }

  console.log();

  if (hasError) {
    console.log(chalk.red("✖ One or more build targets failed."));
    process.exit(1);
  } else {
    console.log(chalk.green("✨ All selected build targets completed successfully!\n"));
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(chalk.red("Build script error:"), err);
    process.exit(1);
  });
}
