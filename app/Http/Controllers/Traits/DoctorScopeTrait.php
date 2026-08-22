<?php

namespace App\Http\Controllers\Traits;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

trait DoctorScopeTrait
{
    /**
     * Check if the current user is a doctor (EMP_STS = 'D').
     * Doctors only see patients referred to themselves.
     */
    protected function isDoctor(): bool
    {
        return Auth::check() && Auth::user()->EMP_STS === 'D';
    }

    /**
     * Append doctor-scope condition to a SELECT query on opt_visit,
     * so doctors only see patients referred to themselves.
     */
    protected function applyDoctorScope(string &$query, array &$bindings): void
    {
        if ($this->isDoctor()) {
            $query .= " and b.OP_SEND_DR = :emId";
            $bindings['emId'] = Auth::user()->Em_id;
        }
    }

    /**
     * Append doctor-scope condition to an UPDATE statement on opt_visit.
     */
    protected function applyDoctorUpdateScope(string &$sql, array &$bindings): void
    {
        if ($this->isDoctor()) {
            $sql .= " AND OP_SEND_DR = :emId";
            $bindings['emId'] = Auth::user()->Em_id;
        }
    }

    /**
     * Check whether the logged-in doctor is allowed to access the given patient visit.
     * Non-doctors (staff/admin) always pass.
     */
    protected function canAccessPatient(string $hn, ?string $vtNo = null): bool
    {
        if (!$this->isDoctor()) {
            return true;
        }

        $sql = "SELECT COUNT(*) as cnt FROM opt_visit b WHERE b.op_hn = :hn AND b.OP_SEND_DR = :emId";
        $bindings = ['hn' => $hn, 'emId' => Auth::user()->Em_id];
        if ($vtNo !== null) {
            $sql .= " AND b.VT_NO = :vt";
            $bindings['vt'] = $vtNo;
        }

        $rows = DB::select($sql, $bindings);
        return (int) ($rows[0]->cnt ?? 0) > 0;
    }

    /**
     * Format a Thai Buddhist Era date string or ISO date string into standard Gregorian format.
     */
    protected function formatToGregorian(?string $dateStr): string
    {
        if (empty($dateStr)) return '';
        try {
            $s = (string)$dateStr;
            $s = preg_replace_callback('/\b(25\d{2})\b/', function ($m) {
                return (int)$m[1] - 543;
            }, $s);

            $dt = new \DateTime($s);
            return $dt->format('d/m/Y h:i:s A');
        } catch (\Exception $e) {
            return (string)$dateStr;
        }
    }

    /**
     * Calculate patient age with years and months from OP_BIRTH date string to current date, with fallback to OP_AGE.
     * Supports Gregorian and Thai Buddhist Era years (e.g. 25xx).
     */
    protected function calculateAgeWithMonths($birthDate, $fallbackAge = null): string
    {
        if (empty($birthDate) || $birthDate === '-') {
            if (!empty($fallbackAge) && is_numeric($fallbackAge)) {
                return intval($fallbackAge) . ' ปี';
            }
            return !empty($fallbackAge) ? strval($fallbackAge) : '-';
        }

        $raw = trim(strval($birthDate));
        // Check for Buddhist Era year e.g. 2530-05-14 or 2530/05/14
        if (preg_match('/^(25\d{2})[- \/.](0[1-9]|1[0-2])[- \/.](0[1-9]|[12]\d|3[01])/', $raw, $m)) {
            $year = intval($m[1]) - 543;
            $month = intval($m[2]);
            $day = intval($m[3]);
            $raw = sprintf('%04d-%02d-%02d', $year, $month, $day);
        } elseif (preg_match('/^(0[1-9]|[12]\d|3[01])[- \/.](0[1-9]|1[0-2])[- \/.](25\d{2})/', $raw, $m)) {
            $year = intval($m[3]) - 543;
            $month = intval($m[2]);
            $day = intval($m[1]);
            $raw = sprintf('%04d-%02d-%02d', $year, $month, $day);
        }

        try {
            $birth = new \DateTime($raw);
            $now = new \DateTime();
            if ($birth > $now) {
                if (!empty($fallbackAge) && is_numeric($fallbackAge)) {
                    return intval($fallbackAge) . ' ปี';
                }
                return !empty($fallbackAge) ? strval($fallbackAge) : '-';
            }

            $diff = $now->diff($birth);
            $years = $diff->y;
            $months = $diff->m;
            $days = $diff->d;

            $parts = [];
            if ($years > 0) {
                $parts[] = $years . ' ปี';
            }
            if ($months > 0) {
                $parts[] = $months . ' เดือน';
            }

            if (empty($parts)) {
                return $days > 0 ? $days . ' วัน' : '0 วัน';
            }
            return implode(' ', $parts);
        } catch (\Exception $e) {
            if (!empty($fallbackAge) && is_numeric($fallbackAge)) {
                return intval($fallbackAge) . ' ปี';
            }
            return !empty($fallbackAge) ? strval($fallbackAge) : '-';
        }
    }

