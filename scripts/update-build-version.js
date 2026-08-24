import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const versionFilePath = path.join(rootDir, 'version.json');
const envFilePath = path.join(rootDir, '.env');

function getEnvVersion() {
    if (fs.existsSync(envFilePath)) {
        try {
            const envContent = fs.readFileSync(envFilePath, 'utf-8');
            const match = envContent.match(/^APP_VERSION\s*=\s*['"]?([^'"\r\n]+)['"]?/m);
            if (match && match[1]) {
                return match[1].trim();
            }
        } catch (e) {
            // Ignore env read error
        }
    }
    return null;
}

function getGitCommitCount() {
    const gitCommands = [
        'git rev-list --count HEAD',
        '"C:\\Program Files\\Git\\cmd\\git.exe" rev-list --count HEAD',
        '"C:\\Program Files\\Git\\bin\\git.exe" rev-list --count HEAD'
    ];

    for (const cmd of gitCommands) {
        try {
            const output = execSync(cmd, { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
            if (output && !isNaN(Number(output))) {
                return parseInt(output, 10);
            }
        } catch (e) {
            // Continue to next command
        }
    }

    // Reflog fallback
    const reflogPath = path.join(rootDir, '.git', 'logs', 'HEAD');
    if (fs.existsSync(reflogPath)) {
        try {
            const lines = fs.readFileSync(reflogPath, 'utf-8').trim().split('\n').filter(Boolean);
            if (lines.length > 0) return lines.length;
        } catch (e) {
            // Ignore fallback error
        }
    }

    return 1;
}

function getGitCommit() {
    const gitCommands = [
        'git rev-parse --short HEAD',
        '"C:\\Program Files\\Git\\cmd\\git.exe" rev-parse --short HEAD',
        '"C:\\Program Files\\Git\\bin\\git.exe" rev-parse --short HEAD'
    ];

    for (const cmd of gitCommands) {
        try {
            const output = execSync(cmd, { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
            if (output) return output;
        } catch (e) {
            // Continue to next command
        }
    }

    // Pure fallback from .git/HEAD
    const headPath = path.join(rootDir, '.git', 'HEAD');
    if (fs.existsSync(headPath)) {
        try {
            const headContent = fs.readFileSync(headPath, 'utf-8').trim();
            if (headContent.startsWith('ref: ')) {
                const refFile = path.join(rootDir, '.git', headContent.substring(5).trim());
                if (fs.existsSync(refFile)) {
                    return fs.readFileSync(refFile, 'utf-8').trim().substring(0, 7);
                }
            } else if (headContent.length >= 7) {
                return headContent.substring(0, 7);
            }
        } catch (e) {
            // Ignore fallback error
        }
    }

    return 'unknown';
}

function formatNow() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const envVersion = getEnvVersion() || process.env.APP_VERSION || process.env.VITE_APP_VERSION || '1.0.0';
const gitBuildCount = getGitCommitCount();
const gitCommitHash = getGitCommit();

const versionData = {
    version: envVersion,
    build: gitBuildCount,
    last_built_at: formatNow(),
    commit: gitCommitHash
};

fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2) + '\n', 'utf-8');

console.log('\x1b[32m%s\x1b[0m', `==========================================================`);
console.log('\x1b[32m%s\x1b[0m', `  ✔ [Build Success] Production Artifact Generated!`);
console.log('\x1b[36m%s\x1b[0m', `  Version : v${versionData.version} (Build: ${versionData.build})`);
console.log('\x1b[33m%s\x1b[0m', `  Commit  : ${versionData.commit}`);
console.log('\x1b[35m%s\x1b[0m', `  Time    : ${versionData.last_built_at}`);
console.log('\x1b[32m%s\x1b[0m', `==========================================================`);

