import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { CheckpointRecord } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../');
const CHECKPOINTS_DIR = path.resolve(PROJECT_ROOT, '.rare', 'checkpoints');
const REGISTRY_FILE = path.resolve(CHECKPOINTS_DIR, 'checkpoints_registry.json');

export class CheckpointStore {
  private registry: Map<string, CheckpointRecord> = new Map();

  constructor() {
    this.init();
  }

  private init(): void {
    try {
      if (!fs.existsSync(CHECKPOINTS_DIR)) {
        fs.mkdirSync(CHECKPOINTS_DIR, { recursive: true });
      }

      if (fs.existsSync(REGISTRY_FILE)) {
        const raw = fs.readFileSync(REGISTRY_FILE, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const cp of list) {
            this.registry.set(cp.id, cp);
          }
        }
      } else {
        // Create baseline initial checkpoint
        this.createCheckpoint('Initial baseline known-good state', 'known_good');
      }
    } catch (err) {
      console.error('[CheckpointStore] Init error:', err);
    }
  }

  private saveRegistry(): void {
    try {
      const arr = Array.from(this.registry.values());
      const tempPath = `${REGISTRY_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(arr, null, 2), 'utf-8');
      fs.renameSync(tempPath, REGISTRY_FILE);
    } catch (err) {
      console.error('[CheckpointStore] Failed to write registry:', err);
    }
  }

  public getAll(): CheckpointRecord[] {
    return Array.from(this.registry.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public getById(id: string): CheckpointRecord | undefined {
    return this.registry.get(id);
  }

  public createCheckpoint(
    description: string,
    status: 'known_good' | 'experimental' | 'unverified' = 'experimental',
    targetFiles?: string[]
  ): CheckpointRecord {
    const id = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const snapshotDir = path.resolve(CHECKPOINTS_DIR, id);
    fs.mkdirSync(snapshotDir, { recursive: true });

    // Files to backup
    const filesToBackup: string[] = targetFiles && targetFiles.length > 0
      ? targetFiles
      : ['server.ts', 'src/App.tsx', 'package.json', 'rare.config.json'];

    const backedUp: string[] = [];
    const hashGenerator = crypto.createHash('sha256');

    for (const rel of filesToBackup) {
      const fullPath = path.resolve(PROJECT_ROOT, rel);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const content = fs.readFileSync(fullPath);
        hashGenerator.update(content);
        const dest = path.resolve(snapshotDir, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, content);
        backedUp.push(rel);
      }
    }

    const record: CheckpointRecord = {
      id,
      timestamp: new Date().toISOString(),
      description,
      status,
      filesCount: backedUp.length,
      filesList: backedUp,
      snapshotDir: path.relative(PROJECT_ROOT, snapshotDir),
      hash: hashGenerator.digest('hex'),
    };

    this.registry.set(id, record);
    this.saveRegistry();
    return record;
  }

  public restoreCheckpoint(id: string): { success: boolean; restoredFiles: string[]; error?: string } {
    const cp = this.registry.get(id);
    if (!cp) {
      return { success: false, restoredFiles: [], error: `Checkpoint not found: ${id}` };
    }

    const snapshotDir = path.resolve(PROJECT_ROOT, cp.snapshotDir);
    if (!fs.existsSync(snapshotDir)) {
      return { success: false, restoredFiles: [], error: `Snapshot directory missing on disk: ${cp.snapshotDir}` };
    }

    const restored: string[] = [];
    for (const rel of cp.filesList) {
      const backupFile = path.resolve(snapshotDir, rel);
      const targetFile = path.resolve(PROJECT_ROOT, rel);
      if (fs.existsSync(backupFile)) {
        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        fs.copyFileSync(backupFile, targetFile);
        restored.push(rel);
      }
    }

    return { success: true, restoredFiles: restored };
  }
}
