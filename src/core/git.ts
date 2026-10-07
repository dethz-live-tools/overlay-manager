import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { InstallOverlayOptions, InstallResult } from "../types";
import { resolveOverlaysDir } from "./config";

export function normalizeGitUrl(input: string): string {
  const trimmed = input.trim();
  // If in user/repo format, prefix with GitHub URL
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return `https://github.com/${trimmed}.git`;
  }
  return trimmed;
}

export function extractRepoName(gitUrl: string): string {
  const cleanUrl = gitUrl.trim().replace(/\.git\/?$/, "");
  const lastSegment = cleanUrl.split("/").filter(Boolean).pop() || "overlay";
  return lastSegment.split(":").filter(Boolean).pop() || "overlay";
}

function runGitCommand(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      reject(err);
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

export async function cloneOverlayFromGit(options: InstallOverlayOptions): Promise<InstallResult> {
  const targetDir = resolveOverlaysDir(options.staticDir);
  const normalizedUrl = normalizeGitUrl(options.gitUrl);
  const name = options.name || extractRepoName(normalizedUrl);
  const destPath = join(targetDir, name);

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  if (existsSync(destPath)) {
    return {
      success: false,
      name,
      destPath,
      error: `Destination directory already exists: ${destPath}`,
    };
  }

  const gitArgs = ["clone", "--depth", "1"];
  if (options.branch) {
    gitArgs.push("--branch", options.branch);
  }
  gitArgs.push(normalizedUrl, destPath);

  try {
    const result = await runGitCommand(gitArgs);
    if (result.code !== 0) {
      return {
        success: false,
        name,
        destPath,
        error: `Git clone failed (exit code ${result.code}): ${result.stderr.trim() || result.stdout.trim()}`,
      };
    }

    return {
      success: true,
      name,
      destPath,
    };
  } catch (err: any) {
    return {
      success: false,
      name,
      destPath,
      error: `Failed to execute git clone: ${err?.message || String(err)}`,
    };
  }
}
