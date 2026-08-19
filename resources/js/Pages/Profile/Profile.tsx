import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Badge } from '@/Components/ui/badge';
import {
    ArrowLeft,
    BriefcaseBusiness,
    CheckCircle2,
    IdCard,
    ShieldCheck,
    Stethoscope,
    UserRound,
} from 'lucide-react';
import type { ElementType } from 'react';

type InfoRowProps = {
    icon: ElementType;
    label: string;
    value?: string | number | null;
    mono?: boolean;
};

function InfoRow({
    icon: Icon,
    label,
    value,
    mono = false,
}: InfoRowProps) {
    const hasValue = value !== null && value !== undefined && value !== '';

    return (
        <div className="group flex items-center gap-4 rounded-2xl p-3.5 liquid-glass-box hover:border-[#A7F3D0] transition-all duration-200">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl liquid-glass-box text-[#00875A] transition-colors">
                <Icon className="h-5 w-5" strokeWidth={2} />
            </div>

            <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-xs font-bold text-slate-500">
                    {label}
                </p>

                {hasValue ? (
                    <p
                        className={`truncate text-[15px] font-bold text-slate-900 ${
                            mono ? 'font-mono tracking-wide' : ''
                        }`}
                    >
                        {value}
                    </p>
                ) : (
                    <p className="text-sm italic text-slate-400 font-medium">
                        ไม่ได้ระบุข้อมูล
                    </p>
                )}
            </div>
        </div>
    );
}

export default function Profile() {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const fullName =
        user?.Em_Fullname ||
        user?.name ||
        'ผู้ใช้งาน';

    return (
        <AuthenticatedLayout>
            <Head title="ข้อมูลผู้ใช้งาน" />

            <main className="h-[calc(100vh-64px)] overflow-hidden flex flex-col p-4 sm:p-6 animate-in fade-in duration-300">
                <div className="mx-auto w-full max-w-6xl space-y-5 flex flex-col h-full overflow-hidden">
                    {/* Header Banner */}
                    <section className="relative overflow-hidden liquid-glass-card p-6 sm:p-8 rounded-3xl shrink-0">
                        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#00B377]/15 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-[#00875A]/15 blur-3xl pointer-events-none" />

                        <div className="relative z-10">
                            <Link
                                href={route('dashboard')}
                                className="inline-flex items-center gap-2 rounded-full liquid-glass-btn-outline px-4 py-2 text-xs font-bold transition cursor-pointer"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                กลับหน้าหลัก
                            </Link>

                            <div className="mt-5">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00875A]">
                                    Account overview
                                </p>

                                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                    ข้อมูลผู้ใช้งาน (User Profile)
                                </h1>

                                <p className="mt-1 text-sm font-medium text-slate-600">
                                    ตรวจสอบและจัดการข้อมูลบัญชีและบุคลากรของคุณ
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Content Section */}
                    <section className="flex-1 min-h-0 overflow-hidden">
                        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] h-full overflow-hidden">
                            {/* Profile Summary Card */}
                            <div className="liquid-glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                                <Avatar className="h-28 w-28 border-4 border-white/90 shadow-xl shadow-[#00875A]/20 ring-4 ring-[#A7F3D0]/60">
                                    <AvatarFallback className="bg-gradient-to-tr from-[#00B377] to-[#00875A] text-white flex items-center justify-center">
                                        <Stethoscope className="h-14 w-14 text-white" />
                                    </AvatarFallback>
                                </Avatar>

                                <h2 className="mt-5 max-w-full truncate text-xl font-bold text-slate-900">
                                    {fullName}
                                </h2>

                                <div className="mt-3 flex flex-wrap justify-center gap-2">
                                    <Badge className="rounded-full border border-[#A7F3D0] bg-[#E8F8F2] px-3.5 py-1 text-xs font-bold text-[#007A4D] shadow-2xs">
                                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-[#00875A]" />
                                        Active
                                    </Badge>

                                    {user?.EMP_STS_Name && (
                                        <Badge
                                            variant="outline"
                                            className="rounded-full liquid-glass-box px-3.5 py-1 text-xs font-bold text-slate-700 shadow-none"
                                        >
                                            {user.EMP_STS_Name}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* User Information Grid Card */}
                            <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 flex flex-col min-h-0 overflow-y-auto">
                                <div className="mb-6 border-b border-slate-200/70 pb-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00875A]">
                                        Personal information
                                    </p>

                                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                                        รายละเอียดข้อมูลส่วนบุคคล
                                    </h2>

                                    <p className="mt-1 text-sm font-medium text-slate-500">
                                        ข้อมูลพื้นฐานและสิทธิ์การใช้งานที่เชื่อมโยงกับบัญชีนี้
                                    </p>
                                </div>

                                <div className="grid gap-3.5 sm:grid-cols-2">
                                    <InfoRow
                                        icon={UserRound}
                                        label="ชื่อ – นามสกุล"
                                        value={user?.Em_Fullname}
                                    />

                                    <InfoRow
                                        icon={IdCard}
                                        label="รหัสพนักงาน"
                                        value={user?.Em_id}
                                        mono
                                    />

                                    <InfoRow
                                        icon={BriefcaseBusiness}
                                        label="ตำแหน่งงาน"
                                        value={user?.EMP_STS_Name}
                                    />

                                    <InfoRow
                                        icon={ShieldCheck}
                                        label="เลขที่ใบอนุญาตวิชาชีพ"
                                        value={user?.Em_Cer_No}
                                        mono
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </AuthenticatedLayout>
    );
}