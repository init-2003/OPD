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

function getGitCommit() {
    const gitCommands = [
        'git rev-parse --short HEAD',
        '"C:\\Program Files\\Git\\cmd\\git.exe" rev-parse --short HEAD'
    ];

    for (const cmd of gitCommands) {
        try {
            const output = execSync(cmd, { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
            if (output) return output;
        } catch (e) {
            // Continue to next command
        }
    }
    return null;
}

function formatNow() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

let versionData = {
    version: '1.0.0',
    build: 0,
    last_built_at: '',
    commit: ''
};

if (fs.existsSync(versionFilePath)) {
    try {
        const raw = fs.readFileSync(versionFilePath, 'utf-8');
        versionData = { ...versionData, ...JSON.parse(raw) };
    } catch (e) {
        console.warn('⚠️ Could not parse existing version.json, resetting.');
    }
}

const isCI = !!(process.env.CI || process.env.GITHUB_ACTIONS);
const ciRunNumber = process.env.GITHUB_RUN_NUMBER;
const envVersion = getEnvVersion() || process.env.APP_VERSION || process.env.VITE_APP_VERSION;

if (envVersion && envVersion !== versionData.version) {
    console.log(`📌 Version changed: ${versionData.version} ➔ ${envVersion} (Resetting build counter to 1)`);
    versionData.version = envVersion;
    versionData.build = 1;
} else if (isCI && ciRunNumber) {
    versionData.build = parseInt(ciRunNumber, 10) || 1;
} else {
    versionData.build = (parseInt(versionData.build, 10) || 0) + 1;
}

versionData.last_built_at = formatNow();
versionData.commit = getGitCommit() || versionData.commit || 'unknown';

fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2) + '\n', 'utf-8');

console.log('\x1b[32m%s\x1b[0m', `==========================================================`);
console.log('\x1b[32m%s\x1b[0m', `  ✔ [Build Success] Production Artifact Generated!`);
console.log('\x1b[36m%s\x1b[0m', `  Version : ${versionData.version}`);
console.log('\x1b[36m%s\x1b[0m', `  Build   : ${versionData.build}`);
console.log('\x1b[33m%s\x1b[0m', `  Commit  : ${versionData.commit}`);
console.log('\x1b[35m%s\x1b[0m', `  Time    : ${versionData.last_built_at}`);
console.log('\x1b[32m%s\x1b[0m', `==========================================================`);
