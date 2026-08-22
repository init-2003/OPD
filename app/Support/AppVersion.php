<?php

namespace App\Support;

class AppVersion
{
    protected static ?string $cachedVersion = null;
    protected static ?string $cachedBuild = null;
    protected static ?string $cachedCommit = null;

    /**
     * Get the application version (e.g. '1.0.0').
     */
    public static function getVersion(): string
    {
        if (static::$cachedVersion !== null) {
            return static::$cachedVersion;
        }

        $meta = static::readVersionFile();
        if (!empty($meta['version'])) {
            return static::$cachedVersion = (string)$meta['version'];
        }

        return static::$cachedVersion = (string)config('app.version', env('APP_VERSION', '1.0.0'));
    }

    /**
     * Get the application build number (e.g. '11' or run_number).
     */
    public static function getBuild(): string
    {
        if (static::$cachedBuild !== null) {
            return static::$cachedBuild;
        }

        $meta = static::readVersionFile();
        if (!empty($meta['build']) && $meta['build'] !== 'local') {
            return static::$cachedBuild = (string)$meta['build'];
        }

        $envBuild = env('APP_BUILD');
        if (!empty($envBuild) && $envBuild !== 'local') {
            return static::$cachedBuild = (string)$envBuild;
        }

        // 1. Try git CLI commands (standard PATH and known Windows Git path)
        $gitCommands = [
            'git rev-list --count HEAD 2>nul',
            '"C:\\Program Files\\Git\\cmd\\git.exe" rev-list --count HEAD 2>nul',
            '"C:\\Program Files\\Git\\bin\\git.exe" rev-list --count HEAD 2>nul',
        ];

        foreach ($gitCommands as $cmd) {
            $gitCount = trim((string)@shell_exec($cmd));
            if ($gitCount !== '' && is_numeric($gitCount)) {
                return static::$cachedBuild = $gitCount;
            }
        }

        // 2. Pure PHP fallback: read directly from .git/logs/HEAD without needing git.exe
        $reflogPath = base_path('.git/logs/HEAD');
        if (file_exists($reflogPath)) {
            $lines = file($reflogPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (!empty($lines)) {
                return static::$cachedBuild = (string)count($lines);
            }
        }

        return static::$cachedBuild = '1';
    }

    /**
     * Get the current Git commit short hash (e.g. '053e28c').
     */
    public static function getCommit(): ?string
    {
        if (static::$cachedCommit !== null) {
            return static::$cachedCommit;
        }

        $meta = static::readVersionFile();
        if (!empty($meta['commit'])) {
            return static::$cachedCommit = (string)$meta['commit'];
        }

        $gitCommands = [
            'git rev-parse --short HEAD 2>nul',
            '"C:\\Program Files\\Git\\cmd\\git.exe" rev-parse --short HEAD 2>nul',
        ];

        foreach ($gitCommands as $cmd) {
            $gitHash = trim((string)@shell_exec($cmd));
            if ($gitHash !== '') {
                return static::$cachedCommit = $gitHash;
            }
        }

        // Pure PHP fallback: read hash from .git/HEAD
        $headPath = base_path('.git/HEAD');
        if (file_exists($headPath)) {
            $headContent = trim((string)file_get_contents($headPath));
            if (str_starts_with($headContent, 'ref: ')) {
                $refFile = base_path('.git/' . trim(substr($headContent, 5)));
                if (file_exists($refFile)) {
                    return static::$cachedCommit = substr(trim((string)file_get_contents($refFile)), 0, 7);
                }
            } elseif (strlen($headContent) >= 7) {
                return static::$cachedCommit = substr($headContent, 0, 7);
            }
        }

        return static::$cachedCommit = null;
    }

    /**
     * Read version metadata from version.json if present.
     */
    protected static function readVersionFile(): array
    {
        $path = base_path('version.json');
        if (file_exists($path)) {
            try {
                $json = json_decode(file_get_contents($path), true);
                if (is_array($json)) {
                    return $json;
                }
            } catch (\Throwable $e) {
                // Ignore corrupt file
            }
        }
        return [];
    }
}
