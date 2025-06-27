import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { z } from "zod";

export const configSchema = z.object({
  databaseFileName: z.string(),
  watchTargetDir: z.string(),
});

export type Config = z.infer<typeof configSchema>;

function getConfigDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  return xdgConfigHome || path.join(os.homedir(), ".config");
}

function getConfigPath(): string {
  return path.join(getConfigDir(), "cc-jsonl", "settings.json");
}

export function getDefaultDatabasePath(): string {
  return path.join(getConfigDir(), "cc-jsonl", "data.db");
}

export function getDefaultTargetDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, "claude", "projects");
  }
  return path.join(os.homedir(), ".claude", "projects");
}

export function loadConfig(): Config | null {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const configContent = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent);
    return configSchema.parse(config);
  } catch (error) {
    console.error("Failed to load config:", error);
    return null;
  }
}

export function saveConfig(config: Config): void {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function hasConfig(): boolean {
  const configPath = getConfigPath();
  return fs.existsSync(configPath);
}

export function getConfigOrEnv(): {
  databaseFileName: string | undefined;
  watchTargetDir: string | undefined;
} {
  const config = loadConfig();

  if (config) {
    return {
      databaseFileName: config.databaseFileName,
      watchTargetDir: config.watchTargetDir,
    };
  }

  return {
    databaseFileName: process.env.DATABASE_FILE_NAME,
    watchTargetDir: process.env.WATCH_TARGET_DIR,
  };
}
