<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('xray:sync-status {hn?}', function (?string $hn = null) {
    $baseDir = public_path('uploads/xray');
    if (!file_exists($baseDir)) {
        $this->warn("Upload directory does not exist: {$baseDir}");
        return;
    }

    $hnList = [];
    if (!empty($hn)) {
        $hnList = [$hn];
    } else {
        $dirs = array_diff(scandir($baseDir), ['.', '..']);
        foreach ($dirs as $dir) {
            if (is_dir($baseDir . '/' . $dir)) {
                $hnList[] = $dir;
            }
        }
    }

    $this->info("Scanning " . count($hnList) . " patient folder(s)...");

    $updatedVisitsWithImages = 0;
    $updatedVisitsEmpty = 0;

    foreach ($hnList as $patientHn) {
        $patientDir = $baseDir . '/' . $patientHn;
        if (!is_dir($patientDir)) {
            continue;
        }

        // Get all visits for this patient from database
        $dbVisits = \Illuminate\Support\Facades\DB::select("SELECT VT_ID, OP_Xray_Sts FROM opt_visit WHERE op_hn = :hn", ['hn' => $patientHn]);
        if (empty($dbVisits)) {
            continue;
        }

        // Collect image counts per vt_id
        $vtImageCounts = [];
        $entries = array_diff(scandir($patientDir), ['.', '..']);
        foreach ($entries as $entry) {
            $entryPath = $patientDir . '/' . $entry;
            if (is_dir($entryPath) && is_numeric($entry)) {
                $subFiles = array_diff(scandir($entryPath), ['.', '..']);
                $imgFiles = array_filter($subFiles, fn($f) => !str_ends_with($f, '.json'));
                $vtImageCounts[(int) $entry] = count($imgFiles);
            } elseif (is_file($entryPath) && !str_ends_with($entry, '.json')) {
                // Legacy file in root
                $jsonPath = $entryPath . '.json';
                if (file_exists($jsonPath)) {
                    $meta = json_decode(file_get_contents($jsonPath), true);
                    if (!empty($meta['vt_id'])) {
                        $vId = (int) $meta['vt_id'];
                        $vtImageCounts[$vId] = ($vtImageCounts[$vId] ?? 0) + 1;
                    }
                }
            }
        }

        foreach ($dbVisits as $visit) {
            $curVtId = (int) $visit->VT_ID;
            $hasImages = ($vtImageCounts[$curVtId] ?? 0) > 0;
            $targetSts = $hasImages ? '1' : '0';

            if (($visit->OP_Xray_Sts ?? null) !== $targetSts) {
                \Illuminate\Support\Facades\DB::statement("UPDATE opt_visit SET OP_Xray_Sts = :sts WHERE VT_ID = :vtId", [
                    'sts' => $targetSts,
                    'vtId' => $curVtId,
                ]);

                if ($hasImages) {
                    $updatedVisitsWithImages++;
                    $this->line("  [+] HN {$patientHn} | VT_ID {$curVtId} => OP_Xray_Sts = 1 (" . $vtImageCounts[$curVtId] . " images)");
                } else {
                    $updatedVisitsEmpty++;
                }
            }
        }
    }

    $this->info("Sync completed! Updated visits with images: {$updatedVisitsWithImages}, Updated empty visits: {$updatedVisitsEmpty}");
})->purpose('Synchronize OP_Xray_Sts (1 if images exist, 0 if empty) in OPT_VISIT for all or a specific HN');




