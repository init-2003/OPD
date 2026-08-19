import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Checkbox } from '@/Components/ui/checkbox';
import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { User, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        PB_user: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('dashboard_date');
            sessionStorage.removeItem('dashboard_search');
            sessionStorage.removeItem('dashboard_status_filter');
        }

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="เข้าสู่ระบบ | OPD Referral System" />

            <div className="space-y-6">
                {/* Brand Header & Logo Badge */}
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="h-24 w-24 rounded-2xl bg-white p-2 shadow-xl shadow-slate-200/60 border border-slate-200/80 flex items-center justify-center overflow-hidden">
                        <img src="/LOGO-NON-BG.png" alt="Logo" className="h-full w-full object-contain drop-shadow-xs" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        คลินิกกระดูก-ข้อและรังสีวิทยา
                    </h1>
                </div>

                {/* Glassmorphism Light Login Card */}
                <Card className="bg-white/90 backdrop-blur-xl border-slate-200/90 shadow-xl shadow-slate-200/60 rounded-3xl overflow-hidden border">
                    <CardHeader className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 space-y-1">
                        <CardTitle className="text-xl font-bold text-slate-900 flex items-center justify-between">
                            <span>เข้าสู่ระบบ</span>
                            <Sparkles className="h-5 w-5 text-[#00875A]" />
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-slate-500">
                            กรอกรหัสผู้ใช้งานและรหัสผ่านเพื่อเข้าใช้งานระบบ
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6 sm:p-8 space-y-5">
                        {status && (
                            <div className="p-3.5 rounded-xl bg-[#E8F8F2] border border-[#A7F3D0] text-sm font-semibold text-[#007A4D] flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 shrink-0 text-[#00875A]" />
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-4">
                            {/* Username Field */}
                            <div className="space-y-1.5">
                                <Label htmlFor="PB_user" className="text-xs sm:text-sm font-bold text-slate-700">
                                    รหัสผู้ใช้งาน
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <Input
                                        id="PB_user"
                                        type="text"
                                        name="PB_user"
                                        placeholder="กรอกรหัสผู้ใช้งาน"
                                        value={data.PB_user}
                                        autoComplete="username"
                                        onChange={(e) => setData('PB_user', e.target.value)}
                                        className="pl-10 h-10.5 text-sm bg-slate-50/60 border-slate-200 focus:bg-white focus:border-[#00875A] focus:ring-[#00875A]/20 rounded-xl font-medium transition-all"
                                    />
                                </div>
                                <InputError message={errors.PB_user} />
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-xs sm:text-sm font-bold text-slate-700">
                                    รหัสผ่าน
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="••••••••"
                                        value={data.password}
                                        autoComplete="current-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="pl-10 pr-10 h-10.5 text-sm bg-slate-50/60 border-slate-200 focus:bg-white focus:border-[#00875A] focus:ring-[#00875A]/20 rounded-xl font-medium transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-hidden"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            {/* Remember me & submit */}
                            <div className="flex items-center space-x-2 pt-1">
                                <Checkbox
                                    id="remember"
                                    checked={data.remember}
                                    onCheckedChange={(checked) =>
                                        setData('remember', checked === true)
                                    }
                                    className="border-slate-300 data-[state=checked]:bg-[#00875A] data-[state=checked]:border-[#00875A]"
                                />
                                <Label htmlFor="remember" className="text-xs sm:text-sm font-medium text-slate-600 cursor-pointer">
                                    จำการเข้าสู่ระบบ (Remember me)
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 text-sm sm:text-base font-bold rounded-xl liquid-glass-btn-primary text-white shadow-lg transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 mt-2 cursor-pointer"
                                disabled={processing}
                            >
                                {processing ? (
                                    <span>กำลังเข้าสู่ระบบ...</span>
                                ) : (
                                    <>
                                        <span>เข้าสู่ระบบ</span>
                                        <ArrowRight className="h-4.5 w-4.5" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Footer copyright note */}
                <div className="text-center text-xs text-slate-400 font-medium">
                    <p>© 2026 OPD Referral & X-Ray Management System</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">ระบบจัดการเวชระเบียนและผลการตรวจทางรังสีวิทยา</p>
                </div>
            </div>
        </GuestLayout>
    );
}
