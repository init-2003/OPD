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

        // Automatic Git Commit Count resolution (works automatically on git pull)
        $gitCount = trim((string)@shell_exec('git rev-list --count HEAD 2>nul'));
        if ($gitCount !== '' && is_numeric($gitCount)) {
            return static::$cachedBuild = $gitCount;
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

        $gitHash = trim((string)@shell_exec('git rev-parse --short HEAD 2>nul'));
        if ($gitHash !== '') {
            return static::$cachedCommit = $gitHash;
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
