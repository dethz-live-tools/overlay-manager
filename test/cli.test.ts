import { describe, expect, it } from "bun:test";
import {
  createCli,
  installCommand,
  checkCommand,
  installLibsCommand,
  listCommand,
  configCommand,
  version,
  resolveStaticDir,
  readOverlayManifest,
  loadAppConfig,
  saveAppConfig,
} from "../src/index";
import { extractRepoName, normalizeGitUrl } from "../src/core/git";
import { detectLibsFromHtml } from "../src/core/scanner";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

describe("overlay-manager CLI & Library", () => {
  it("initializes yargs CLI and version", () => {
    const cli = createCli(["--help"]);
    expect(cli).toBeDefined();
    expect(version).toBeDefined();
  });

  it("registers dedicated subcommands", () => {
    expect(configCommand.command).toContain("config");
    expect(installCommand.command).toContain("install");
    expect(checkCommand.command).toContain("check");
    expect(installLibsCommand.command).toContain("install-libs");
    expect(listCommand.command).toContain("list");
  });

  it("extracts and normalizes git repository names", () => {
    expect(extractRepoName("https://github.com/dethz-live-tools/dethz-overlay-vertical.git")).toBe("dethz-overlay-vertical");
    expect(normalizeGitUrl("dethz-live-tools/dethz-overlay-vertical")).toBe("https://github.com/dethz-live-tools/dethz-overlay-vertical.git");
  });

  it("detects libs referenced in HTML", () => {
    const sampleHtml = `
      <link rel="stylesheet" href="./libs/dethz-lib/css/system.css">
      <link rel="stylesheet" href="./libs/dethz-lib/css/now-playing.css">
      <script src="./libs/socket.io/socket.io.min.js"></script>
    `;
    const libs = detectLibsFromHtml(sampleHtml);
    expect(libs).toContain("dethz-lib");
    expect(libs).toContain("socket.io");
  });

  it("reads and parses meta.yaml", () => {
    const testDir = join(process.cwd(), ".tmp-test-overlay");
    mkdirSync(testDir, { recursive: true });

    const sampleMetaYaml = `
name: "deth'z overlay vertical"
description: "just another simple overlay on deth'z live stream"
image: "src/background.png"
author: "dethz"
entry: "index.html"
libs:
  - dethz-lib
`;
    writeFileSync(join(testDir, "meta.yaml"), sampleMetaYaml);

    const { manifest, manifestFile } = readOverlayManifest(testDir);
    expect(manifestFile).toBe("meta.yaml");
    expect(manifest?.name).toBe("deth'z overlay vertical");
    expect(manifest?.description).toBe("just another simple overlay on deth'z live stream");
    expect(manifest?.image).toBe("src/background.png");
    expect(manifest?.libs).toEqual(["dethz-lib"]);

    rmSync(testDir, { recursive: true, force: true });
  });

  it("scans static/libs directory separately", () => {
    const testStatic = join(process.cwd(), ".tmp-test-static");
    const testLibs = join(testStatic, "libs", "dethz-lib");
    mkdirSync(testLibs, { recursive: true });
    writeFileSync(join(testLibs, "system.css"), "/* test */");

    const { scanStaticLibs } = require("../src/index");
    const libs = scanStaticLibs(testStatic);
    expect(libs.length).toBe(1);
    expect(libs[0].name).toBe("dethz-lib");
    expect(libs[0].isDirectory).toBe(true);
    expect(libs[0].filesCount).toBe(1);

    rmSync(testStatic, { recursive: true, force: true });
  });

  it("saves and loads configuration in JSON and YAML", () => {
    const tempJsonConfig = join(process.cwd(), ".tmp-overlay.config.json");
    const tempYamlConfig = join(process.cwd(), ".tmp-overlay.config.yaml");

    // Test JSON save & load
    saveAppConfig({ staticDir: "./my-custom-static" }, tempJsonConfig);
    const loadedJson = loadAppConfig(tempJsonConfig);
    expect(loadedJson.config.staticDir).toBe("./my-custom-static");

    const resolved = resolveStaticDir(undefined, tempJsonConfig);
    expect(resolved).toContain("my-custom-static");

    // Test YAML save & load
    saveAppConfig({ staticDir: "../stream-overlay-socket/static" }, tempYamlConfig);
    const loadedYaml = loadAppConfig(tempYamlConfig);
    expect(loadedYaml.config.staticDir).toBe("../stream-overlay-socket/static");

    rmSync(tempJsonConfig, { force: true });
    rmSync(tempYamlConfig, { force: true });
  });
});