    /**
     * Helper to retrieve all X-Ray images for a patient across root and vt_id subdirectories.
     * Supports both new directory structure: uploads/xray/{hn}/{vt_id}/{file}
     * and legacy directory structure: uploads/xray/{hn}/{file}
     */
    protected function getXrayImagesData(string $hn): array
    {
        $baseDir = public_path("uploads/xray/{$hn}");
        if (!file_exists($baseDir)) {
            return [];
        }

        $items = [];
        $entries = array_diff(scandir($baseDir), ['.', '..']);

        foreach ($entries as $entry) {
            $entryPath = $baseDir . '/' . $entry;

            // Check if entry is a subdirectory (e.g. vt_id like 504188 or unassigned)
            if (is_dir($entryPath)) {
                $subDirVtId = is_numeric($entry) ? (int) $entry : null;
                $subFiles = array_diff(scandir($entryPath), ['.', '..']);
                foreach ($subFiles as $file) {
                    $filePath = $entryPath . '/' . $file;
                    if (is_file($filePath) && !str_ends_with($file, '.json')) {
                        $jsonPath = $filePath . '.json';
                        $category = 'X-Ray / Scan';
                        $imgVtId = $subDirVtId;
                        $imgVtNo = null;
                        if (file_exists($jsonPath)) {
                            $meta = json_decode(file_get_contents($jsonPath), true);
                            if (!empty($meta['category'])) $category = $meta['category'];
                            if (!empty($meta['vt_id'])) $imgVtId = (int) $meta['vt_id'];
                            if (!empty($meta['vt_no'])) $imgVtNo = (int) $meta['vt_no'];
                        }
                        $relativeName = "{$entry}/{$file}";
                        $items[] = [
                            'id' => md5($relativeName),
                            'filename' => $relativeName,
                            'url' => asset("uploads/xray/{$hn}/{$entry}/{$file}"),
                            'size' => round(filesize($filePath) / 1024, 1) . ' KB',
                            'category' => $category,
                            'uploaded_at' => date('d/m/Y H:i', filemtime($filePath)),
                            'vt_id' => $imgVtId,
                            'vt_no' => $imgVtNo,
                            'full_path' => $filePath,
                        ];
                    }
                }
            } elseif (is_file($entryPath) && !str_ends_with($entry, '.json')) {
                // Legacy file in root folder uploads/xray/{hn}/{file}
                $jsonPath = $entryPath . '.json';
                $category = 'X-Ray / Scan';
                $imgVtId = null;
                $imgVtNo = null;
                if (file_exists($jsonPath)) {
                    $meta = json_decode(file_get_contents($jsonPath), true);
                    if (!empty($meta['category'])) $category = $meta['category'];
                    if (!empty($meta['vt_id'])) $imgVtId = (int) $meta['vt_id'];
                    if (!empty($meta['vt_no'])) $imgVtNo = (int) $meta['vt_no'];
                }
                $items[] = [
                    'id' => md5($entry),
                    'filename' => $entry,
                    'url' => asset("uploads/xray/{$hn}/{$entry}"),
                    'size' => round(filesize($entryPath) / 1024, 1) . ' KB',
                    'category' => $category,
                    'uploaded_at' => date('d/m/Y H:i', filemtime($entryPath)),
                    'vt_id' => $imgVtId,
                    'vt_no' => $imgVtNo,
                    'full_path' => $entryPath,
                ];
            }
        }

        return $items;
    }

    /**
     * Synchronize the OP_Xray_Sts flag ('1' if images exist, '0' if empty) in OPT_VISIT.
     * If $vtId is provided, updates only that visit. Otherwise updates all visits for the given HN.
     */
    public function syncVisitXrayStatus(string $hn, ?int $vtId = null): void
    {
        try {
            $allImages = $this->getXrayImagesData($hn);

            if ($vtId !== null && $vtId > 0) {
                $count = 0;
                foreach ($allImages as $img) {
                    if (!empty($img['vt_id']) && (int) $img['vt_id'] === $vtId) {
                        $count++;
                    }
                }
                // Also check directly on disk in folder uploads/xray/{hn}/{vtId}
                $vtDir = public_path("uploads/xray/{$hn}/{$vtId}");
                if (file_exists($vtDir) && is_dir($vtDir)) {
                    $files = array_diff(scandir($vtDir), ['.', '..']);
                    $imageFiles = array_filter($files, function ($f) {
                        return !str_ends_with($f, '.json');
                    });
                    $count = max($count, count($imageFiles));
                }

                $status = ($count > 0) ? '1' : '0';
                DB::statement("UPDATE opt_visit SET OP_Xray_Sts = :sts WHERE VT_ID = :vtId", [
                    'sts' => $status,
                    'vtId' => $vtId,
                ]);
            } else {
                // Sync all visits for this HN
                $visits = DB::select("SELECT VT_ID FROM opt_visit WHERE op_hn = :hn", ['hn' => $hn]);
                if (!empty($visits)) {
                    // Build map of counts per vt_id
                    $countsByVt = [];
                    foreach ($allImages as $img) {
                        if (!empty($img['vt_id'])) {
                            $vId = (int) $img['vt_id'];
                            $countsByVt[$vId] = ($countsByVt[$vId] ?? 0) + 1;
                        }
                    }

                    foreach ($visits as $v) {
                        $curVtId = (int) $v->VT_ID;
                        $vtDir = public_path("uploads/xray/{$hn}/{$curVtId}");
                        $diskCount = 0;
                        if (file_exists($vtDir) && is_dir($vtDir)) {
                            $files = array_diff(scandir($vtDir), ['.', '..']);
                            $imageFiles = array_filter($files, function ($f) {
                                return !str_ends_with($f, '.json');
                            });
                            $diskCount = count($imageFiles);
                        }
                        $totalCount = max($countsByVt[$curVtId] ?? 0, $diskCount);
                        $status = ($totalCount > 0) ? '1' : '0';

                        DB::statement("UPDATE opt_visit SET OP_Xray_Sts = :sts WHERE VT_ID = :vtId", [
                            'sts' => $status,
                            'vtId' => $curVtId,
                        ]);
                    }
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Error syncing OP_Xray_Sts for HN {$hn}: " . $e->getMessage());
        }
    }
}

