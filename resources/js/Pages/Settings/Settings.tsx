import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Sliders,
    Monitor,
    MonitorOff,
    Bell,
    CheckCircle2,
    AlertCircle,
    Volume2,
    Share2,
    ShieldAlert,
    Download,
    Smartphone,
    AppWindow,
    Tablet,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';

export default function Settings() {
    // Detect OS & Environment
    const isIPad = typeof window !== 'undefined' && (/iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent || navigator.platform);
    const isStandalone = typeof window !== 'undefined' && ((window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches);
    const osName = isIPad ? 'iPad' : (isMac ? 'macOS' : 'Windows');

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState<boolean>(isStandalone);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallApp = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setDeferredPrompt(null);
    };

    // Windows / System Notification state
    const [windowsNotifEnabled, setWindowsNotifEnabled] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem('setting_windows_notification_enabled') !== 'false';
    });

    const [permission, setPermission] = useState<NotificationPermission>(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'default';
    });

    // Play chime sound for testing
    const playTestChime = () => {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, now); // D5
            osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, now + 0.12); // A5
            osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.25);
            osc2.start(now + 0.12);
            osc2.stop(now + 0.55);
        } catch (e) {
            // ignore
        }
    };

    // Request Notification Permission
    const handleRequestPermission = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            if (isIPad) {
                alert('บน iPad กรุณากดปุ่ม Share (แชร์) ⎋ แล้วเลือก "เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)" เพื่อรับการแจ้งเตือนนอกหน้าจอ');
            } else {
                alert(`เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนบน ${osName}`);
            }
            return;
        }

        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm === 'granted') {
                new Notification(`🏥 ระบบแจ้งเตือนผู้ป่วยส่งตัว OPD (ทดสอบ)`, {
                    body: `เปิดใช้งานการแจ้งเตือนบน ${osName} สำเร็จ! ระบบจะแจ้งเตือนเมื่อมีผู้ป่วยส่งตัวใหม่`,
                    icon: '/images/LOGO-04.jpg',
                    silent: false,
                });
                playTestChime();
            } else if (perm === 'denied') {
                alert('การแจ้งเตือนถูกปฏิเสธ กรุณาอนุญาตสิทธิ์การแจ้งเตือนในการตั้งค่าของเบราว์เซอร์');
            }
        } catch (e) {
            console.error('Error requesting permission:', e);
        }
    };

    // Send a test notification
    const sendTestNotification = async () => {
        playTestChime();

        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(`🏥 ระบบแจ้งเตือนผู้ป่วยส่งตัว OPD (ทดสอบ)`, {
                    body: `ระบบแจ้งเตือนบน ${osName} ทำงานปกติ! จะแจ้งเตือนเมื่อมีผู้ป่วยส่งตัวใหม่`,
                    icon: '/images/LOGO-04.jpg',
                    silent: false,
                });
            } else if (Notification.permission !== 'denied') {
                const perm = await Notification.requestPermission();
                setPermission(perm);
                if (perm === 'granted') {
                    new Notification(`🏥 ระบบแจ้งเตือนผู้ป่วยส่งตัว OPD (ทดสอบ)`, {
                        body: `เปิดใช้งานการแจ้งเตือนบน ${osName} สำเร็จ!`,
                        icon: '/images/LOGO-04.jpg',
                        silent: false,
                    });
                }
            } else {
                alert('โปรดอนุญาตการแจ้งเตือน (Notifications) ในการตั้งค่าของเบราว์เซอร์');
            }
        }
    };

    // Toggle Windows Notification setting (Auto-saves instantly)
    const handleToggleWindowsNotif = async () => {
        const nextState = !windowsNotifEnabled;

        if (nextState && typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                const perm = await Notification.requestPermission();
                setPermission(perm);
                if (perm !== 'granted') {
                    alert(`โปรดอนุญาตสิทธิ์การแจ้งเตือนในเบราว์เซอร์เพื่อรับการแจ้งเตือนบน ${osName}`);
                }
            }
        }

        setWindowsNotifEnabled(nextState);
        if (typeof window !== 'undefined') {
            localStorage.setItem('setting_windows_notification_enabled', String(nextState));
            window.dispatchEvent(new CustomEvent('setting-windows-notif-changed', { detail: nextState }));
        }

        if (nextState) {
            sendTestNotification();
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="การตั้งค่า (Settings)" />

            <div className="min-h-[calc(100vh-65px)] lg:h-[calc(100vh-65px)] overflow-y-auto flex flex-col p-3.5 sm:p-5 animate-in fade-in duration-300">
                <div className="w-full max-w-full space-y-4 flex flex-col min-h-0 flex-1">

                    {/* Header Banner */}
                    <div className="relative overflow-hidden liquid-glass-card p-4 sm:p-5 rounded-2xl shrink-0">
                        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#00B377]/15 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-[#00875A]/15 blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex items-center gap-2 rounded-full liquid-glass-btn-outline px-4 py-2 text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 self-start sm:self-auto"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>กลับหน้าหลัก</span>
                                </Link>

                                <div className="h-6 w-px bg-slate-300/60 hidden sm:block" />

                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl liquid-glass-box text-[#00875A] flex items-center justify-center shadow-xs shrink-0">
                                        <Sliders className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
                                            การตั้งค่า (Settings)
                                        </h1>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notification Setting Main Card */}
                    <div className="p-5 sm:p-6 rounded-2xl liquid-glass-card border border-slate-200/80 shadow-sm space-y-5">
                        
                        {/* Switch Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3.5">
                                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                                    windowsNotifEnabled ? 'bg-[#E8F8F2] text-[#00875A]' : 'bg-slate-100 text-slate-400'
                                }`}>
                                    {windowsNotifEnabled ? <Bell className="h-5.5 w-5.5" /> : <MonitorOff className="h-5.5 w-5.5" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <p className="font-bold text-slate-900 text-base">
                                            เปิดใช้งานการแจ้งเตือนผู้ป่วยส่งตัวใหม่ ({osName})
                                        </p>
                                        {permission === 'granted' && (
                                            <Badge variant="secondary" className="bg-[#E8F8F2] text-[#007A4D] border border-[#A7F3D0] font-bold text-xs">
                                                <CheckCircle2 className="h-3 w-3 mr-1" /> อนุญาตแล้ว
                                            </Badge>
                                        )}
                                        {permission === 'denied' && (
                                            <Badge variant="destructive" className="font-bold text-xs">
                                                <ShieldAlert className="h-3 w-3 mr-1" /> ถูกบล็อกในเบราว์เซอร์
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                                        รับการแจ้งเตือนผ่านหน้าต่างป๊อปอัปและเสียงกระดิ่ง (Hospital Chime) เมื่อมีผู้ป่วยส่งตัวเข้ามาใหม่
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                                <button
                                    type="button"
                                    onClick={handleToggleWindowsNotif}
                                    className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none select-none active:scale-95 touch-manipulation ${
                                        windowsNotifEnabled
                                            ? 'bg-[#00875A] shadow-[0_3px_12px_rgba(0,135,90,0.35)]'
                                            : 'bg-slate-300 shadow-inner'
                                    }`}
                                    aria-label="Toggle Notification"
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-7 w-7 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
                                            windowsNotifEnabled ? 'translate-x-7 shadow-[0_2px_6px_rgba(0,0,0,0.2)]' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons & Testing Area */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                {permission === 'default' && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleRequestPermission}
                                        className="rounded-full liquid-glass-btn-primary text-white font-bold text-xs h-9 px-4 flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Bell className="h-4 w-4" />
                                        <span>ขอสิทธิ์การแจ้งเตือน ({osName})</span>
                                    </Button>
                                )}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={sendTestNotification}
                                    className="rounded-full border-slate-300 font-bold text-xs h-9 px-4 hover:bg-[#E8F8F2] hover:text-[#007A4D] hover:border-[#A7F3D0] flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Volume2 className="h-4 w-4 text-[#00875A]" />
                                    <span>ทดสอบส่งการแจ้งเตือน & เสียงเตือน</span>
                                </Button>
                            </div>
                        </div>

                        {/* iPad PWA Guidance Banner */}
                        {isIPad && !isStandalone && typeof window !== 'undefined' && !('Notification' in window) && (
                            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
                                <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                                    <Share2 className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                                    <span>คำแนะนำการเปิดใช้งานการแจ้งเตือนบน iPad (iPadOS 16.4+)</span>
                                </div>
                                <p className="text-xs text-amber-800/90 leading-relaxed">
                                    เพื่อให้การแจ้งเตือนทำงานได้เมื่อล็อคหน้าจอหรืออยู่นอกแอพ: กรุณากดปุ่ม <strong>แชร์ (Share ⎋)</strong> บน Safari แล้วเลือก <strong>"เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)"</strong> จากนั้นเปิดใช้งานผ่านไอคอนบนหน้าจอโฮม
                                </p>
                            </div>
                        )}

                        {permission === 'denied' && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
                                <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">การแจ้งเตือนถูกปิดกั้น (Denied)</p>
                                    <p className="text-rose-700 mt-0.5">
                                        กรุณาคลิกที่ไอคอนแม่กุญแจ 🔒 หรือการตั้งค่าเว็บไซต์ข้างแถบ URL แล้วเปลี่ยนสิทธิ์การแจ้งเตือนเป็น "อนุญาต (Allow)"
                                    </p>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* PWA App Installation Card */}
                    <div className="p-5 sm:p-6 rounded-2xl liquid-glass-card border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="h-11 w-11 rounded-2xl bg-[#E8F8F2] text-[#00875A] flex items-center justify-center shrink-0">
                                    <Smartphone className="h-5.5 w-5.5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <p className="font-bold text-slate-900 text-base">
                                            การติดตั้งแอปพลิเคชัน (PWA App)
                                        </p>
                                        {isInstalled ? (
                                            <Badge variant="secondary" className="bg-[#E8F8F2] text-[#007A4D] border border-[#A7F3D0] font-bold text-xs">
                                                <CheckCircle2 className="h-3 w-3 mr-1" /> ติดตั้งเรียบร้อย (App Mode)
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-600 border-slate-300 font-semibold text-xs">
                                                ใช้งานผ่านเบราว์เซอร์
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                                        ติดตั้งระบบ OPD เป็นแอปพลิเคชันบน iPad, แท็บเล็ต หรือคอมพิวเตอร์ เพื่อใช้งานแบบเต็มจอและเปิดได้เร็วขึ้น
                                    </p>
                                </div>
                            </div>

                            {deferredPrompt && !isInstalled && (
                                <div className="self-end sm:self-center shrink-0">
                                    <Button
                                        type="button"
                                        onClick={handleInstallApp}
                                        className="rounded-full liquid-glass-btn-primary text-white font-bold text-xs h-9.5 px-5 flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
                                    >
                                        <Download className="h-4 w-4" />
                                        <span>ติดตั้งแอปบนอุปกรณ์นี้</span>
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* iPad / iOS Installation Guide */}
                        {isIPad && !isInstalled && (
                            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-3">
                                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                                    <Tablet className="h-4.5 w-4.5 text-[#00875A]" />
                                    <span>วิธีติดตั้งแอป OPD บน iPad / iPhone:</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <span className="font-bold text-[#00875A] flex items-center gap-1">
                                            <span>1.</span> แตะปุ่มแชร์
                                        </span>
                                        <p className="text-slate-600 leading-relaxed">
                                            แตะที่ไอคอน <strong>Share (แชร์ ⎋)</strong> บริเวณแถบด้านบนของ Safari
                                        </p>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <span className="font-bold text-[#00875A] flex items-center gap-1">
                                            <span>2.</span> เพิ่มไปยังหน้าจอโฮม
                                        </span>
                                        <p className="text-slate-600 leading-relaxed">
                                            เลื่อนลงแล้วแตะเลือก <strong>"เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)"</strong>
                                        </p>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <span className="font-bold text-[#00875A] flex items-center gap-1">
                                            <span>3.</span> ใช้งานเป็นแอป
                                        </span>
                                        <p className="text-slate-600 leading-relaxed">
                                            แตะ <strong>"เพิ่ม (Add)"</strong> จะได้ไอคอนแอป OPD เปิดใช้งานแบบเต็มจอทันที
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
