import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Checkbox } from '@/Components/ui/checkbox';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState, useEffect, useRef } from 'react';
import { User, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, X } from 'lucide-react';

export default function Login({
    status,
}: {
    status?: string;
    canResetPassword?: boolean;
}) {
    const [showPassword, setShowPassword] = useState(false);
    const passwordInputRef = useRef<HTMLInputElement>(null);

    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('opd_remember_user') || '' : '';

    const { data, setData, post, processing, errors, reset } = useForm({
        PB_user: savedUser,
        password: '',
        remember: !!savedUser as boolean,
    });

    const [toastMessage, setToastMessage] = useState<{ title: string; desc: string }>({ title: '', desc: '' });
    const [toastVisible, setToastVisible] = useState(false);
    const [toastActive, setToastActive] = useState(false);
    const toastTimerRef = useRef<{ hide?: ReturnType<typeof setTimeout>; unmount?: ReturnType<typeof setTimeout> }>({});

    const showToast = (title: string, desc: string) => {
        if (toastTimerRef.current.hide) clearTimeout(toastTimerRef.current.hide);
        if (toastTimerRef.current.unmount) clearTimeout(toastTimerRef.current.unmount);

        setToastMessage({ title, desc });
        setToastVisible(true);

        requestAnimationFrame(() => {
            setToastActive(true);
        });

        toastTimerRef.current.hide = setTimeout(() => {
            setToastActive(false);
            toastTimerRef.current.unmount = setTimeout(() => {
                setToastVisible(false);
            }, 400);
        }, 3500);
    };

    // Trigger standard bottom-right toast when login error occurs
    useEffect(() => {
        const errorMsg = errors.PB_user || errors.password;
        if (errorMsg) {
            showToast('เข้าสู่ระบบไม่สำเร็จ', errorMsg);
        }
    }, [errors.PB_user, errors.password]);

    // Auto-focus on password field if username is remembered, otherwise focus username
    useEffect(() => {
        if (savedUser && passwordInputRef.current) {
            setTimeout(() => {
                passwordInputRef.current?.focus();
            }, 100);
        }
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('dashboard_date');
            sessionStorage.removeItem('dashboard_search');
            sessionStorage.removeItem('dashboard_status_filter');

            if (data.remember && data.PB_user) {
                localStorage.setItem('opd_remember_user', data.PB_user.trim());
            } else {
                localStorage.removeItem('opd_remember_user');
            }
        }

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="เข้าสู่ระบบ | OPD Referral System" />

            <div className="space-y-6">
                {/* Brand Header & Logo */}
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="flex items-center justify-center">
                        <img src="/LOGO-NON-BG.png" alt="Logo" className="h-24 sm:h-28 w-auto object-contain drop-shadow-md" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        คลินิกกระดูก-ข้อและรังสีวิทยา
                    </h1>
                </div>

                {/* Glassmorphism Light Login Card */}
                <Card className="bg-white/90 backdrop-blur-xl border-slate-200/90 shadow-xl shadow-slate-200/60 rounded-3xl overflow-hidden border">
                    <CardHeader className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 space-y-1">
                        <CardTitle className="text-xl font-bold text-slate-900">
                            เข้าสู่ระบบ
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
                                        className={`pl-10 h-10.5 text-sm bg-slate-50/60 rounded-xl font-medium transition-all ${
                                            errors.PB_user
                                                ? 'border-rose-300 focus:bg-white focus:border-rose-500 focus:ring-rose-500/20'
                                                : 'border-slate-200 focus:bg-white focus:border-[#00875A] focus:ring-[#00875A]/20'
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-xs sm:text-sm font-bold text-slate-700">
                                    รหัสผ่าน
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <Input
                                        ref={passwordInputRef}
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="••••••••"
                                        value={data.password}
                                        autoComplete="current-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        className={`pl-10 pr-10 h-10.5 text-sm bg-slate-50/60 rounded-xl font-medium transition-all ${
                                            errors.password
                                                ? 'border-rose-300 focus:bg-white focus:border-rose-500 focus:ring-rose-500/20'
                                                : 'border-slate-200 focus:bg-white focus:border-[#00875A] focus:ring-[#00875A]/20'
                                        }`}
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
                    <p>© 2026 OPD Referral Management System</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">ระบบจัดการเวชระเบียนและผลการตรวจทางรังสีวิทยา</p>
                </div>
            </div>

            {/* Bottom-Right Sliding 3D Liquid Glass Toast Notification */}
            {toastVisible && (
                <div
                    className={`fixed bottom-7 right-7 z-50 pointer-events-none transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${toastActive
                        ? 'translate-y-0 opacity-100 scale-100'
                        : 'translate-y-12 opacity-0 scale-95'
                        }`}
                >
                    <div className="flex flex-col liquid-glass-toast text-slate-800 px-6 py-3.5 rounded-2xl sm:rounded-3xl shadow-2xl pointer-events-auto min-w-[260px] sm:min-w-[300px]">
                        <span className="text-[15px] sm:text-base font-extrabold text-rose-600 tracking-tight flex items-center gap-1.5">
                            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-600" />
                            {toastMessage.title}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                            {toastMessage.desc}
                        </span>
                    </div>
                </div>
            )}
        </GuestLayout>
    );
}
