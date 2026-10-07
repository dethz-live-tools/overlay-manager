export interface OverlayManagerConfig {
  port?: number;
  host?: string;
  overlaysDir?: string;
}

export interface OverlayItem {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
}
