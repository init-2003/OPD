import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function getGitCommitCount() {
    const gitCommands = [
        'git rev-list --count HEAD',
        '"C:\\Program Files\\Git\\cmd\\git.exe" rev-list --count HEAD'
    ];
    for (const cmd of gitCommands) {
        try {
            const count = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
            if (count && !isNaN(Number(count))) return count;
        } catch {
            // continue
        }
    }
    return '1';
}

function getGitCommitHash() {
    const gitCommands = [
        'git rev-parse --short HEAD',
        '"C:\\Program Files\\Git\\cmd\\git.exe" rev-parse --short HEAD'
    ];
    for (const cmd of gitCommands) {
        try {
            const hash = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
            if (hash) return hash;
        } catch {
            // continue
        }
    }
    return '';
}

function getAppVersion() {
    try {
        if (fs.existsSync('.env')) {
            const envContent = fs.readFileSync('.env', 'utf-8');
            const match = envContent.match(/^APP_VERSION\s*=\s*['"]?([^'"\r\n]+)['"]?/m);
            if (match && match[1]) return match[1].trim();
        }
    } catch {
        // ignore
    }
    return '1.0.0';
}

const appVersion = getAppVersion();
const appBuild = getGitCommitCount();
const appCommit = getGitCommitHash();

// Inject dynamic Git variables into process.env for Vite client availability
process.env.VITE_APP_VERSION = appVersion;
process.env.VITE_APP_BUILD = appBuild;
process.env.VITE_APP_COMMIT = appCommit;

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        host: '127.0.0.1',
        cors: true,
        hmr: {
            host: '127.0.0.1',
        },
    },
});


