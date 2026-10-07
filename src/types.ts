export interface TargetLibConfig {
  name: string;
  url?: string;
  git?: string;
  targetPath?: string;
}

export interface OverlayManifest {
  name?: string;
  version?: string;
  description?: string;
  image?: string; // Preview image path, e.g. "src/background.png"
  entry?: string; // Default: "index.html"
  author?: string | Record<string, any>;
  dependencies?: Record<string, string>;
  libs?: Array<string | TargetLibConfig>;
}

export interface OverlayInfo {
  id: string;
  name: string;
  description?: string;
  image?: string;
  hasImage?: boolean;
  path: string;
  entryFile: string;
  hasEntry: boolean;
  manifest?: OverlayManifest;
  manifestFile?: string; // e.g. "meta.yaml", "overlay.json"
  hasManifest: boolean;
  isValid: boolean;
  missingLibs: string[];
  detectedLibs: string[];
}

export interface StaticLibInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes?: number;
  filesCount?: number;
}

export interface AppConfig {
  staticDir?: string;
  [key: string]: any;
}

export interface InstallOverlayOptions {
  gitUrl: string;
  staticDir?: string;
  name?: string;
  branch?: string;
  installLibs?: boolean;
}

export interface InstallResult {
  success: boolean;
  name: string;
  destPath: string;
  installedLibs?: string[];
  error?: string;
}

export interface CheckResult {
  id: string;
  name: string;
  description?: string;
  path: string;
  isValid: boolean;
  entryExists: boolean;
  manifestFile?: string;
  hasImage?: boolean;
  imagePath?: string;
  missingLibs: string[];
  issues: string[];
}

export interface InstallLibsOptions {
  staticDir?: string;
  overlayName?: string;
  shared?: boolean;
}

export interface InstallLibsResult {
  success: boolean;
  installed: Array<{ overlay: string; lib: string; path: string }>;
  failed: Array<{ overlay: string; lib: string; reason: string }>;
}
