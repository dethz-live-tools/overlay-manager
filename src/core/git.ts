import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { InstallOverlayOptions, InstallResult, PullResult } from "../types";
import { resolveOverlaysDir } from "./config";
import { scanOverlays } from "./scanner";

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

export function isGitRepo(dir: string): boolean {
  return existsSync(join(dir, ".git"));
}

export function runGitCommand(
  args: string[],
  cwd?: string
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
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

export async function pullGitRepo(
  dir: string,
  branch?: string
): Promise<{ success: boolean; stdout: string; stderr: string; isUpToDate: boolean; error?: string }> {
  if (!isGitRepo(dir)) {
    return {
      success: false,
      stdout: "",
      stderr: "",
      isUpToDate: false,
      error: `Directory is not a git repository: ${dir}`,
    };
  }

  const gitArgs = branch ? ["pull", "origin", branch] : ["pull"];

  try {
    const result = await runGitCommand(gitArgs, dir);
    const combinedOutput = `${result.stdout} ${result.stderr}`.trim();

    if (result.code !== 0) {
      return {
        success: false,
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim(),
        isUpToDate: false,
        error: `Git pull failed (exit code ${result.code}): ${result.stderr.trim() || result.stdout.trim()}`,
      };
    }

    const isUpToDate = combinedOutput.includes("Already up to date") || combinedOutput.includes("Already up-to-date");

    return {
      success: true,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      isUpToDate,
    };
  } catch (err: any) {
    return {
      success: false,
      stdout: "",
      stderr: "",
      isUpToDate: false,
      error: `Failed to execute git pull: ${err?.message || String(err)}`,
    };
  }
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
    if (isGitRepo(destPath)) {
      // Overlay exists and is a git repository: update it via pull!
      const pullResult = await pullGitRepo(destPath, options.branch);
      if (!pullResult.success) {
        return {
          success: false,
          name,
          destPath,
          error: pullResult.error,
        };
      }

      return {
        success: true,
        name,
        destPath,
        isUpdate: true,
      };
    }

    return {
      success: false,
      name,
      destPath,
      error: `Destination directory already exists and is not a git repository: ${destPath}`,
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
      isUpdate: false,
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

export async function pullOverlay(
  nameOrPath: string,
  staticDir?: string,
  branch?: string
): Promise<PullResult> {
  const baseDir = resolveOverlaysDir(staticDir);
  const destPath = existsSync(nameOrPath) ? nameOrPath : join(baseDir, nameOrPath);
  const name = nameOrPath.split("/").filter(Boolean).pop() || nameOrPath;

  if (!existsSync(destPath)) {
    return {
      name,
      path: destPath,
      success: false,
      status: "failed",
      message: `Directory not found: ${destPath}`,
    };
  }

  if (!isGitRepo(destPath)) {
    return {
      name,
      path: destPath,
      success: false,
      status: "not-git",
      message: "Not a Git repository",
    };
  }

  const res = await pullGitRepo(destPath, branch);
  if (!res.success) {
    return {
      name,
      path: destPath,
      success: false,
      status: "failed",
      message: res.error,
    };
  }

  return {
    name,
    path: destPath,
    success: true,
    status: res.isUpToDate ? "up-to-date" : "updated",
    message: res.stdout || "Pulled successfully",
  };
}

export async function pullAllOverlays(
  staticDir?: string,
  branch?: string
): Promise<PullResult[]> {
  const overlays = scanOverlays(staticDir);
  const results: PullResult[] = [];

  for (const overlay of overlays) {
    if (isGitRepo(overlay.path)) {
      results.push(await pullOverlay(overlay.path, staticDir, branch));
    }
  }

  return results;
}
