import React, { useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import {
    Thermometer,
    Weight,
    Ruler,
    Activity,
    HeartPulse,
    Wind,
    FileText,
    Stethoscope,
    Loader2,
    Check,
    UserCheck,
} from 'lucide-react';
import { Badge } from '@/Components/ui/badge';
import { PatientVisit } from '@/types';
import { cleanDecimals, formatPatientAge } from '@/lib/utils';

interface PatientVitalsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patient: PatientVisit | null;
    onSuccess?: (updatedData: Partial<PatientVisit>) => void;
}

export default function PatientVitalsModal({
    open,
    onOpenChange,
    patient,
    onSuccess,
}: PatientVitalsModalProps) {
    const { data, setData, post, processing, reset } = useForm({
        vt_no: '',
        op_bt: '',
        op_weight: '',
        op_hight: '',
        op_hr: '',
        op_bp_up: '',
        op_bp_dw: '',
        op_rr: '',
        op_o2sat: '',
        op_chief: '',
        op_diag: '',
    });

    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open && patient) {
            setData({
                vt_no: String(patient.VT_NO || ''),
                op_bt: cleanDecimals(patient.OP_BT),
                op_weight: cleanDecimals(patient.OP_WEIGHT),
                op_hight: cleanDecimals(patient.OP_HIGHT),
                op_hr: cleanDecimals(patient.OP_HR),
                op_bp_up: cleanDecimals(patient.OP_BP_UP),
                op_bp_dw: cleanDecimals(patient.OP_BP_DW),
                op_rr: cleanDecimals(patient.OP_RR || patient.OP_R),
                op_o2sat: cleanDecimals(patient.OP_O2SAT),
                op_chief: patient.OP_CHIEF || '',
                op_diag: patient.OP_DIAG || '',
            });

            setTimeout(() => {
                if (firstInputRef.current) {
                    firstInputRef.current.focus();
                }
            }, 80);
        }
    }, [open, patient]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!patient) return;

        const targetHn = patient.op_hn || (patient as any).OP_HN;
        post(route('patient.medical_info.update', { hn: targetHn }), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                onOpenChange(false);
                onSuccess?.({
                    OP_BT: data.op_bt,
                    OP_WEIGHT: data.op_weight,
                    OP_HIGHT: data.op_hight,
                    OP_HR: data.op_hr,
                    OP_BP_UP: data.op_bp_up,
                    OP_BP_DW: data.op_bp_dw,
                    OP_RR: data.op_rr,
                    OP_R: data.op_rr,
                    OP_O2SAT: data.op_o2sat,
                    OP_CHIEF: data.op_chief,
                    OP_DIAG: data.op_diag,
                });
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 liquid-glass-card shadow-2xl border border-white/80">
                <DialogHeader className="text-left border-b border-slate-200/80 pb-3">
                    <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-2xl bg-[#E8F8F2] border border-[#A7F3D0] flex items-center justify-center text-[#00875A] shrink-0">
                            <FileText className="h-5 w-5" />
                        </div>
                        <span>กรอกและแก้ไขข้อมูลผู้ป่วย (Patient Profile)</span>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-1">
                    {/* ข้อมูลรายละเอียดผู้ป่วย (Patient Profile Header) */}
                    {patient && (
                        <div className="flex items-center gap-3.5 p-3 liquid-glass-box rounded-2xl bg-white/70 border border-slate-200/80 shadow-xs">
                            <div className="border-2 border-slate-900 shadow-sm shrink-0 bg-slate-100 overflow-hidden inline-block w-fit h-fit rounded-none">
                                {patient.Image_PT ? (
                                    <img
                                        src={patient.Image_PT}
                                        alt={patient.fullname}
                                        className="max-h-24 sm:max-h-28 w-auto max-w-[85px] sm:max-w-[100px] block rounded-none object-cover"
                                    />
                                ) : (
                                    <div className="w-18 sm:w-20 h-22 sm:h-24 bg-slate-100 text-slate-900 flex items-center justify-center">
                                        <UserCheck className="h-7 w-7 text-slate-900 stroke-[2]" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1 overflow-hidden">
                                <h4 className="font-bold text-base sm:text-lg truncate text-slate-900 leading-tight">
                                    {patient.fullname || 'ไม่ระบุชื่อ'}
                                </h4>
                                <p className="text-slate-600 font-mono text-xs sm:text-sm">
                                    CN: <span className="font-bold text-sm text-[#00875A]">{patient.op_hn || (patient as any).OP_HN || '-'}</span>
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                    <Badge variant="outline" className="bg-white text-slate-700 text-xs px-2 py-0.5 font-medium border-slate-300">
                                        Visit No: {patient.VT_NO || '-'}
                                    </Badge>
                                    <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                                        {formatPatientAge(patient)} {patient.op_sex ? `/ ${patient.op_sex}` : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ส่วนที่ 1: สัญญาณชีพ (Vital Signs) */}
                    <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-2.5">
                            <Activity className="h-4 w-4 text-[#00875A]" /> สัญญาณชีพ (Vital Signs)
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {/* อุณหภูมิ (BT) */}
                            <div className="space-y-1 p-2 liquid-glass-box rounded-xl">
                                <Label htmlFor="vitals_op_bt" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                    <Thermometer className="h-3.5 w-3.5 text-[#00875A]" /> อุณหภูมิ (°C)
                                </Label>
                                <Input
                                    ref={firstInputRef}
                                    id="vitals_op_bt"
                                    type="text"
                                    value={data.op_bt}
                                    onChange={(e) => setData('op_bt', e.target.value)}
                                    className="h-8 text-sm font-bold text-slate-900 bg-white/80 focus:bg-white focus:border-[#00875A] focus-visible:ring-1 focus-visible:ring-[#00875A]/20 rounded-lg"
                                />
                            </div>

                            {/* น้ำหนัก (BW) */}
                            <div className="space-y-1 p-2 liquid-glass-box rounded-xl">
                                <Label htmlFor="vitals_op_weight" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                    <Weight className="h-3.5 w-3.5 text-[#00875A]" /> น้ำหนัก (Kg)
                                </Label>
                                <Input
                                    id="vitals_op_weight"
                                    type="text"
                                    value={data.op_weight}
                                    onChange={(e) => setData('op_weight', e.target.value)}
                                    className="h-8 text-sm font-bold text-slate-900 bg-white/80 focus:bg-white focus:border-[#00875A] focus-visible:ring-1 focus-visible:ring-[#00875A]/20 rounded-lg"
                                />
                            </div>

                            {/* ส่วนสูง (HT) */}
                            <div className="space-y-1 p-2 liquid-glass-box rounded-xl">
                                <Label htmlFor="vitals_op_hight" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                    <Ruler className="h-3.5 w-3.5 text-[#00875A]" /> ส่วนสูง (cm)
                                </Label>
                                <Input
                                    id="vitals_op_hight"
                                    type="text"
                                    value={data.op_hight}
                                    onChange={(e) => setData('op_hight', e.target.value)}
                                    className="h-8 text-sm font-bold text-slate-900 bg-white/80 focus:bg-white focus:border-[#00875A] focus-visible:ring-1 focus-visible:ring-[#00875A]/20 rounded-lg"
                                />
                            </div>

                            {/* ชีพจร (P) */}
                            <div className="space-y-1 p-2 liquid-glass-box rounded-xl">
                                <Label htmlFor="vitals_op_hr" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                    <Activity className="h-3.5 w-3.5 text-[#00875A]" /> ชีพจร (bpm)
                                </Label>
                                <Input
                                    id="vitals_op_hr"
                                    type="text"
                                    value={data.op_hr}
                                    onChange={(e) => setData('op_hr', e.target.value)}
                                    className="h-8 text-sm font-bold text-slate-900 bg-white/80 focus:bg-white focus:border-[#00875A] focus-visible:ring-1 focus-visible:ring-[#00875A]/20 rounded-lg"
                                />
                            </div>

                            {/* ความดัน (BP) - ความดันบน / ล่าง */}
                            <div className="col-span-2 space-y-1 p-2 liquid-glass-box rounded-xl">
                                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                    <HeartPulse className="h-3.5 w-3.5 text-[#00875A]" /> ความดันโลหิต BP (บน / ล่าง)
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="vitals_op_bp_up"
                                        type="text"
                                        value={data.op_bp_up}
                                        onChange={(e) => setData('op_bp_up', e.target.value)}
                                        className="h-8 text-sm font-bold text-slate-900 bg-white/80 focus:bg-white focus:border-[#00875A] focus-visible:ring-1 focus-visible:ring-[#00875A]/20 rounded-lg"
                                    />
                                    <span className="text-slate-400 font-bold">/</span>
                                    <Input
                                        id="vitals_op_bp_dw"
                                        type="text"
                                        value={data.op_bp_dw}
                                        onChange={(e) => setData('op_bp_dw', e.target.value)}
                                        className="h-8 text-sm font-bold text-slate-900 bg-white/80 focus:bg-white focus:border-[#00875A] focus-visible:ring-1 focus-visible:ring-[#00875A]/20 rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* หายใจ (R) */}
                            <div className="space-y-1 p-2 liquid-glass-box rounded-xl">
                                <Label htmlFor="vitals_op_rr" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                    <Wind className="h-3.5 w-3.5 text-[#00875A]" /> หายใจ (R bpm)
                                </Label>
                                <Input
                                    id="vitals_op_rr"
                                    type="text"
                                    value={data.op_rr}
                                    onChange={(e) => setData('op_rr', e.target.value)}
                                    className="h-8 text-sm font-bold text-slate-900 bg-white/80 focus:bg-white focus:border-[#00875A] focus-visible:ring-1 focus-visible:ring-[#00875A]/20 rounded-lg"
                                />
                            </div>

                            {/* O2 Sat */}
                            <div className="space-y-1 p-2 liquid-glass-box rounded-xl">
                                <Label htmlFor="vitals_op_o2sat" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                    <Activity className="h-3.5 w-3.5 text-[#00875A]" /> O₂ Sat (%)
                                </Label>
                                <Input
                                    id="vitals_op_o2sat"
                                    type="text"
                                    value={data.op_o2sat}
                                    onChange={(e) => setData('op_o2sat', e.target.value)}
                                    className="h-8 text-sm font-bold text-slate-900 bg-white/80 focus:bg-white focus:border-[#00875A] focus-visible:ring-1 focus-visible:ring-[#00875A]/20 rounded-lg"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ส่วนที่ 2: อาการและการวินิจฉัย (Clinical Findings) */}
                    <div className="space-y-3 pt-1 border-t border-slate-200/80">
                        {/* อาการเบื้องต้น (Chief Complaint) */}
                        <div className="space-y-1.5">
                            <Label htmlFor="vitals_op_chief" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-[#00875A]" /> อาการเบื้องต้น (Chief Complaint)
                            </Label>
                            <Textarea
                                id="vitals_op_chief"
                                rows={3}
                                placeholder="กรอกอาการเบื้องต้นของผู้ป่วย..."
                                value={data.op_chief}
                                onChange={(e) => setData('op_chief', e.target.value)}
                                className="liquid-glass-box focus:bg-white focus:border-[#00875A] focus-visible:ring-1 focus-visible:ring-[#00875A]/20 rounded-xl text-sm font-medium transition-all"
                            />
                        </div>

                        {/* ผลการวินิจฉัย (Diagnosis) */}
                        <div className="space-y-1.5">
                            <Label htmlFor="vitals_op_diag" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <Stethoscope className="h-3.5 w-3.5 text-[#00875A]" /> ผลการวินิจฉัย (Diagnosis)
                            </Label>
                            <Textarea
                                id="vitals_op_diag"
                                rows={3}
                                placeholder="กรอกผลการวินิจฉัยโรคของผู้ป่วย..."
                                value={data.op_diag}
                                onChange={(e) => setData('op_diag', e.target.value)}
                                className="liquid-glass-box focus:bg-white focus:border-[#00875A] focus-visible:ring-1 focus-visible:ring-[#00875A]/20 rounded-xl text-sm font-medium transition-all"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-3 border-t border-slate-200/80 flex sm:justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="rounded-full px-5 h-9 text-xs font-semibold cursor-pointer"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="rounded-full px-6 h-9 text-xs font-bold liquid-glass-btn-primary text-white flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                            {processing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                            )}
                            <span>บันทึกข้อมูล</span>
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
