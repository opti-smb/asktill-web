/**
 * Start Vite with a stable Node runtime on Windows 11 build 26200+.
 * System Node 24 Maglev JIT crashes Vite with exit 3221226505 (0xC0000409).
 * Prefer portable Node 20 + --no-maglev when available.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portableNode = path.join(root, '.tools', 'node-v20.19.4-win-x64', 'node.exe');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const usePortable = process.platform === 'win32' && fs.existsSync(portableNode);
const nodeBin = usePortable ? portableNode : process.execPath;
const nodeArgs = [];

// Maglev JIT crash workaround (safe on Node 20/24 when supported).
nodeArgs.push('--no-maglev');
nodeArgs.push(viteBin);
nodeArgs.push(...process.argv.slice(2));

if (usePortable) {
  console.log('[dev] using portable Node v20.19.4 (--no-maglev)');
} else {
  console.log(`[dev] using ${process.version} (--no-maglev)`);
}

const child = spawn(nodeBin, nodeArgs, {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING || '1',
    CHOKIDAR_INTERVAL: process.env.CHOKIDAR_INTERVAL || '1000',
  },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
