import { defineCommand } from "citty";
import { consola } from "consola";
import { checkAllOverlays } from "../core/checker";

export const checkCommand = defineCommand({
  meta: {
    name: "check",
    description: "Check overlay status, entrypoint files, and required target libraries",
  },
  args: {
    name: {
      type: "positional",
      description: "Specific overlay name to check (checks all if omitted)",
      required: false,
    },
    staticDir: {
      type: "string",
      description: "Static directory path (default: env STATIC_DIR or ./static)",
      alias: "s",
    },
  },
  run({ args }) {
    consola.start("Checking stream overlays...");
    const results = checkAllOverlays(args.staticDir, args.name);

    if (results.length === 0) {
      consola.warn("No overlays found in static directory.");
      return;
    }

    let hasErrors = false;

    for (const res of results) {
      const manifestLabel = res.manifestFile ? `[${res.manifestFile}]` : "[no manifest]";
      if (res.isValid) {
        consola.success(`[VALID] ${res.name} ${manifestLabel}`);
        if (res.description) {
          consola.log(`  └─ Description: ${res.description}`);
        }
      } else {
        hasErrors = true;
        consola.error(`[INVALID] ${res.name} ${manifestLabel}`);
        if (res.description) {
          consola.log(`  └─ Description: ${res.description}`);
        }
        for (const issue of res.issues) {
          consola.log(`  └─ ⚠️  ${issue}`);
        }
      }
    }

    if (hasErrors) {
      consola.warn("Some overlays require attention. Run 'overlay-manager install-libs' to resolve missing libraries.");
      process.exitCode = 1;
    } else {
      consola.success(`All ${results.length} checked overlays are healthy and ready!`);
    }
  },
});
