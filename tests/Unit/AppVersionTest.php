<?php

namespace Tests\Unit;

use App\Support\AppVersion;
use Tests\TestCase;

class AppVersionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        AppVersion::resetCache();
    }

    public function test_it_can_get_version(): void
    {
        $version = AppVersion::getVersion();
        $this->assertNotEmpty($version);
        $this->assertIsString($version);
    }

    public function test_it_can_get_build_number(): void
    {
        $build = AppVersion::getBuild();
        $this->assertNotEmpty($build);
        $this->assertTrue(is_numeric($build), "Build number '{$build}' should be numeric.");
    }

    public function test_it_can_get_commit_hash(): void
    {
        $commit = AppVersion::getCommit();
        // Commit may be null if outside git or git not installed, but in this repo it should be a 7-character hex hash or null
        if ($commit !== null) {
            $this->assertMatchesRegularExpression('/^[a-f0-9]{7}$/i', $commit);
        } else {
            $this->assertNull($commit);
        }
    }

    public function test_it_can_format_version_string(): void
    {
        $formatted = AppVersion::getFormattedVersion();
        $this->assertNotEmpty($formatted);
        $this->assertStringStartsWith('v', $formatted);
        $this->assertStringContainsString('(Build: ', $formatted);
    }
}
