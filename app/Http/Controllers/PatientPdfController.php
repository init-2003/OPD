<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\DoctorScopeTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Mpdf\Mpdf;

class PatientPdfController extends Controller
{
    use DoctorScopeTrait;

    /**
     * Download or view original XRAY_Form.pdf populated with patient findings.
     * Supports multi-page forms (1 Form per PDF Page).
     */
    public function downloadUltrasoundPdf(Request $request, string $hn)
    {
        $vtNo = $request->query('vt');
        if (!empty($vtNo) && preg_match('/^\d+/', (string)$vtNo, $m)) {
            $vtNo = $m[0];
        } else if (!is_numeric($vtNo)) {
            $vtNo = null;
        }

        $query = "Select b.op_hn , a.*, ISNULL(a.pb_pfx_id,'')+'  '+ISNULL(a.op_name,'')+'  '+ISNULL(a.op_sname,'') as fullname , b.* , b.pb_now as pb_now1 , a.OP_ALLERGIC_STS as STS , b.OP_Xray_Result  
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
            $fallbackQuery = "Select b.op_hn , a.*, ISNULL(a.pb_pfx_id,'')+'  '+ISNULL(a.op_name,'')+'  '+ISNULL(a.op_sname,'') as fullname , b.* , b.pb_now as pb_now1 , a.OP_ALLERGIC_STS as STS , b.OP_Xray_Result  
            From opm_pt a , opt_visit b  
            Where a.op_hn = :hn and a.op_hn = b.op_hn";
            $fallbackBindings = ['hn' => $hn];
            $this->applyDoctorScope($fallbackQuery, $fallbackBindings);
            $fallbackQuery .= " Order By b.vt_id DESC";
            $rawVisits = DB::select($fallbackQuery, $fallbackBindings);
        }

        $patient = !empty($rawVisits) ? (array) $rawVisits[0] : null;

        $rawFindings = $patient['OP_Xray_Result'] ?? '';

        // Parse multiple form pages
        $pages = [];
        if (!empty($rawFindings)) {
            $decoded = json_decode($rawFindings, true);
            if (is_array($decoded) && count($decoded) > 0) {
                $pages = $decoded;
            } else if (str_contains($rawFindings, '<!-- PAGE_BREAK -->')) {
                $pages = explode('<!-- PAGE_BREAK -->', $rawFindings);
            } else {
                $pages = [$rawFindings];
            }
        }

        // Filter out empty pages so no blank form sheet is ever generated
        $validPages = [];
        foreach ($pages as $p) {
            $pStr = trim((string)$p);
            $plain = trim(strip_tags(html_entity_decode($pStr, ENT_QUOTES, 'UTF-8')));
            if ($plain !== '' || preg_match('/<img\b/i', $pStr)) {
                $validPages[] = $pStr;
            }
        }
        $pages = !empty($validPages) ? $validPages : ['ยังไม่มีบันทึกผลการตรวจ'];

        $defaultConfig = (new \Mpdf\Config\ConfigVariables())->getDefaults();
        $fontDirs = $defaultConfig['fontDir'];

        $defaultFontConfig = (new \Mpdf\Config\FontVariables())->getDefaults();
        $fontData = $defaultFontConfig['fontdata'];

