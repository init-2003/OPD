<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\DoctorScopeTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PatientUltrasoundController extends Controller
{
    use DoctorScopeTrait;

    /**
     * Display dedicated Ultrasound findings edit page with Tiptap editor.
     */
    public function editUltrasound(Request $request, string $hn): Response
    {
        $vtNo = $request->query('vt');
        if (!empty($vtNo) && preg_match('/^\d+/', (string)$vtNo, $m)) {
            $vtNo = $m[0];
        } else if (!is_numeric($vtNo)) {
            $vtNo = null;
        }

        $query = "Select b.op_hn , a.*, ISNULL(a.pb_pfx_id,'')+'  '+ISNULL(a.op_name,'')+'  '+ISNULL(a.op_sname,'') as fullname , b.* , b.pb_now as pb_now1 , a.OP_ALLERGIC_STS as STS , b.OP_Xray_Result  , 
        (Select TOP 1 Image_PT From OPM_Image Where OP_HN = b.OP_HN) as Image_PT  
        From opm_pt a , opt_visit b  
        Where a.op_hn = :hn and a.op_hn = b.op_hn";

        $bindings = ['hn' => $hn];
        if ($vtNo) {
            $query .= " and b.VT_NO = :vt";
            $bindings['vt'] = $vtNo;
        }
        $this->applyDoctorScope($query, $bindings);
        $query .= " Order By b.vt_id DESC";

        $rawVisits = DB::select($query, $bindings);

        if (empty($rawVisits)) {
            $fallbackQuery = "Select b.op_hn , a.*, ISNULL(a.pb_pfx_id,'')+'  '+ISNULL(a.op_name,'')+'  '+ISNULL(a.op_sname,'') as fullname , b.* , b.pb_now as pb_now1 , a.OP_ALLERGIC_STS as STS , b.OP_Xray_Result  , 
            (Select TOP 1 Image_PT From OPM_Image Where OP_HN = b.OP_HN) as Image_PT  
            From opm_pt a , opt_visit b  
            Where a.op_hn = :hn and a.op_hn = b.op_hn";
            $fallbackBindings = ['hn' => $hn];
            $this->applyDoctorScope($fallbackQuery, $fallbackBindings);
            $fallbackQuery .= " Order By b.vt_id DESC";
            $rawVisits = DB::select($fallbackQuery, $fallbackBindings);
        }

        $patient = !empty($rawVisits) ? (array) $rawVisits[0] : null;

        if ($patient) {
            if (!empty($patient['Image_PT'])) {
                $base64 = base64_encode($patient['Image_PT']);
                $patient['Image_PT'] = 'data:image/jpeg;base64,' . $base64;
            } else {
                $patient['Image_PT'] = null;
            }

            if (!empty($patient['pb_now1'])) {
                $patient['formatted_date'] = $this->formatToGregorian($patient['pb_now1']);
            }

            if (!empty($patient['fullname'])) {
                $patient['fullname'] = preg_replace('/\s+/', ' ', trim($patient['fullname']));
            }

            $patient['formatted_age'] = $this->calculateAgeWithMonths($patient['OP_BIRTH'] ?? ($patient['op_birth'] ?? null), $patient['op_age'] ?? ($patient['OP_AGE'] ?? null));
        }

        $dbPresets = [];
        try {
            $presetsRaw = DB::select("SELECT PH_Xray_Name, PH_Xray_Result FROM PHM_XRAY WHERE PH_Xray_Name IS NOT NULL AND PH_Xray_Name <> '' ORDER BY PH_Xray_Name ASC");
            foreach ($presetsRaw as $idx => $row) {
                $dbPresets[] = [
                    'id' => 'db_' . ($idx + 1),
                    'label' => trim((string) ($row->PH_Xray_Name ?? '')),
                    'text' => trim((string) ($row->PH_Xray_Result ?? '')),
                ];
            }
        } catch (\Exception $e) {
            $dbPresets = [];
        }

        return Inertia::render('UltrasoundResult', [
            'patient' => $patient,
            'hn' => $hn,
            'dbPresets' => $dbPresets,
        ]);
    }

    /**
     * Update Ultrasound findings report.
     */
    public function updateUltrasound(Request $request, string $hn)
    {
        $request->validate([
            'xray_result' => 'nullable|string',
            'ref_doc' => 'nullable|string',
            'vt_no' => 'nullable|string',
        ]);

        $xrayResult = $request->input('xray_result', '');
        $refDoc = $request->input('ref_doc');
        $vtNo = $request->input('vt_no');

        // Check if findings result is effectively empty (e.g. ['<p></p>'], [''], empty string)
        if (!empty($xrayResult)) {
            $decoded = json_decode($xrayResult, true);
            if (is_array($decoded)) {
                $hasContent = false;
                foreach ($decoded as $p) {
                    $clean = trim(strip_tags(html_entity_decode((string)$p, ENT_QUOTES, 'UTF-8')));
                    $clean = str_replace(["\xc2\xa0", '&nbsp;', ' '], '', $clean);
                    if ($clean !== '' || stripos((string)$p, '<img') !== false) {
                        $hasContent = true;
                        break;
                    }
                }
                if (!$hasContent) {
                    $xrayResult = null;
                }
            } else {
                $clean = trim(strip_tags(html_entity_decode((string)$xrayResult, ENT_QUOTES, 'UTF-8')));
                $clean = str_replace(["\xc2\xa0", '&nbsp;', ' '], '', $clean);
                if ($clean === '' && stripos((string)$xrayResult, '<img') === false) {
                    $xrayResult = null;
                }
            }
        } else {
            $xrayResult = null;
        }

        if (!empty($vtNo) && preg_match('/^\d+/', (string)$vtNo, $m)) {
            $vtNo = $m[0];
        }

        if (!$this->canAccessPatient($hn, $vtNo)) {
            return redirect()->back()->with('error', 'ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ป่วยรายนี้');
        }

        if ($refDoc !== null && $vtNo) {
            $sql = "UPDATE opt_visit SET OP_Xray_Result = :xrayResult, OP_SEND_DR_Name = :refDoc WHERE op_hn = :hn AND VT_NO = :vtNo";
            $bindings = [
                'xrayResult' => $xrayResult,
                'refDoc' => $refDoc,
                'hn' => $hn,
                'vtNo' => $vtNo,
            ];
            $this->applyDoctorUpdateScope($sql, $bindings);
            DB::statement($sql, $bindings);
        } else if ($vtNo) {
            $sql = "UPDATE opt_visit SET OP_Xray_Result = :xrayResult WHERE op_hn = :hn AND VT_NO = :vtNo";
            $bindings = [
                'xrayResult' => $xrayResult,
                'hn' => $hn,
                'vtNo' => $vtNo,
            ];
            $this->applyDoctorUpdateScope($sql, $bindings);
            DB::statement($sql, $bindings);
        } else {
            $sql = "UPDATE opt_visit SET OP_Xray_Result = :xrayResult WHERE op_hn = :hn";
            $bindings = [
                'xrayResult' => $xrayResult,
                'hn' => $hn,
            ];
            $this->applyDoctorUpdateScope($sql, $bindings);
            DB::statement($sql, $bindings);
        }

        if ($request->expectsJson() || $request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'บันทึกผลการตรวจ X-Ray เรียบร้อยแล้ว',
                'xray_result' => $xrayResult,
            ]);
        }

        return redirect()->back()->with('success', 'บันทึกผลการตรวจ X-Ray เรียบร้อยแล้ว');
    }

    /**
     * Display dedicated Ultrasound image upload page with interactive Visit list.
     */
    public function showUltrasoundUploadPage(Request $request, string $hn): Response
    {
        $vtNo = $request->query('vt');
        if (!empty($vtNo) && preg_match('/^\d+/', (string)$vtNo, $m)) {
            $vtNo = $m[0];
        } else if (!is_numeric($vtNo)) {
            $vtNo = null;
        }

        // 1. Fetch Patient Header Info
        $patientRow = DB::selectOne("
            SELECT a.op_hn, 
                   LTRIM(RTRIM(ISNULL(a.pb_pfx_id,'') + ' ' + ISNULL(a.op_name,'') + ' ' + ISNULL(a.op_sname,''))) as fullname,
                   a.OP_ALLERGIC_STS as STS,
                   a.OP_ALLERGIC,
                   a.OP_SEX as op_sex,
                   a.OP_BIRTH as op_birth,
                   a.OP_ID as op_card_id,
                   (SELECT TOP 1 Image_PT FROM OPM_Image WHERE OP_HN = a.op_hn) as Image_PT
            FROM opm_pt a
            WHERE a.op_hn = :hn
        ", ['hn' => $hn]);

        $patient = null;
        if ($patientRow) {
            $calcAge = '';
            $birthRaw = trim((string) ($patientRow->op_birth ?? ''));
            if (!empty($birthRaw)) {
                $parts = explode('/', $birthRaw);
                if (count($parts) === 3) {
                    $d = (int)$parts[0];
                    $m = (int)$parts[1];
                    $y = (int)$parts[2];
                    if ($y > 2400) $y -= 543;
                    try {
                        $dob = new \DateTime(sprintf('%04d-%02d-%02d', $y, $m, $d));
                        $now = new \DateTime();
                        $diff = $now->diff($dob);
                        $calcAge = $diff->y;
                    } catch (\Exception $e) {}
                }
            }

            $patient = [
                'op_hn' => $patientRow->op_hn,
                'fullname' => preg_replace('/\s+/', ' ', trim($patientRow->fullname ?? '')),
                'Image_PT' => !empty($patientRow->Image_PT) ? 'data:image/jpeg;base64,' . base64_encode($patientRow->Image_PT) : null,
                'STS' => $patientRow->STS ?? '',
                'OP_ALLERGIC' => $patientRow->OP_ALLERGIC ?? '',
                'op_sex' => $patientRow->op_sex ?? '',
                'op_birth' => $patientRow->op_birth ?? '',
                'OP_BIRTH' => $patientRow->op_birth ?? '',
                'op_age' => $calcAge,
                'formatted_age' => $this->calculateAgeWithMonths($patientRow->op_birth, $calcAge),
                'op_card_id' => $patientRow->op_card_id ?? '',
            ];
        }

        // 2. Fetch All Visits for this Patient
        $visitQuery = "
            SELECT b.vt_id as VT_ID, b.vt_id, b.VT_NO, b.op_hn, b.pb_now as pb_now1, b.op_vt_date_time,
                   b.OP_CHIEF, b.OP_DIAG, b.OP_DETAIL, b.OP_SEND_DR, b.OP_SEND_DR_Name,
                   b.OP_BT, b.OP_WEIGHT, b.OP_HIGHT, b.OP_HR, b.OP_BP_UP, b.OP_BP_DW,
                   b.OP_RR, b.OP_R, b.OP_O2SAT, b.OP_Xray_Result
            FROM opt_visit b
            WHERE b.op_hn = :hn
        ";
        $visitBindings = ['hn' => $hn];
        $this->applyDoctorScope($visitQuery, $visitBindings);
        $visitQuery .= " ORDER BY b.vt_id DESC";

        $rawVisits = DB::select($visitQuery, $visitBindings);

        if (empty($rawVisits) && $this->isDoctor()) {
            // If scoped doctor query returned empty, try unscoped to allow viewing if permitted
            $fallbackQuery = "
                SELECT b.vt_id as VT_ID, b.vt_id, b.VT_NO, b.op_hn, b.pb_now as pb_now1, b.op_vt_date_time,
                       b.OP_CHIEF, b.OP_DIAG, b.OP_DETAIL, b.OP_SEND_DR, b.OP_SEND_DR_Name,
                       b.OP_BT, b.OP_WEIGHT, b.OP_HIGHT, b.OP_HR, b.OP_BP_UP, b.OP_BP_DW,
                       b.OP_RR, b.OP_R, b.OP_O2SAT, b.OP_Xray_Result
                FROM opt_visit b
                WHERE b.op_hn = :hn
                ORDER BY b.vt_id DESC
            ";
            $rawVisits = DB::select($fallbackQuery, ['hn' => $hn]);
        }

        // 3. Fetch All Uploaded Images
        $allImages = $this->getXrayImagesData($hn);

        // 4. Map Visits and Attach Image Counts
        $visits = array_map(function ($row) use ($allImages) {
            $data = (array) $row;
            $vtId = (int) ($data['VT_ID'] ?? $data['vt_id'] ?? 0);
            $vtNo = (int) ($data['VT_NO'] ?? $data['vt_no'] ?? 0);

            if (!empty($data['pb_now1'])) {
                $data['formatted_date'] = $this->formatToGregorian($data['pb_now1']);
            } elseif (!empty($data['op_vt_date_time'])) {
                $data['formatted_date'] = $this->formatToGregorian($data['op_vt_date_time']);
            } else {
                $data['formatted_date'] = '';
            }

            // Count images belonging to this visit
            $count = 0;
            foreach ($allImages as $img) {
                $imgVtId = isset($img['vt_id']) && $img['vt_id'] !== '' ? (int) $img['vt_id'] : null;
                $imgVtNo = isset($img['vt_no']) && $img['vt_no'] !== '' ? (int) $img['vt_no'] : null;

                if (($imgVtId && $vtId && $imgVtId === $vtId) || ($imgVtNo && $vtNo && $imgVtNo === $vtNo)) {
                    $count++;
                }
            }
            $data['image_count'] = $count;

            return $data;
        }, $rawVisits);

        // 5. Calculate Unassigned Images
        $validVtIds = array_filter(array_map(fn($v) => (int)($v['VT_ID'] ?? 0), $visits));
        $validVtNos = array_filter(array_map(fn($v) => (int)($v['VT_NO'] ?? 0), $visits));

        $unassignedXrayImages = [];
        foreach ($allImages as $img) {
            $imgVtId = isset($img['vt_id']) && $img['vt_id'] !== '' ? (int) $img['vt_id'] : null;
            $imgVtNo = isset($img['vt_no']) && $img['vt_no'] !== '' ? (int) $img['vt_no'] : null;

            $isAssigned = false;
            if ($imgVtId && in_array($imgVtId, $validVtIds, true)) {
                $isAssigned = true;
            } elseif ($imgVtNo && in_array($imgVtNo, $validVtNos, true)) {
                $isAssigned = true;
            }

            if (!$isAssigned) {
                $unassignedXrayImages[] = $img;
            }
        }

        // 6. Set Active / Default Visit
        $activeVisit = null;
        if ($vtNo !== null) {
            foreach ($visits as $v) {
                if ((string)($v['VT_NO'] ?? '') === (string)$vtNo) {
                    $activeVisit = $v;
                    break;
                }
            }
        }
        if (!$activeVisit && !empty($visits)) {
            $activeVisit = $visits[0];
        }

        if ($patient && $activeVisit) {
            $patient['VT_ID'] = $activeVisit['VT_ID'] ?? null;
            $patient['VT_NO'] = $activeVisit['VT_NO'] ?? null;
            $patient['formatted_date'] = $activeVisit['formatted_date'] ?? '';
            $patient['OP_SEND_DR_Name'] = $activeVisit['OP_SEND_DR_Name'] ?? '';
            $patient['OP_CHIEF'] = $activeVisit['OP_CHIEF'] ?? '';
            $patient['OP_DIAG'] = $activeVisit['OP_DIAG'] ?? '';
        }

        return Inertia::render('UltrasoundImage', [
            'patient' => $patient,
            'visits' => $visits,
            'allImages' => array_reverse($allImages),
            'unassignedXrayImages' => array_reverse($unassignedXrayImages),
            'defaultVtNo' => $activeVisit['VT_NO'] ?? null,
            'defaultVtId' => $activeVisit['VT_ID'] ?? null,
            'hn' => $hn,
        ]);
    }

    /**
     * Store uploaded Ultrasound image(s).
     */
    public function uploadUltrasoundImage(Request $request, string $hn)
    {
        $request->validate([
            'images' => 'required|array',
            'images.*' => 'required|file|mimes:jpeg,jpg,png,webp,gif,bmp|max:51200', // max 50MB
            'category' => 'nullable|string',
            'set_primary' => 'nullable|boolean',
            'vt_id' => 'nullable',
            'vt_no' => 'nullable',
        ]);

        if (!$this->canAccessPatient($hn)) {
            return redirect()->back()->with('error', 'ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ป่วยรายนี้');
        }

        $category = $request->input('category', 'X-Ray / Scan');
        $setPrimary = $request->boolean('set_primary', false);
        $vtId = $request->input('vt_id');
        $vtNo = $request->input('vt_no');

        if (empty($vtId) && !empty($vtNo)) {
            try {
                $vtRow = DB::select("SELECT TOP 1 VT_ID FROM opt_visit WHERE op_hn = :hn AND VT_NO = :vtNo ORDER BY vt_id DESC", [
                    'hn' => $hn,
                    'vtNo' => $vtNo,
                ]);
                if (!empty($vtRow[0]->VT_ID)) {
                    $vtId = (int) $vtRow[0]->VT_ID;
                }
            } catch (\Exception $e) {
                // ignore
            }
        }

        if (!empty($vtId)) {
            $uploadDir = public_path("uploads/xray/{$hn}/{$vtId}");
        } else {
            $uploadDir = public_path("uploads/xray/{$hn}");
        }

        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $filename = time() . '_' . rand(100, 999) . '_' . str_replace(' ', '_', $file->getClientOriginalName());
                $file->move($uploadDir, $filename);

                // Save metadata
                $meta = [
                    'category' => $category,
                    'original_name' => $file->getClientOriginalName(),
                    'uploaded_at' => date('Y-m-d H:i:s'),
                ];
                if (!empty($vtId)) {
                    $meta['vt_id'] = (int) $vtId;
                }
                if (!empty($vtNo)) {
                    $meta['vt_no'] = (int) $vtNo;
                }
                file_put_contents($uploadDir . '/' . $filename . '.json', json_encode($meta));

                // If set_primary, set as primary patient photo in OPM_Image
                if ($setPrimary) {
                    $contents = file_get_contents($uploadDir . '/' . $filename);
                    $exists = DB::select("SELECT COUNT(*) as cnt FROM OPM_Image WHERE OP_HN = :hn", ['hn' => $hn]);
                    $count = $exists[0]->cnt ?? 0;

                    if ($count > 0) {
                        DB::statement("UPDATE OPM_Image SET Image_PT = :img WHERE OP_HN = :hn", [
                            'img' => $contents,
                            'hn' => $hn,
                        ]);
                    } else {
                        DB::statement("INSERT INTO OPM_Image (OP_HN, Image_PT) VALUES (:hn, :img)", [
                            'hn' => $hn,
                            'img' => $contents,
                        ]);
                    }
                }
            }
        }

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'อัปโหลดรูปภาพ X-Ray เรียบร้อยแล้ว',
            ]);
        }

        return redirect()->back()->with('success', 'อัปโหลดรูปภาพ X-Ray เรียบร้อยแล้ว');
    }

    /**
     * Delete an uploaded Ultrasound image.
     */
    public function deleteUltrasoundImage(Request $request, string $hn)
    {
        $request->validate([
            'filename' => 'nullable|string',
            'filenames' => 'nullable|array',
            'filenames.*' => 'string',
        ]);

        if (!$this->canAccessPatient($hn)) {
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['error' => 'ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ป่วยรายนี้'], 403);
            }
            return redirect()->back()->with('error', 'ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ป่วยรายนี้');
        }

        $filenames = $request->input('filenames');
        if (!is_array($filenames) || empty($filenames)) {
            $filenames = $request->filled('filename') ? [$request->input('filename')] : [];
        }

        if (empty($filenames)) {
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['error' => 'ไม่พบไฟล์ที่ต้องการลบ'], 422);
            }
            return redirect()->back()->with('error', 'ไม่พบไฟล์ที่ต้องการลบ');
        }

        foreach ($filenames as $filename) {
            $cleanName = str_replace('\\', '/', trim((string)$filename));
            $filePath = public_path("uploads/xray/{$hn}/" . ltrim($cleanName, '/'));

            // If direct path doesn't exist, search across subfolders
            if (!file_exists($filePath)) {
                $base = basename($cleanName);
                $allImages = $this->getXrayImagesData($hn);
                foreach ($allImages as $img) {
                    if (basename($img['filename']) === $base || $img['filename'] === $cleanName) {
                        $filePath = $img['full_path'];
                        break;
                    }
                }
            }

            if (file_exists($filePath)) {
                $jsonPath = $filePath . '.json';
                $dir = dirname($filePath);
                unlink($filePath);
                if (file_exists($jsonPath)) {
                    unlink($jsonPath);
                }
                // If subfolder is empty, clean it up
                if ($dir !== public_path("uploads/xray/{$hn}") && is_dir($dir)) {
                    $remaining = array_diff(scandir($dir), ['.', '..']);
                    if (empty($remaining)) {
                        @rmdir($dir);
                    }
                }
            }
        }

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'ลบรูปภาพ X-Ray เรียบร้อยแล้ว',
            ]);
        }

        return redirect()->back()->with('success', 'ลบรูปภาพ X-Ray เรียบร้อยแล้ว');
    }
}
