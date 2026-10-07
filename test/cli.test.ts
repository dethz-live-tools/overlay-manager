import { describe, expect, it } from "bun:test";
import { mainCommand, startCommand, initCommand, listCommand, version } from "../src/index";

describe("overlay-manager CLI", () => {
  it("defines main command metadata", async () => {
    const meta = typeof mainCommand.meta === "function" ? await mainCommand.meta() : await mainCommand.meta;
    expect(meta?.name).toBe("overlay-manager");
    expect(meta?.version).toBe(version);
  });

  it("registers subcommands", async () => {
    const startMeta = typeof startCommand.meta === "function" ? await startCommand.meta() : await startCommand.meta;
    const initMeta = typeof initCommand.meta === "function" ? await initCommand.meta() : await initCommand.meta;
    const listMeta = typeof listCommand.meta === "function" ? await listCommand.meta() : await listCommand.meta;

    expect(startMeta?.name).toBe("start");
    expect(initMeta?.name).toBe("init");
    expect(listMeta?.name).toBe("list");
  });
});