        // Continuous-flow layout: the form PNG is used as a full-page watermark
        // repeated on every page, while the findings text flows automatically
        // inside the template's findings area (margins match the form grid).
        // Margins in mm: top 65mm (≈183.75pt, just below the findings top line),
        // bottom 26.5mm (Report By zone), left 10mm / right 8.4mm (form borders).
        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'autoScriptToLang' => false,
            'autoLangToFont' => false,
            'fontDir' => array_merge($fontDirs, [
                'C:/Windows/Fonts',
                'C:/WINDOWS/Fonts',
                storage_path('fonts'),
            ]),
            'fontdata' => $fontData + [
                'angsana' => [
                    'R' => 'angsana.ttc',
                    'B' => 'angsana.ttc',
                    'I' => 'angsana.ttc',
                    'BI' => 'angsana.ttc',
                    'TTCfontID' => [
                        'R' => 1,
                        'B' => 2,
                        'I' => 3,
                        'BI' => 4,
                    ],
                    'useOTL' => 0xFF,
                ],
                'angsananew' => [
                    'R' => 'angsana.ttc',
                    'B' => 'angsana.ttc',
                    'I' => 'angsana.ttc',
                    'BI' => 'angsana.ttc',
                    'TTCfontID' => [
                        'R' => 1,
                        'B' => 2,
                        'I' => 3,
                        'BI' => 4,
                    ],
                    'useOTL' => 0xFF,
                ],
            ],
            'default_font' => 'angsananew',
            'margin_left' => 10.0,
            'margin_right' => 8.4,
            'margin_top' => 70.3,
            'margin_bottom' => 26.5,
            'watermarkImgBehind' => true,
        ]);

        $watermarkPng = public_path('XRAY_Form.png');
        if (file_exists($watermarkPng)) {
            $mpdf->SetWatermarkImage($watermarkPng, 1, [210, 297], [0, 0]);
            $mpdf->showWatermarkImage = true;
        }

        $currentDate = date('d/m/Y');
        $opHn = $patient['op_hn'] ?? $patient['OP_HN'] ?? $hn;
        $fullname = preg_replace('/\s+/u', ' ', trim((string) ($patient['fullname'] ?? '')));
        if ($fullname === '' || $fullname === '-') {
            $pfx = $patient['pb_pfx_id'] ?? $patient['PB_PFX_ID'] ?? '';
            $fname = $patient['op_name'] ?? $patient['OP_NAME'] ?? '';
            $lname = $patient['op_sname'] ?? $patient['OP_SNAME'] ?? '';
            $fullname = trim("{$pfx} {$fname} {$lname}");
        }
        $fullname = $fullname !== '' ? $fullname : '-';

        $rawSex = $patient['OP_SEX'] ?? $patient['op_sex'] ?? '-';
        $sexUpper = strtoupper(trim((string) $rawSex));
        if ($sexUpper === 'M' || $sexUpper === 'ชาย' || $sexUpper === 'MALE' || $sexUpper === '1') {
            $sex = 'Male';
        } elseif ($sexUpper === 'F' || $sexUpper === 'หญิง' || $sexUpper === 'FEMALE' || $sexUpper === '2') {
            $sex = 'Female';
        } else {
            $sex = $rawSex !== '' ? $rawSex : '-';
        }

        $refDoc = $patient['OP_SEND_DR_Name'] ?? $patient['OP_SEND_DR'] ?? $patient['OP_DR_NAME'] ?? '-';
        $refDoc = trim((string) $refDoc);
        if ($refDoc === '') {
            $refDoc = '-';
        }

        $reportBy = $patient['Report_By'] ?? '';
        $reportBy = trim((string) $reportBy);
        if ($reportBy === '' || $reportBy === '-') {
            if (Auth::check()) {
                $user = Auth::user();
                $reportBy = $user->Report_By ?? $user->fullname ?? $user->name ?? '-';
            } else {
                $reportBy = '-';
            }
        }

        // Compute age in Year & Month from OP_BIRTH date (e.g. 85 Year 4 Month)
        $age = '-';
        $birthRaw = trim((string) ($patient['OP_BIRTH'] ?? ''));
        if ($birthRaw !== '') {
            $birthDate = null;
            if (preg_match('#^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$#', $birthRaw, $m)) {
                $day = (int) $m[1];
                $month = (int) $m[2];
                $year = (int) $m[3];
                if ($year > 2300) {
                    $year -= 543;
                }
                if ($year > 1900 && checkdate($month, $day, $year)) {
                    $birthDate = \DateTime::createFromFormat('Y-m-d', sprintf('%04d-%02d-%02d', $year, $month, $day));
                }
            } elseif (preg_match('#^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$#', $birthRaw, $m)) {
                $year = (int) $m[1];
                $month = (int) $m[2];
                $day = (int) $m[3];
                if ($year > 2300) {
                    $year -= 543;
                }
                if ($year > 1900 && checkdate($month, $day, $year)) {
                    $birthDate = \DateTime::createFromFormat('Y-m-d', sprintf('%04d-%02d-%02d', $year, $month, $day));
                }
            }

            if ($birthDate instanceof \DateTime) {
                $now = new \DateTime();
                if ($now >= $birthDate) {
                    $diff = $now->diff($birthDate);
                    $parts = [];
                    if ($diff->y > 0) {
                        $parts[] = $diff->y . ' Year';
                    }
                    if ($diff->m > 0) {
                        $parts[] = $diff->m . ' Month';
                    }
                    if (empty($parts)) {
                        if ($diff->d > 0) {
                            $parts[] = $diff->d . ' Day';
                        } else {
                            $parts[] = '0 Day';
                        }
                    }
                    $age = implode(' ', $parts);
                }
            }
        }

        if ($age === '-' && !empty($patient['op_age'])) {
            $age = $patient['op_age'] . ' Year';
        }

        // Auto-generate Report On timestamp when printing PDF
        if (!empty($patient['pb_now1'])) {
            $reportOnBase = $this->formatToGregorian($patient['pb_now1']);
        } else {
            $reportOnBase = date('d/m/Y h:i:s A');
        }

        $reportOn = $reportOnBase;

        // Build the findings body. Each saved page (one element of the JSON
        // array) is chunked so every PDF page holds exactly as many lines as
        // fit the middle findings area of the form (16pt, line height 24.64pt,
        // usable height 583pt -> 23 lines max per page), keeping 1 page of
        // findings per 1 PDF page. Rich HTML blocks stay intact; only pure
        // text is split across pages.
        $findingsTextWidth = 540.0;   // pt: A4 width 595.28 - margins (10mm + 8.4mm)
        $maxFindingsLines = 23; // 23 lines per page (fits with margin_top 73.7mm and margin_bottom 20.0mm)

        $mpdf->SetFont('angsananew', '', 16);

        $preserveSpacesText = function (string $text): string {
            $text = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
            $text = str_replace("\t", '&nbsp;&nbsp;&nbsp;&nbsp;', $text);
            $text = preg_replace_callback('/ {2,}/', function ($sm) {
                return str_repeat('&nbsp;', strlen($sm[0]));
            }, $text);
            $text = preg_replace('/^ /', '&nbsp;', $text);
            return $text;
        };

        $preserveSpacesHtml = function (string $html): string {
            $html = str_replace("\t", '&nbsp;&nbsp;&nbsp;&nbsp;', $html);
            $html = preg_replace_callback('/>([^<]+)</u', function ($m) {
                $text = $m[1];
                $text = preg_replace_callback('/ {2,}/', function ($sm) {
                    return str_repeat('&nbsp;', strlen($sm[0]));
                }, $text);
                $text = preg_replace('/^ /', '&nbsp;', $text);
                return '>' . $text . '<';
            }, $html);
            return $html;
        };

        $wrapLines = function (string $text) use ($mpdf, $findingsTextWidth): array {
            $text = html_entity_decode(rtrim($text, "\r\n"), ENT_QUOTES, 'UTF-8');
            if ($text === '') {
                return [];
            }
            $lines = [];
            foreach (preg_split('/\r\n|\r|\n/', $text) as $segment) {
                if ($segment === '') {
                    continue;
                }
                $chars = preg_split('//u', $segment, -1, PREG_SPLIT_NO_EMPTY);
                $n = count($chars);
                $start = 0;
                $lastBreak = -1;
                for ($i = 0; $i < $n; $i++) {
                    $ord = mb_ord($chars[$i]);
                    $isThai = $ord >= 0x0E01 && $ord <= 0x0E5B;
                    $isSpace = $chars[$i] === ' ' || $chars[$i] === "\u{00A0}";
                    if ($mpdf->GetStringWidth(implode('', array_slice($chars, $start, $i - $start + 1))) > $findingsTextWidth) {
                        $breakAt = ($lastBreak > $start) ? $lastBreak : $i;
                        $lines[] = implode('', array_slice($chars, $start, $breakAt - $start + 1));
                        $start = $breakAt + 1;
                        $lastBreak = -1;
                    }
                    if ($isSpace || $isThai) {
                        $lastBreak = $i;
                    }
                }
                if ($start < $n) {
                    $lines[] = implode('', array_slice($chars, $start));
                }
            }
            return $lines;
        };

        $findingsParts = [];
        $chunkIndex = 0;

        foreach ($pages as $pageContent) {
            $pageContent = trim((string) $pageContent);
            if ($pageContent === '') {
                continue;
            }

            // Split HTML into blocks at block-element boundaries, keeping tags intact.
            $blocks = [];
            $curHtml = '';
            $curText = '';
            $flushBlock = function () use (&$blocks, &$curHtml, &$curText, $wrapLines) {
                if ($curHtml === '') {
                    return;
                }
                $text = rtrim(html_entity_decode($curText, ENT_QUOTES, 'UTF-8'), "\r\n");
                $cleanHtml = $curHtml;
                if (preg_match('/^<p[^>]*>\s*(?:<br\s*\/?>)?\s*<\/p>$/i', trim($cleanHtml))) {
                    $cleanHtml = '<p>&nbsp;</p>';
                }
                $blocks[] = [
                    'html' => $cleanHtml,
                    'text' => $text,
                    'lines' => trim($text) === '' ? 1 : max(1, count($wrapLines($text))),
                ];
                $curHtml = '';
                $curText = '';
            };
            foreach (preg_split('/(<[^>]+>)/', $pageContent, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) as $tok) {
                if (preg_match('/^<\/?(?:p|div|li|tr|ul|ol|h[1-6]|blockquote|section|table)\b/i', $tok)) {
                    $curHtml .= $tok;
                    $curText .= ' ';
                    if (preg_match('/^<\/(?:p|div|li|tr|h[1-6]|blockquote|table)\b/i', $tok)) {
                        $flushBlock();
                    }
                } else if (preg_match('/^<br\b/i', $tok)) {
                    $curHtml .= '<br/>';
                    $curText .= "\n";
                } else {
                    $curHtml .= $tok;
                    $curText .= $tok;
                }
            }
            $flushBlock();

            if (empty($blocks)) {
                $blocks = [['html' => $pageContent, 'text' => strip_tags($pageContent), 'lines' => 1]];
            }

            // Pure-text blocks expand into single-line blocks (splittable);
            // rich HTML blocks stay intact (cannot be split safely).
            $expanded = [];
            foreach ($blocks as $b) {
                if (!preg_match('/</', $b['html'])) {
                    foreach ($wrapLines($b['text']) as $line) {
                        $expanded[] = ['html' => '', 'text' => $line, 'lines' => 1];
                    }
                } else {
                    $expanded[] = $b;
                }
            }

            // Group blocks into chunks of max $maxFindingsLines lines.
            $chunks = [];
            $chunkBlocks = [];
            $chunkLines = 0;
            $flushChunk = function () use (&$chunks, &$chunkBlocks, &$chunkLines) {
                if (!empty($chunkBlocks)) {
                    $chunks[] = $chunkBlocks;
                    $chunkBlocks = [];
                    $chunkLines = 0;
                }
            };
            foreach ($expanded as $b) {
                if ($b['lines'] > $maxFindingsLines) {
                    $flushChunk();
                    foreach (array_chunk($wrapLines(strip_tags($b['html'])), $maxFindingsLines) as $part) {
                        $chunks[] = array_map(function ($ln) {
                            return ['html' => '', 'text' => $ln, 'lines' => 1];
                        }, $part);
                    }
                    continue;
                }
                if ($chunkLines + $b['lines'] > $maxFindingsLines) {
                    $flushChunk();
                }
                $chunkBlocks[] = $b;
                $chunkLines += $b['lines'];
            }
            $flushChunk();

            foreach ($chunks as $chunk) {
                $body = '';
                $prevPlain = false;
                foreach ($chunk as $b) {
                    if ($b['html'] === '') {
                        $body .= ($prevPlain ? '<br/>' : '') . $preserveSpacesText($b['text']);
                        $prevPlain = true;
                    } else {
                        $bHtml = $b['html'];
                        if (preg_match('/^<p[^>]*>\s*(?:<br\s*\/?>)?\s*<\/p>$/i', trim($bHtml))) {
                            $bHtml = '<p>&nbsp;</p>';
                        }
                        $body .= $preserveSpacesHtml($bHtml);
                        $prevPlain = false;
                    }
                }
                if ($chunkIndex > 0) {
                    $findingsBody = '<div style="page-break-before:always;margin:0;padding:0;width:100%;">' . $body . '</div>';
                } else {
                    $findingsBody = '<div style="margin:0;padding:0;width:100%;">' . $body . '</div>';
                }
                $findingsParts[] = $findingsBody;
                $chunkIndex++;
            }
        }
        $findingsHtml = implode("\n", $findingsParts);
        if ($findingsHtml === '') {
            $findingsHtml = '<p>ยังไม่มีบันทึกผลการตรวจ</p>';
        }

        // Page header/footer: mPDF repeats these on every page. Inline styles
        // only (mPDF does not handle <style> blocks in header/footer HTML).
        // Coordinates are template pt measured from the top-left of the page.
        $headerHtml = ''
            . "<div style='position:absolute;left:57.9pt;top:117pt;font-size:16pt;color:#000;'>{$opHn}</div>"
            . "<div style='position:absolute;left:74.25pt;top:139.5pt;font-size:16pt;color:#000;'>{$fullname}</div>"
            . "<div style='position:absolute;left:399pt;top:136.5pt;font-size:16pt;color:#000;'>{$age}</div>"
            . "<div style='position:absolute;left:525pt;top:136.5pt;font-size:16pt;color:#000;'>{$sex}</div>"
            . "<div style='position:absolute;left:78pt;top:159pt;font-size:16pt;color:#000;'>{$refDoc}</div>"
            . "<div style='position:absolute;left:429.75pt;top:159pt;font-size:16pt;color:#000;'>{$reportOn}</div>";

        $footerHtml = ''
            . "<div style='position:absolute;left:90pt;top:775.5pt;font-size:18pt;font-weight:bold;color:#000;'>{$reportBy}</div>"
            . "<div style='position:absolute;left:479.25pt;top:775.5pt;font-size:16pt;color:#000;'>{$currentDate}</div>";

        $mpdf->SetHTMLHeader($headerHtml);
        $mpdf->SetHTMLFooter($footerHtml);

        // The watermark PNG is drawn at template scale (pt); the body flows
        // inside the form's findings area (margins match the form grid).
        $html = "
        <style>
            * { font-family: angsananew, angsana, 'Angsana New', sans-serif !important; }
            body { font-family: angsananew, angsana, 'Angsana New', sans-serif !important; font-size: 16pt; color: #000 !important; font-weight: normal; }
            p { margin: 0; padding: 0; line-height: 24.64pt; min-height: 24.64pt; }
        </style>
        <div>
            {$findingsHtml}
        </div>
        ";

        $mpdf->WriteHTML($html);

        return response($mpdf->Output('', 'S'))
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="XRAY_Form_' . $opHn . '.pdf"');
    }

    /**
     * Download or view Ultrasound scan image embedded inside original XRAY_Form.pdf.
     */
    public function downloadUltrasoundImagePdf(Request $request, string $hn)
    {
        $filename = basename((string)$request->query('filename', ''));
        $vtNo = $request->query('vt');
        if (!empty($vtNo) && preg_match('/^\d+/', (string)$vtNo, $m)) {
            $vtNo = $m[0];
        } else if (!is_numeric($vtNo)) {
            $vtNo = null;
        }

        $query = "Select b.op_hn , a.*, ISNULL(a.pb_pfx_id,'')+'  '+ISNULL(a.op_name,'')+'  '+ISNULL(a.op_sname,'') as fullname , b.* , b.pb_now as pb_now1 , a.OP_ALLERGIC_STS as STS
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
            $fallbackQuery = "Select b.op_hn , a.*, ISNULL(a.pb_pfx_id,'')+'  '+ISNULL(a.op_name,'')+'  '+ISNULL(a.op_sname,'') as fullname , b.* , b.pb_now as pb_now1 , a.OP_ALLERGIC_STS as STS  
            From opm_pt a , opt_visit b  
            Where a.op_hn = :hn and a.op_hn = b.op_hn";
            $fallbackBindings = ['hn' => $hn];
            $this->applyDoctorScope($fallbackQuery, $fallbackBindings);
            $fallbackQuery .= " Order By b.vt_id DESC";
            $rawVisits = DB::select($fallbackQuery, $fallbackBindings);
        }

        $patient = !empty($rawVisits) ? (array) $rawVisits[0] : null;

        $rawFilenames = $request->query('filenames', '');
        $fileList = [];
        if (!empty($rawFilenames)) {
            $fileList = array_filter(array_map('trim', explode(',', (string)$rawFilenames)));
        } else {
            $single = basename((string)$request->query('filename', ''));
            if ($single !== '') {
                $fileList = [$single];
            }
        }

        $filterVtId = $request->query('vt_id');
        if (!is_numeric($filterVtId)) {
            $filterVtId = null;
        }

        $allImages = $this->getXrayImagesData($hn);

        $validImagePaths = [];
        if (!empty($fileList)) {
            foreach ($fileList as $fn) {
                $cleanFn = str_replace('\\', '/', trim($fn));
                $baseFn = basename($cleanFn);
                foreach ($allImages as $img) {
                    if ($img['filename'] === $cleanFn || basename($img['filename']) === $baseFn) {
                        if (file_exists($img['full_path'])) {
                            $validImagePaths[] = $img['full_path'];
                            break;
                        }
                    }
                }
            }
        } else {
            foreach ($allImages as $img) {
                if ($filterVtId !== null && ($img['vt_id'] ?? null) !== (int) $filterVtId) {
                    continue;
                }
                if (file_exists($img['full_path'])) {
                    $validImagePaths[] = $img['full_path'];
                }
            }
        }

        if (empty($validImagePaths)) {
            return response("<h1>ไม่พบไฟล์รูปภาพ X-Ray สำหรับผู้ป่วยรหัส CN: " . htmlspecialchars($hn) . "</h1><p>กรุณาอัปโหลดรูปภาพ X-Ray ในหน้ารายงานก่อนพิมพ์</p>", 404);
        }

        $defaultConfig = (new \Mpdf\Config\ConfigVariables())->getDefaults();
        $fontDirs = $defaultConfig['fontDir'];
        $defaultFontConfig = (new \Mpdf\Config\FontVariables())->getDefaults();
        $fontData = $defaultFontConfig['fontdata'];

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'autoScriptToLang' => false,
            'autoLangToFont' => false,
            'fontDir' => array_merge($fontDirs, [
                'C:/Windows/Fonts',
                'C:/WINDOWS/Fonts',
                storage_path('fonts'),
            ]),
            'fontdata' => $fontData + [
                'angsana' => [
                    'R' => 'angsana.ttc',
                    'B' => 'angsana.ttc',
                    'I' => 'angsana.ttc',
                    'BI' => 'angsana.ttc',
                    'TTCfontID' => ['R' => 1, 'B' => 2, 'I' => 3, 'BI' => 4],
                    'useOTL' => 0xFF,
                ],
                'angsananew' => [
                    'R' => 'angsana.ttc',
                    'B' => 'angsana.ttc',
                    'I' => 'angsana.ttc',
                    'BI' => 'angsana.ttc',
                    'TTCfontID' => ['R' => 1, 'B' => 2, 'I' => 3, 'BI' => 4],
                    'useOTL' => 0xFF,
                ],
            ],
            'default_font' => 'angsananew',
            'margin_left' => 10.0,
            'margin_right' => 8.4,
            'margin_top' => 65.0,
            'margin_bottom' => 26.5,
            'watermarkImgBehind' => true,
        ]);

        $watermarkPng = public_path('XRAY_Form.png');
        if (file_exists($watermarkPng)) {
            $mpdf->SetWatermarkImage($watermarkPng, 1, [210, 297], [0, 0]);
            $mpdf->showWatermarkImage = true;
        }

        $currentDate = date('d/m/Y');
        $opHn = $patient['op_hn'] ?? $patient['OP_HN'] ?? $hn;
        $fullname = preg_replace('/\s+/u', ' ', trim((string) ($patient['fullname'] ?? '')));
        if ($fullname === '' || $fullname === '-') {
            $pfx = $patient['pb_pfx_id'] ?? $patient['PB_PFX_ID'] ?? '';
            $fname = $patient['op_name'] ?? $patient['OP_NAME'] ?? '';
            $lname = $patient['op_sname'] ?? $patient['OP_SNAME'] ?? '';
            $fullname = trim("{$pfx} {$fname} {$lname}");
        }
        $fullname = $fullname !== '' ? $fullname : '-';

        $rawSex = $patient['OP_SEX'] ?? $patient['op_sex'] ?? '-';
        $sexUpper = strtoupper(trim((string) $rawSex));
        if ($sexUpper === 'M' || $sexUpper === 'ชาย' || $sexUpper === 'MALE' || $sexUpper === '1') {
            $sex = 'Male';
        } elseif ($sexUpper === 'F' || $sexUpper === 'หญิง' || $sexUpper === 'FEMALE' || $sexUpper === '2') {
            $sex = 'Female';
        } else {
            $sex = $rawSex !== '' ? $rawSex : '-';
        }

        $refDoc = $patient['OP_SEND_DR_Name'] ?? $patient['OP_SEND_DR'] ?? $patient['OP_DR_NAME'] ?? '-';
        $refDoc = trim((string) $refDoc);
        if ($refDoc === '') {
            $refDoc = '-';
        }

        $reportBy = $patient['Report_By'] ?? '';
        $reportBy = trim((string) $reportBy);
        if ($reportBy === '' || $reportBy === '-') {
            if (Auth::check()) {
                $user = Auth::user();
                $reportBy = $user->Report_By ?? $user->fullname ?? $user->name ?? '-';
            } else {
                $reportBy = '-';
            }
        }

        // Compute age in Year & Month from OP_BIRTH date (e.g. 85 Year 4 Month)
        $age = '-';
        $birthRaw = trim((string) ($patient['OP_BIRTH'] ?? ''));
        if ($birthRaw !== '') {
            $birthDate = null;
            if (preg_match('#^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$#', $birthRaw, $m)) {
                $day = (int) $m[1]; $month = (int) $m[2]; $year = (int) $m[3];
                if ($year > 2300) $year -= 543;
                if ($year > 1900 && checkdate($month, $day, $year)) {
                    $birthDate = \DateTime::createFromFormat('Y-m-d', sprintf('%04d-%02d-%02d', $year, $month, $day));
                }
            } elseif (preg_match('#^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$#', $birthRaw, $m)) {
                $year = (int) $m[1]; $month = (int) $m[2]; $day = (int) $m[3];
                if ($year > 2300) $year -= 543;
                if ($year > 1900 && checkdate($month, $day, $year)) {
                    $birthDate = \DateTime::createFromFormat('Y-m-d', sprintf('%04d-%02d-%02d', $year, $month, $day));
                }
            }

            if ($birthDate instanceof \DateTime) {
                $now = new \DateTime();
                if ($now >= $birthDate) {
                    $diff = $now->diff($birthDate);
                    $parts = [];
                    if ($diff->y > 0) $parts[] = $diff->y . ' Year';
                    if ($diff->m > 0) $parts[] = $diff->m . ' Month';
                    if (empty($parts)) {
                        if ($diff->d > 0) $parts[] = $diff->d . ' Day';
                        else $parts[] = '0 Day';
                    }
                    $age = implode(' ', $parts);
                }
            }
        }

        if ($age === '-' && !empty($patient['op_age'])) {
            $age = $patient['op_age'] . ' Year';
        }

        // Auto-generate Report On timestamp when printing PDF
        if (!empty($patient['pb_now1'])) {
            $reportOnBase = $this->formatToGregorian($patient['pb_now1']);
        } elseif (!empty($patient['pb_now'])) {
            $reportOnBase = $this->formatToGregorian($patient['pb_now']);
        } else {
            $reportOnBase = date('d/m/Y h:i:s A');
        }

        $reportOn = $reportOnBase;

        // Page header/footer: exact same coordinates as text findings PDF
        $headerHtml = ''
            . "<div style='position:absolute;left:57.9pt;top:117pt;font-size:16pt;color:#000;'>{$opHn}</div>"
            . "<div style='position:absolute;left:74.25pt;top:139.5pt;font-size:16pt;color:#000;'>{$fullname}</div>"
            . "<div style='position:absolute;left:399pt;top:136.5pt;font-size:16pt;color:#000;'>{$age}</div>"
            . "<div style='position:absolute;left:525pt;top:136.5pt;font-size:16pt;color:#000;'>{$sex}</div>"
            . "<div style='position:absolute;left:78pt;top:159pt;font-size:16pt;color:#000;'>{$refDoc}</div>"
            . "<div style='position:absolute;left:429.75pt;top:159pt;font-size:16pt;color:#000;'>{$reportOn}</div>";

        $footerHtml = ''
            . "<div style='position:absolute;left:90pt;top:775.5pt;font-size:18pt;font-weight:bold;color:#000;'>{$reportBy}</div>"
            . "<div style='position:absolute;left:479.25pt;top:775.5pt;font-size:16pt;color:#000;'>{$currentDate}</div>";

        $mpdf->SetHTMLHeader($headerHtml);
        $mpdf->SetHTMLFooter($footerHtml);

        // Number of images per page (1, 2, 4, or 6)
        $layout = (int) $request->query('layout', 1);
        if (!in_array($layout, [1, 2, 4, 6], true)) {
            $layout = 1;
        }

        $htmlParts = [];
        $pageCount = (int) ceil(count($validImagePaths) / $layout);
        for ($page = 0; $page < $pageCount; $page++) {
            $pageImages = array_slice($validImagePaths, $page * $layout, $layout);
            if (empty($pageImages)) continue;

            if ($layout === 1) {
                // 1 Image per page: fixed 1x1 slot (200mm height)
                $img = $pageImages[0] ?? null;
                $imgTag = $img ? '<img src="' . $img . '" style="max-width: 185mm; max-height: 195mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';
                $pageHtml = '
                <table style="width: 100%; height: 200mm; border-collapse: collapse; border: none; margin: 0; padding: 0; table-layout: fixed;">
                    <tr>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 200mm; border: none; margin: 0; padding: 0;">
                            ' . $imgTag . '
                        </td>
                    </tr>
                </table>';
            } elseif ($layout === 2) {
                // 2 Images per page: fixed 1 column x 2 rows (each 98mm height)
                $img0 = $pageImages[0] ?? null;
                $img1 = $pageImages[1] ?? null;

                $imgTag0 = $img0 ? '<img src="' . $img0 . '" style="max-width: 185mm; max-height: 94mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';
                $imgTag1 = $img1 ? '<img src="' . $img1 . '" style="max-width: 185mm; max-height: 94mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';

                $pageHtml = '
                <table style="width: 100%; height: 200mm; border-collapse: collapse; border: none; margin: 0; padding: 0; table-layout: fixed;">
                    <tr>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 98mm; border: none; margin: 0; padding: 1mm 0;">
                            ' . $imgTag0 . '
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 98mm; border: none; margin: 0; padding: 1mm 0;">
                            ' . $imgTag1 . '
                        </td>
                    </tr>
                </table>';
            } elseif ($layout === 4) {
                // 4 Images per page: fixed 2 columns x 2 rows grid (each cell 50% width x 98mm height)
                $img0 = $pageImages[0] ?? null;
                $img1 = $pageImages[1] ?? null;
                $img2 = $pageImages[2] ?? null;
                $img3 = $pageImages[3] ?? null;

                $imgTag0 = $img0 ? '<img src="' . $img0 . '" style="max-width: 88mm; max-height: 92mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';
                $imgTag1 = $img1 ? '<img src="' . $img1 . '" style="max-width: 88mm; max-height: 92mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';
                $imgTag2 = $img2 ? '<img src="' . $img2 . '" style="max-width: 88mm; max-height: 92mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';
                $imgTag3 = $img3 ? '<img src="' . $img3 . '" style="max-width: 88mm; max-height: 92mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';

                $pageHtml = '
                <table style="width: 100%; height: 200mm; border-collapse: collapse; border: none; margin: 0; padding: 0; table-layout: fixed;">
                    <tr>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 98mm; width: 50%; border: none; margin: 0; padding: 1.5mm;">
                            ' . $imgTag0 . '
                        </td>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 98mm; width: 50%; border: none; margin: 0; padding: 1.5mm;">
                            ' . $imgTag1 . '
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 98mm; width: 50%; border: none; margin: 0; padding: 1.5mm;">
                            ' . $imgTag2 . '
                        </td>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 98mm; width: 50%; border: none; margin: 0; padding: 1.5mm;">
                            ' . $imgTag3 . '
                        </td>
                    </tr>
                </table>';
            } else {
                // 6 Images per page: fixed 2 columns x 3 rows grid (each cell 50% width x 65mm height)
                $img0 = $pageImages[0] ?? null;
                $img1 = $pageImages[1] ?? null;
                $img2 = $pageImages[2] ?? null;
                $img3 = $pageImages[3] ?? null;
                $img4 = $pageImages[4] ?? null;
                $img5 = $pageImages[5] ?? null;

                $imgTag0 = $img0 ? '<img src="' . $img0 . '" style="max-width: 88mm; max-height: 60mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';
                $imgTag1 = $img1 ? '<img src="' . $img1 . '" style="max-width: 88mm; max-height: 60mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';
                $imgTag2 = $img2 ? '<img src="' . $img2 . '" style="max-width: 88mm; max-height: 60mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';
                $imgTag3 = $img3 ? '<img src="' . $img3 . '" style="max-width: 88mm; max-height: 60mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';
                $imgTag4 = $img4 ? '<img src="' . $img4 . '" style="max-width: 88mm; max-height: 60mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';
                $imgTag5 = $img5 ? '<img src="' . $img5 . '" style="max-width: 88mm; max-height: 60mm; width: auto; height: auto; margin: 0 auto; display: block;" />' : '&nbsp;';

                $pageHtml = '
                <table style="width: 100%; height: 200mm; border-collapse: collapse; border: none; margin: 0; padding: 0; table-layout: fixed;">
                    <tr>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 65mm; width: 50%; border: none; margin: 0; padding: 1mm;">
                            ' . $imgTag0 . '
                        </td>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 65mm; width: 50%; border: none; margin: 0; padding: 1mm;">
                            ' . $imgTag1 . '
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 65mm; width: 50%; border: none; margin: 0; padding: 1mm;">
                            ' . $imgTag2 . '
                        </td>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 65mm; width: 50%; border: none; margin: 0; padding: 1mm;">
                            ' . $imgTag3 . '
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 65mm; width: 50%; border: none; margin: 0; padding: 1mm;">
                            ' . $imgTag4 . '
                        </td>
                        <td align="center" style="text-align: center; vertical-align: middle; height: 65mm; width: 50%; border: none; margin: 0; padding: 1mm;">
                            ' . $imgTag5 . '
                        </td>
                    </tr>
                </table>';
            }

            if ($page > 0) {
                $pageHtml = '<div style="page-break-before: always;">' . $pageHtml . '</div>';
            }
            $htmlParts[] = $pageHtml;
        }

        $mpdf->WriteHTML(implode("\n", $htmlParts));

        return response($mpdf->Output('', 'S'))
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="XRAY_Image_' . $opHn . '.pdf"');
    }
}
