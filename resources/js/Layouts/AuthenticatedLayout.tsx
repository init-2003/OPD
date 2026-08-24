import ApplicationLogo from '@/Components/ApplicationLogo';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Button } from '@/Components/ui/button';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/Components/ui/dialog';
import { Link, usePage, router } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState, useEffect, useRef } from 'react';
import { LogOut, User as UserIcon, Settings, ChevronDown, ChevronRight, Menu, X, ShieldCheck, Stethoscope, Loader2, AlertCircle } from 'lucide-react';
import NotificationBell from '@/Components/NotificationBell';
import {
    DashboardSkeleton,
    PatientDetailSkeleton,
    UltrasoundResultSkeleton,
    UltrasoundImageSkeleton,
    PatientHistorySkeleton,
    SettingsSkeleton,
    ProfileSkeleton,
} from '@/Components/Skeletons';
import InitialNotificationPromptModal from '@/Components/InitialNotificationPromptModal';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { auth, ...pageProps } = usePage().props;
    const user = auth.user;
    const url = usePage().url;
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [destinationUrl, setDestinationUrl] = useState<string | null>(null);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Global Toast Notification State
    const [toastVisible, setToastVisible] = useState(false);
    const [toastActive, setToastActive] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ title: string; desc: string }>({ title: '', desc: '' });
    const toastTimerRef = useRef<{ hide?: NodeJS.Timeout; unmount?: NodeJS.Timeout }>({});

    const triggerToast = (title: string, desc: string) => {
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
        }, 2800);
    };

    const flash = (pageProps as any).flash;

    useEffect(() => {
        if (flash?.login_success || flash?.success === 'เข้าสู่ระบบสำเร็จ') {
            const userName = user?.name || user?.Em_Fullname || 'ผู้ใช้งาน';
            triggerToast('เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับ ${userName}`);
        } else if (flash?.success) {
            triggerToast('สำเร็จ', String(flash.success));
        } else if (flash?.error) {
            triggerToast('เกิดข้อผิดพลาด', String(flash.error));
        }
    }, [flash]);

    const handleConfirmLogout = () => {
        setIsLoggingOut(true);
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('dashboard_selected_hn');
            sessionStorage.removeItem('dashboard_selected_vt');
            sessionStorage.removeItem('dashboard_search');
            sessionStorage.removeItem('dashboard_status_filter');
            sessionStorage.removeItem('dashboard_date');
        }
        router.post(route('logout'), {}, {
            onFinish: () => {
                setIsLoggingOut(false);
                setIsLogoutModalOpen(false);
            },
        });
    };


    useEffect(() => {
        const removeStart = router.on('start', (event: any) => {
            const method = (event?.detail?.visit?.method || 'get').toLowerCase();
            const preserveState = event?.detail?.visit?.preserveState;
            const target = event?.detail?.visit?.url?.pathname || String(event?.detail?.visit?.url || '');

            // Only show full-page navigation skeleton when actually navigating to another page via GET
            if (method === 'get' && !preserveState && target && target !== window.location.pathname) {
                setIsNavigating(true);
                setDestinationUrl(target);
            }
        });
        const removeFinish = router.on('finish', () => {
            setIsNavigating(false);
            setDestinationUrl(null);
        });
        const removeNavigate = router.on('navigate', () => {
            setIsNavigating(false);
            setDestinationUrl(null);
        });
        const removeCancel = router.on('cancel', () => {
            setIsNavigating(false);
            setDestinationUrl(null);
        });
        return () => {
            removeStart();
            removeFinish();
            removeNavigate();
            removeCancel();
        };
    }, []);

    const renderSkeleton = (target: string | null) => {
        const t = (target || '').toLowerCase();
        if (t.includes('profile')) {
            return <ProfileSkeleton />;
        }
        if (t.includes('settings')) {
            return <SettingsSkeleton />;
        }
        if (t.includes('ultrasound-result')) {
            return <UltrasoundResultSkeleton />;
        }
        if (t.includes('ultrasound-image')) {
            return <UltrasoundImageSkeleton />;
        }
        if (t.includes('history')) {
            return <PatientHistorySkeleton />;
        }
        if (t.includes('/patient/')) {
            return <PatientDetailSkeleton />;
        }
        return <DashboardSkeleton />;
    };

    const userName = user?.Em_Fullname || user?.name || user?.PB_user || 'ผู้ใช้งาน';

    return (
        <div className="min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden bg-[#e2e8f0] text-slate-800 relative flex flex-col font-sans transition-colors duration-200">
            {/* Top Screen Glowing Navigation Indicator */}
            {isNavigating && (
                <div className="fixed top-0 left-0 right-0 h-[3px] z-[999999] top-nav-glowing-bar pointer-events-none" />
            )}

            {/* Subtle 3D Ambient Glowing Spotlights for Liquid Glass Contrast */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#00B377]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#00875A]/10 rounded-full blur-3xl pointer-events-none translate-y-1/3" />

            <nav className="liquid-glass-topbar relative z-20 shrink-0">
                <div className="w-full max-w-full px-3.5 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between items-center">
                        <div className="flex items-center min-w-0">
                            <div className="flex shrink-0 items-center min-w-0">
                                <Link href="/" className="flex items-center gap-2.5 font-bold text-slate-800 text-sm sm:text-base lg:text-lg tracking-tight min-w-0">
                                    <img src="/LOGO-NON-BG.png" alt="OPD Logo" className="h-10 sm:h-11 object-contain shrink-0 drop-shadow-xs" />
                                    <span className="truncate max-w-[220px] sm:max-w-md lg:max-w-none">คลินิกหมอกระดูก-ข้อและรังสีวิทยา นพ.ชานนท์ • พญ.พัดชา</span>
                                </Link>
                            </div>
                        </div>

                        {/* Right Actions: Notification Bell + Profile Menu / Mobile Hamburger */}
                        <div className="flex items-center gap-2 ms-auto sm:ms-6">
                            <NotificationBell />

                            {/* Desktop Profile Dropdown */}
                            <div className="hidden sm:flex sm:items-center">
                                <DropdownMenu open={isProfileDropdownOpen} onOpenChange={setIsProfileDropdownOpen}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="flex items-center gap-2.5 px-3.5 py-1.5 h-10 rounded-full liquid-glass-box transition-all duration-200 cursor-pointer">
                                            <div className="relative flex items-center justify-center">
                                                <Avatar className="h-7.5 w-7.5 border border-[#00875A]/25 shadow-2xs">
                                                    <AvatarFallback className="bg-gradient-to-tr from-[#00B377] to-[#00875A] text-white flex items-center justify-center">
                                                        <Stethoscope className="h-4 w-4 text-white" />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#00B377] ring-2 ring-white" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-800">{userName}</span>
                                            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl liquid-glass-card animate-in fade-in-50 zoom-in-95 duration-200">
                                        <DropdownMenuLabel className="p-3 liquid-glass-box rounded-xl mb-1">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border-2 border-[#00875A] shadow-xs">
                                                    <AvatarFallback className="bg-gradient-to-tr from-[#00B377] to-[#00875A] text-white flex items-center justify-center">
                                                        <Stethoscope className="h-5.5 w-5.5 text-white" />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col space-y-0.5 overflow-hidden">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                                                    <p className="text-xs text-slate-500 truncate font-mono">{user?.PB_user ? `User ID: ${user.PB_user}` : (user?.email || 'ผู้ใช้งานระบบ')}</p>
                                                </div>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                        <DropdownMenuItem asChild>
                                            <Link href={route('profile.edit')} className="group flex w-full items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-slate-700 hover:bg-[#E8F8F2] hover:text-[#007A4D] transition-all duration-150 cursor-pointer">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-8 w-8 rounded-lg bg-[#E8F8F2] group-hover:bg-[#00875A] text-[#00875A] group-hover:text-white flex items-center justify-center transition-colors">
                                                        <UserIcon className="h-4 w-4" />
                                                    </div>
                                                    <span>โปรไฟล์</span>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#00875A] group-hover:translate-x-0.5 transition-all" />
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={route('settings')} className="group flex w-full items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-slate-700 hover:bg-[#E8F8F2] hover:text-[#007A4D] transition-all duration-150 cursor-pointer">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-8 w-8 rounded-lg bg-[#E8F8F2] group-hover:bg-[#00875A] text-[#00875A] group-hover:text-white flex items-center justify-center transition-colors">
                                                        <Settings className="h-4 w-4" />
                                                    </div>
                                                    <span>การตั้งค่า</span>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#00875A] group-hover:translate-x-0.5 transition-all" />
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setIsProfileDropdownOpen(false);
                                                setIsLogoutModalOpen(true);
                                            }}
                                            className="group flex w-full items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all duration-150 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-lg bg-rose-50 group-hover:bg-rose-600 text-rose-600 group-hover:text-white flex items-center justify-center transition-colors">
                                                    <LogOut className="h-4 w-4" />
                                                </div>
                                                <span>ออกจากระบบ</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-rose-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                        <div className="px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                            <span>เวอร์ชันระบบ</span>
                                            <span
                                                title={`Git Commit: ${(pageProps as any)?.app_commit || import.meta.env.VITE_APP_COMMIT || 'HEAD'}`}
                                                className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300 shadow-2xs font-mono text-[11px] select-all cursor-default"
                                            >
                                                {(pageProps as any)?.app_formatted_version || `v${String((pageProps as any)?.app_version || import.meta.env.VITE_APP_VERSION || '1.0.0').replace(/^v/, '')} (Build: ${(pageProps as any)?.app_build || import.meta.env.VITE_APP_BUILD || '1'})`}
                                            </span>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Mobile Hamburger Drawer Button */}
                            <div className="-me-2 flex items-center sm:hidden">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowingNavigationDropdown((prev) => !prev)}
                                >
                                    {showingNavigationDropdown ? (
                                        <X className="h-6 w-6" />
                                    ) : (
                                        <Menu className="h-6 w-6" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' sm:hidden'}>
                    <div className="space-y-1 pb-3 pt-2">
                        <ResponsiveNavLink
                            href={route('dashboard')}
                            active={route().current('dashboard')}
                        >
                            Dashboard
                        </ResponsiveNavLink>
                    </div>

                    <div className="border-t border-slate-200 pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-base font-medium text-slate-800">{user.name}</div>
                            <div className="text-sm font-medium text-slate-500">{user.email}</div>
                        </div>

                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>
                                Profile (ข้อมูลส่วนตัว)
                            </ResponsiveNavLink>
                            <ResponsiveNavLink href={route('settings')}>
                                Settings (การตั้งค่า)
                            </ResponsiveNavLink>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowingNavigationDropdown(false);
                                    setIsLogoutModalOpen(true);
                                }}
                                className="flex w-full items-center gap-2 ps-3 pe-4 py-2 border-l-4 border-transparent text-base font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 hover:border-rose-400 focus:outline-none transition duration-150 ease-in-out cursor-pointer"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Log Out (ออกจากระบบ)</span>
                            </button>
                        </div>

                        <div className="px-4 py-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                            <span>เวอร์ชันระบบ</span>
                            <span
                                title={`Git Commit: ${(pageProps as any)?.app_commit || import.meta.env.VITE_APP_COMMIT || 'HEAD'}`}
                                className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300 shadow-2xs font-mono text-[11px] select-all cursor-default"
                            >
                                {(pageProps as any)?.app_formatted_version || `v${String((pageProps as any)?.app_version || import.meta.env.VITE_APP_VERSION || '1.0.0').replace(/^v/, '')} (Build: ${(pageProps as any)?.app_build || import.meta.env.VITE_APP_BUILD || '1'})`}
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="bg-white border-b border-slate-200/80 shadow-xs">
                    <div className="w-full max-w-full px-6 py-6 sm:px-8 lg:px-10">
                        {header}
                    </div>
                </header>
            )}

            <main className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
                {isNavigating ? (
                    <div key="navigating-skeleton" className="flex-1 min-h-0 flex flex-col">
                        {renderSkeleton(destinationUrl)}
                    </div>
                ) : (
                    <div key={url} className="flex-1 min-h-0 flex flex-col">
                        {children}
                    </div>
                )}
            </main>

            {/* Logout Confirmation Modal Dialog */}
            <Dialog open={isLogoutModalOpen} onOpenChange={setIsLogoutModalOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl p-6 liquid-glass-card shadow-2xl">
                    <DialogHeader className="text-left space-y-2">
                        <DialogTitle className="text-lg font-bold text-slate-900">
                            ยืนยันการออกจากระบบ
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 mt-1">
                            คุณต้องการออกจากระบบ ใช่หรือไม่?
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="pt-4 flex flex-row items-center justify-end gap-2.5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsLogoutModalOpen(false)}
                            disabled={isLoggingOut}
                            className="rounded-full px-5 h-9.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleConfirmLogout}
                            disabled={isLoggingOut}
                            className="rounded-full px-6 h-9.5 text-xs font-bold !bg-rose-600 hover:!bg-rose-700 text-white shadow-md shadow-rose-600/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                            {isLoggingOut && <Loader2 className="h-4 w-4 animate-spin" />}
                            <span>{isLoggingOut ? 'กำลังออกจากระบบ...' : 'ยืนยันออกจากระบบ'}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* First-Time Login Notification Permission Prompt Modal */}
            <InitialNotificationPromptModal />

            {/* Global Sliding 3D Liquid Glass Toast Notification */}
            {toastVisible && (
                <div
                    className={`fixed bottom-7 right-7 z-[9999] pointer-events-none transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
                        toastActive
                            ? 'translate-y-0 opacity-100 scale-100'
                            : 'translate-y-12 opacity-0 scale-95'
                    }`}
                >
                    <div className="flex flex-col liquid-glass-toast text-slate-800 px-6 py-3.5 rounded-2xl sm:rounded-3xl shadow-2xl pointer-events-auto min-w-[260px] sm:min-w-[300px]">
                        <span className="text-[15px] sm:text-base font-extrabold text-slate-900 tracking-tight">
                            {toastMessage.title}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                            {toastMessage.desc}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

