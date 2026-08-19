<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\DoctorScopeTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    use DoctorScopeTrait;

    /**
     * Display the OPD patient dashboard.
     */
    public function index(Request $request): Response
    {
        $today = now()->timezone('Asia/Bangkok')->format('Y-m-d');

        if ($request->has('date')) {
            $rawDate = $request->query('date');
            $request->session()->put('dashboard_date', $rawDate);
        } else {
            $rawDate = $request->session()->get('dashboard_date', $today);
        }

        $query = "Select b.op_hn , a.*, ISNULL(a.pb_pfx_id,'')+'  '+ISNULL(a.op_name,'')+'  '+ISNULL(a.op_sname,'') as fullname , b.* , b.pb_now as pb_now1 , a.OP_ALLERGIC_STS as STS , b.OP_Xray_Result  , 
        (Select TOP 1 Image_PT From OPM_Image Where OP_HN = b.OP_HN) as Image_PT  
        From opm_pt a , opt_visit b  
        Where a.op_hn <> '' and a.op_hn = b.op_hn and b.op_send_sts = '1'";

        $bindings = [];
        if ($rawDate !== 'all') {
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawDate)) {
                $query .= " and Convert(Varchar(10),b.op_vt_date_time,120) = :date";
                $bindings['date'] = $rawDate;
                $formattedSelectedDate = $rawDate;
                $displayDate = date('d/m/Y', strtotime($rawDate));
            } else {
                $query .= " and Convert(Varchar(10),b.op_vt_date_time,101) = :date";
                $bindings['date'] = $rawDate;
                $ts = strtotime($rawDate);
                $formattedSelectedDate = $ts ? date('Y-m-d', $ts) : $today;
                $displayDate = $ts ? date('d/m/Y', $ts) : $rawDate;
            }
        } else {
            $formattedSelectedDate = 'all';
            $displayDate = 'ทั้งหมด';
        }

        $this->applyDoctorScope($query, $bindings);

        $query .= " Order By b.vt_id DESC";

        $rawVisits = DB::select($query, $bindings);

        $patients = array_map(function ($row) {
            $data = (array) $row;

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

            return $data;
        }, $rawVisits);

        $totalVisits = count($patients);
        $allergicCount = count(array_filter($patients, function ($p) {
            return (!empty($p['STS']) && strtoupper($p['STS']) === 'Y') || !empty($p['OP_ALLERGIC']);
        }));

        return Inertia::render('Dashboard', [
            'patients' => $patients,
            'selectedDate' => $formattedSelectedDate,
            'displayDate' => $displayDate,
            'stats' => [
                'total' => $totalVisits,
                'allergic' => $allergicCount,
            ],
        ]);
    }

    /**
     * Get latest new patient referrals for notification bell.
     */
    public function getNewPatientNotifications(Request $request)
    {
        $today = date('Y-m-d');

        $query = "Select TOP 10 b.vt_id, b.VT_NO, b.op_hn, b.op_vt_date_time, b.pb_now as pb_now1, 
                         b.OP_CHIEF, b.OP_DIAG, b.OP_SEND_DR_Name, a.OP_ALLERGIC_STS as STS, a.OP_ALLERGIC,
                         LTRIM(RTRIM(ISNULL(a.pb_pfx_id,'')+' '+ISNULL(a.op_name,'')+' '+ISNULL(a.op_sname,''))) as fullname,
                         (Select TOP 1 Image_PT From OPM_Image Where OP_HN = b.OP_HN) as Image_PT
                  From opm_pt a, opt_visit b
                  Where a.op_hn <> '' and a.op_hn = b.op_hn and b.op_send_sts = '1' and b.OP_Track_STS = 'D'
                    and Convert(Varchar(10), b.op_vt_date_time, 120) = :date";

        $bindings = ['date' => $today];
        $this->applyDoctorScope($query, $bindings);
        $query .= " Order By b.vt_id DESC";

        $rows = DB::select($query, $bindings);

        $patients = array_map(function ($row) {
            $data = (array) $row;
            $data['fullname'] = preg_replace('/\s+/', ' ', trim($data['fullname'] ?? ''));

            if (!empty($data['Image_PT'])) {
                $data['Image_PT'] = 'data:image/jpeg;base64,' . base64_encode($data['Image_PT']);
            } else {
                $data['Image_PT'] = null;
            }

            if (!empty($data['pb_now1'])) {
                $data['formatted_date'] = $this->formatToGregorian($data['pb_now1']);
            } else {
                $data['formatted_date'] = '';
            }

            return $data;
        }, $rows);

        return response()->json([
            'count' => count($patients),
            'patients' => $patients,
            'today' => date('d/m/Y'),
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
