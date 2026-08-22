<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\DoctorScopeTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    use DoctorScopeTrait;

    /**
     * Display dedicated patient medical record detail page.
     */
    public function show(Request $request, string $hn): Response
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

        $patient = null;
        if (!empty($rawVisits)) {
            $data = (array) $rawVisits[0];

            if (!empty($data['Image_PT'])) {
                $base64 = base64_encode($data['Image_PT']);
                $data['Image_PT'] = 'data:image/jpeg;base64,' . $base64;
            } else {
                $data['Image_PT'] = null;
            }

            if (!empty($data['pb_now1'])) {
                $data['formatted_date'] = $this->formatToGregorian($data['pb_now1']);
            } else {
                $data['formatted_date'] = '';
            }

            if (!empty($data['fullname'])) {
                $data['fullname'] = preg_replace('/\s+/', ' ', trim($data['fullname']));
            }

            $data['formatted_age'] = $this->calculateAgeWithMonths($data['OP_BIRTH'] ?? ($data['op_birth'] ?? null), $data['op_age'] ?? ($data['OP_AGE'] ?? null));

            $patient = $data;
        }

        $visitVtId = (int) ($patient['VT_ID'] ?? $patient['vt_id'] ?? 0);
        $visitVtNo = (int) ($patient['VT_NO'] ?? $patient['vt_no'] ?? 0);
        $allXrayImages = $this->getXrayImagesData($hn);

        $visitImages = array_values(array_filter($allXrayImages, function ($img) use ($visitVtId, $visitVtNo) {
            $imgVtId = isset($img['vt_id']) && $img['vt_id'] !== '' ? (int) $img['vt_id'] : null;
            $imgVtNo = isset($img['vt_no']) && $img['vt_no'] !== '' ? (int) $img['vt_no'] : null;
            if ($visitVtId && $imgVtId && $imgVtId === $visitVtId) return true;
            if (!$imgVtId && $visitVtNo && $imgVtNo && $imgVtNo === $visitVtNo) return true;
            return false;
        }));

        $xrayImageCount = count($visitImages);

        $doctors = DB::select("
            SELECT Em_id, Em_Fullname, EMP_STS
            FROM Create_User 
            WHERE EMP_STS = 'D' AND Em_Fullname IS NOT NULL AND Em_Fullname <> ''
            ORDER BY Em_Fullname ASC
        ");
        $doctorList = array_map(function ($doc) {
            return [
                'id' => (string) ($doc->Em_id ?? ''),
                'name' => trim((string) ($doc->Em_Fullname ?? '')),
                'is_doctor' => strtoupper(trim((string) ($doc->EMP_STS ?? ''))) === 'D',
            ];
        }, $doctors);

        return Inertia::render('PatientDetail', [
            'patient' => $patient,
            'hn' => $hn,
            'visitImages' => array_reverse($visitImages),
            'xrayImageCount' => $xrayImageCount,
            'doctors' => $doctorList,
        ]);
    }

    /**
     * Display all treatment history (visits) of a patient as a table.
     */
    public function history(Request $request, string $hn): Response
    {
        // 1. Fetch Patient Header & Image ONCE
        $patientRow = DB::selectOne("
            SELECT a.op_hn, 
                   LTRIM(RTRIM(ISNULL(a.pb_pfx_id,'') + ' ' + ISNULL(a.op_name,'') + ' ' + ISNULL(a.op_sname,''))) as fullname,
                   a.OP_ALLERGIC_STS as STS,
                   a.OP_ALLERGIC,
                   a.OP_BIRTH as op_birth,
                   a.OP_SEX as op_sex,
                   (SELECT TOP 1 Image_PT FROM OPM_Image WHERE OP_HN = a.op_hn) as Image_PT
            FROM opm_pt a
            WHERE a.op_hn = :hn
        ", ['hn' => $hn]);

        $patient = null;
        if ($patientRow) {
            $patient = [
                'op_hn' => $patientRow->op_hn,
                'fullname' => preg_replace('/\s+/', ' ', trim($patientRow->fullname ?? '')),
                'Image_PT' => !empty($patientRow->Image_PT) ? 'data:image/jpeg;base64,' . base64_encode($patientRow->Image_PT) : null,
                'STS' => $patientRow->STS ?? '',
                'OP_ALLERGIC' => $patientRow->OP_ALLERGIC ?? '',
                'op_birth' => $patientRow->op_birth ?? null,
                'op_sex' => $patientRow->op_sex ?? '',
                'formatted_age' => $this->calculateAgeWithMonths($patientRow->op_birth ?? null),
            ];
        }



        // 2. Fetch treatment visit history without duplicate Image_PT binary blob
        $query = "SELECT b.vt_id as VT_ID, b.vt_id, b.VT_NO, b.op_hn, b.pb_now as pb_now1, b.op_vt_date_time, 
                         b.OP_CHIEF, b.OP_DIAG, b.OP_DETAIL, b.OP_SEND_DR, b.OP_SEND_DR_Name,
                         b.OP_BT, b.OP_WEIGHT, b.OP_HIGHT, b.OP_HR, b.OP_BP_UP, b.OP_BP_DW,
                         b.OP_RR, b.OP_R, b.OP_O2SAT,
                         a.OP_ALLERGIC, a.OP_ALLERGIC_STS as STS,
                         LTRIM(RTRIM(ISNULL(a.pb_pfx_id,'') + ' ' + ISNULL(a.op_name,'') + ' ' + ISNULL(a.op_sname,''))) as fullname
                  FROM opt_visit b
                  JOIN opm_pt a ON a.op_hn = b.op_hn
                  WHERE b.op_hn = :hn
                  ORDER BY b.vt_id DESC";

        $rawVisits = DB::select($query, ['hn' => $hn]);

        $visits = array_map(function ($row) {
            $data = (array) $row;
            if (!empty($data['fullname'])) {
                $data['fullname'] = preg_replace('/\s+/', ' ', trim($data['fullname']));
            }

            $data['formatted_age'] = $this->calculateAgeWithMonths($data['OP_BIRTH'] ?? ($data['op_birth'] ?? null), $data['op_age'] ?? ($data['OP_AGE'] ?? null));

            if (!empty($data['pb_now1'])) {
                $data['formatted_date'] = $this->formatToGregorian($data['pb_now1']);
            } else {
                $data['formatted_date'] = '';
            }

            return $data;
        }, $rawVisits);

        if ($patient && !empty($visits[0]['formatted_date'])) {
            $patient['formatted_date'] = $visits[0]['formatted_date'];
        }

        return Inertia::render('PatientHistory', [
            'patient' => $patient,
            'visits' => $visits,
            'hn' => $hn,
        ]);
    }

    /**
     * Update patient medical information (OP_CHIEF, OP_DIAG).
     */
    public function updateMedicalInfo(Request $request, string $hn)
    {
        $request->validate([
            'vt_no' => 'nullable|string',
            'op_chief' => 'nullable|string',
            'op_diag' => 'nullable|string',
            'op_proc' => 'nullable|string',
            'op_track_sts' => 'nullable|string|in:D,W',
            'op_bt' => 'nullable|string',
            'op_weight' => 'nullable|string',
            'op_hight' => 'nullable|string',
            'op_hr' => 'nullable|string',
            'op_bp_up' => 'nullable|string',
            'op_bp_dw' => 'nullable|string',
            'op_rr' => 'nullable|string',
            'op_o2sat' => 'nullable|string',
        ]);

        $vtNo = $request->input('vt_no');
        if (!empty($vtNo) && preg_match('/^\d+/', (string)$vtNo, $m)) {
            $vtNo = $m[0];
        } else if (!is_numeric($vtNo)) {
            $vtNo = null;
        }

        if (!$this->canAccessPatient($hn, $vtNo)) {
            return redirect()->back()->with('error', 'ไม่มีสิทธิ์แก้ไขข้อมูลผู้ป่วยรายนี้');
        }

        $chief = $request->input('op_chief');
        $diag = $request->input('op_diag');
        $proc = $request->input('op_proc');
        $trackSts = $request->input('op_track_sts');

        $sets = [];
        $bindings = ['hn' => $hn];

        if ($request->has('op_chief')) {
            $sets[] = 'OP_CHIEF = :chief';
            $bindings['chief'] = $chief !== null ? trim($chief) : '';
        }

        if ($request->has('op_diag')) {
            $sets[] = 'OP_DIAG = :diag';
            $bindings['diag'] = $diag !== null ? trim($diag) : '';
        }

        if ($request->has('op_proc')) {
            $sets[] = 'OP_PROC = :proc';
            $bindings['proc'] = $proc !== null ? trim($proc) : '';
        }

        if ($request->has('op_track_sts')) {
            $sets[] = 'OP_Track_STS = :track_sts';
            $bindings['track_sts'] = ($trackSts === 'W') ? 'W' : 'D';
        }

        if ($request->has('op_bt')) {
            $sets[] = 'OP_BT = :bt';
            $bindings['bt'] = $request->input('op_bt') !== null ? trim((string)$request->input('op_bt')) : '';
        }

        if ($request->has('op_weight')) {
            $sets[] = 'OP_WEIGHT = :weight';
            $bindings['weight'] = $request->input('op_weight') !== null ? trim((string)$request->input('op_weight')) : '';
        }

        if ($request->has('op_hight')) {
            $sets[] = 'OP_HIGHT = :hight';
            $bindings['hight'] = $request->input('op_hight') !== null ? trim((string)$request->input('op_hight')) : '';
        }

        if ($request->has('op_hr')) {
            $sets[] = 'OP_HR = :hr';
            $bindings['hr'] = $request->input('op_hr') !== null ? trim((string)$request->input('op_hr')) : '';
        }

        if ($request->has('op_bp_up')) {
            $sets[] = 'OP_BP_UP = :bp_up';
            $bindings['bp_up'] = $request->input('op_bp_up') !== null ? trim((string)$request->input('op_bp_up')) : '';
        }

        if ($request->has('op_bp_dw')) {
            $sets[] = 'OP_BP_DW = :bp_dw';
            $bindings['bp_dw'] = $request->input('op_bp_dw') !== null ? trim((string)$request->input('op_bp_dw')) : '';
        }

        if ($request->has('op_rr')) {
            $sets[] = 'OP_RR = :rr';
            $sets[] = 'OP_R = :r';
            $rrVal = $request->input('op_rr') !== null ? trim((string)$request->input('op_rr')) : '';
            $bindings['rr'] = $rrVal;
            $bindings['r'] = $rrVal;
        }

        if ($request->has('op_o2sat')) {
            $sets[] = 'OP_O2SAT = :o2sat';
            $bindings['o2sat'] = $request->input('op_o2sat') !== null ? trim((string)$request->input('op_o2sat')) : '';
        }

        if ($request->exists('op_ref_doc')) {
            $sets[] = 'OP_Ref_Doc = :op_ref_doc';
            $refDocVal = trim((string)($request->input('op_ref_doc') ?? ''));
            $bindings['op_ref_doc'] = $refDocVal;
        } elseif ($request->exists('ref_doc')) {
            $sets[] = 'OP_Ref_Doc = :op_ref_doc';
            $refDocVal = trim((string)($request->input('ref_doc') ?? ''));
            $bindings['op_ref_doc'] = $refDocVal;
        }

        if (!empty($sets)) {
            $sql = "UPDATE opt_visit SET " . implode(', ', $sets) . " WHERE OP_HN = :hn";
            if ($vtNo !== null) {
                $sql .= " AND VT_NO = :vt";
                $bindings['vt'] = $vtNo;
            }
            $this->applyDoctorUpdateScope($sql, $bindings);
            DB::statement($sql, $bindings);
        }

        return redirect()->back()->with('success', 'บันทึกข้อมูลเรียบร้อยแล้ว');
    }

    /**
     * Upload patient image (OPM_Image).
     */
    public function uploadPatientImage(Request $request, string $hn)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,jpg,png,webp,gif|max:10240', // max 10MB
        ]);

        if (!$this->canAccessPatient($hn)) {
            return redirect()->back()->with('error', 'ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ป่วยรายนี้');
        }

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $contents = file_get_contents($file->getRealPath());

            // Check if record exists in OPM_Image
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

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'อัปโหลดรูปภาพผู้ป่วยเรียบร้อยแล้ว',
            ]);
        }

        return redirect()->back()->with('success', 'อัปโหลดรูปภาพผู้ป่วยเรียบร้อยแล้ว');
    }
}
