import React, { useState, useEffect, useRef } from 'react';
import {
    Bell,
    UserCheck,
    Pill,
    Clock,
    RotateCw,
    ExternalLink,
    CheckCircle2,
    Monitor,
    Sparkles,
    CheckCheck,
    X,
    AlertCircle,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Link, router } from '@inertiajs/react';

interface NotificationPatient {
    vt_id?: number | string;
    VT_NO?: number | string;
    op_hn: string;
    fullname: string;
    op_vt_date_time?: string;
    pb_now1?: string;
    formatted_date?: string;
    OP_CHIEF?: string;
    OP_DIAG?: string;
    OP_SEND_DR_Name?: string;
    STS?: string;
    OP_ALLERGIC?: string;
    Image_PT?: string | null;
}

// Global module-level deduplication to prevent duplicate alerts across instances or re-renders
const globalNotifiedKeys = new Set<string>();
let lastChimePlayTime = 0;

export default function NotificationBell() {
    const [rawPatients, setRawPatients] = useState<NotificationPatient[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [open, setOpen] = useState<boolean>(false);
    const [hasNewAlert, setHasNewAlert] = useState<boolean>(false);
    const [readKeys, setReadKeys] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('read_patient_notifications');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    return new Set(Array.isArray(parsed) ? parsed : []);
                }
            } catch (e) {
                // ignore
            }
        }
        return new Set();
    });

    const [permission, setPermission] = useState<NotificationPermission>(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'default';
    });

    const isFirstLoadRef = useRef<boolean>(true);
    const knownKeysRef = useRef<Set<string>>(new Set());

    // Detect OS for tailored notification messages
    const isIPad = typeof window !== 'undefined' && (/iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent || navigator.platform);
    const isStandalone = typeof window !== 'undefined' && ((window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches);
    const osName = isIPad ? 'iPad' : (isMac ? 'macOS' : 'Windows');

    // Play harmonious hospital notification chime
    const playChimeSound = () => {
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
            // Audio context silently ignored if autoplay policy restricted
        }
    };

    // Send native Desktop Notification (Windows / Mac / iPad)
    const triggerDesktopNotification = async (p: NotificationPatient) => {
        const key = `${p.op_hn}-${p.VT_NO || p.vt_id}`;
        if (globalNotifiedKeys.has(key)) return;
        globalNotifiedKeys.add(key);

        const targetUrl = route('patient.show', { hn: p.op_hn, vt: p.VT_NO || '' });

        const isWindowsNotifEnabled = typeof window !== 'undefined' ? localStorage.getItem('setting_windows_notification_enabled') !== 'false' : true;
        if (isWindowsNotifEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const title = `🏥 มีผู้ป่วยส่งตัวมาใหม่: ${p.fullname}`;
            const notifOptions: NotificationOptions = {
                body: `CN: ${p.op_hn} (Visit: ${p.VT_NO || '-'}) ${p.OP_CHIEF ? '• อาการ: ' + p.OP_CHIEF : ''}`,
                icon: p.Image_PT || '/images/LOGO-04.jpg',
                badge: '/images/LOGO-04.jpg',
                tag: `patient-${key}`,
                data: { url: targetUrl, hn: p.op_hn, vt: p.VT_NO || '' },
                silent: false,
            };

            // 1. Try Service Worker showNotification (Best for iPadOS PWA & Mobile)
            if ('serviceWorker' in navigator) {
                try {
                    const reg = await navigator.serviceWorker.ready;
                    if (reg && 'showNotification' in reg) {
                        await reg.showNotification(title, notifOptions);
                    } else {
                        fireDirectNotification();
                    }
                } catch (e) {
                    fireDirectNotification();
                }
            } else {
                fireDirectNotification();
            }

            function fireDirectNotification() {
                try {
                    const notif = new Notification(title, notifOptions);
                    notif.onclick = (e) => {
                        e.preventDefault();
                        window.focus();
                        markAsRead(key);
                        router.visit(targetUrl);
                    };
                } catch (e) {
                    console.error('Error firing desktop notification:', e);
                }
            }
        }

        const isSoundEnabled = typeof window !== 'undefined' ? localStorage.getItem('setting_windows_notification_enabled') !== 'false' : true;
        const now = Date.now();
        if (isSoundEnabled && now - lastChimePlayTime > 2000) {
            lastChimePlayTime = now;
            playChimeSound();
        }
    };

    // Request Desktop Notification Permission (Windows, Mac, iPad)
    const requestDesktopNotification = async () => {
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
                const notif = new Notification('🏥 ระบบแจ้งเตือนผู้ป่วยส่งตัว OPD', {
                    body: `เปิดใช้งานการแจ้งเตือนบน ${osName} สำเร็จ! ระบบจะแจ้งเตือนเมื่อมีผู้ป่วยส่งตัวเข้ามาใหม่`,
                    icon: '/images/LOGO-04.jpg',
                    silent: false,
                });
                playChimeSound();
            } else if (perm === 'denied') {
                alert('การแจ้งเตือนถูกปิดกั้น กรุณาอนุญาตสิทธิ์การแจ้งเตือนในการตั้งค่าของเบราว์เซอร์');
            }
        } catch (err) {
            console.error('Error requesting notification permission:', err);
        }
    };

    // Mark a specific notification key as read (dismisses it)
    const markAsRead = (key: string) => {
        setReadKeys((prev) => {
            const next = new Set(prev);
            next.add(key);
            if (typeof window !== 'undefined') {
                localStorage.setItem('read_patient_notifications', JSON.stringify(Array.from(next)));
            }
            return next;
        });
    };

    // Mark all currently listed notifications as read
    const markAllAsRead = () => {
        setReadKeys((prev) => {
            const next = new Set(prev);
            rawPatients.forEach((p) => {
                const key = `${p.op_hn}-${p.VT_NO || p.vt_id}`;
                next.add(key);
            });
            if (typeof window !== 'undefined') {
                localStorage.setItem('read_patient_notifications', JSON.stringify(Array.from(next)));
            }
            return next;
        });
    };

    const fetchNotifications = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const res = await fetch(route('notifications.new_patients'), {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (res.ok) {
                const data = await res.json();
                const fetchedPatients: NotificationPatient[] = data.patients || [];

                setRawPatients(fetchedPatients);

                // Identify newly arrived patients
                if (!isFirstLoadRef.current) {
                    const newlyArrived = fetchedPatients.filter((p) => {
                        const key = `${p.op_hn}-${p.VT_NO || p.vt_id}`;
                        return !knownKeysRef.current.has(key);
                    });

                    if (newlyArrived.length > 0) {
                        setHasNewAlert(true);
                        setTimeout(() => setHasNewAlert(false), 6000);

                        // Broadcast event so Dashboard table reloads immediately without full-page refresh
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(
                                new CustomEvent('opd-new-patient-arrived', {
                                    detail: { count: newlyArrived.length, patients: newlyArrived },
                                })
                            );
                        }

                        // Fire Desktop Notification for new patient
                        newlyArrived.forEach((newP) => {
                            triggerDesktopNotification(newP);
                        });
                    }
                }

                // Update known keys
                fetchedPatients.forEach((p) => {
                    const key = `${p.op_hn}-${p.VT_NO || p.vt_id}`;
                    knownKeysRef.current.add(key);
                });

                isFirstLoadRef.current = false;
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Background polling every 20 seconds
        const interval = setInterval(() => {
            fetchNotifications();
        }, 20000);

        // Listen for instant dismiss when clicking "บันทึกผลการตรวจ" or saving results
        const handleInstantDismiss = (e: Event) => {
            const customEvent = e as CustomEvent<{ hn: string; vt?: string | number }>;
            const { hn, vt } = customEvent.detail || {};
            if (hn) {
                setReadKeys((prev) => {
                    const next = new Set(prev);
                    if (vt) next.add(`${hn}-${vt}`);
                    rawPatients.forEach((p) => {
                        if (p.op_hn === hn) {
                            next.add(`${p.op_hn}-${p.VT_NO || p.vt_id}`);
                        }
                    });
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('read_patient_notifications', JSON.stringify(Array.from(next)));
                    }
                    return next;
                });
            }
        };

        window.addEventListener('opd-dismiss-patient-notification', handleInstantDismiss);

        return () => {
            clearInterval(interval);
            window.removeEventListener('opd-dismiss-patient-notification', handleInstantDismiss);
        };
    }, [rawPatients]);

    // Filter out read notifications so only unread/new ones are displayed
    const unreadPatients = rawPatients.filter(
        (p) => !readKeys.has(`${p.op_hn}-${p.VT_NO || p.vt_id}`)
    );
    const unreadCount = unreadPatients.length;

    const handlePatientClick = (p: NotificationPatient) => {
        const key = `${p.op_hn}-${p.VT_NO || p.vt_id}`;
        markAsRead(key);
        setOpen(false);
        router.visit(route('patient.show', { hn: p.op_hn, vt: p.VT_NO || '' }));
    };

    const handleDismissSingle = (e: React.MouseEvent, p: NotificationPatient) => {
        e.stopPropagation();
        const key = `${p.op_hn}-${p.VT_NO || p.vt_id}`;
        markAsRead(key);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`relative h-10 w-10 p-0 rounded-full liquid-glass-box hover:border-[#A7F3D0] transition-all duration-200 cursor-pointer flex items-center justify-center ${
                        hasNewAlert ? 'ring-2 ring-rose-500 animate-bounce' : ''
                    }`}
                    title="การแจ้งเตือนผู้ป่วยส่งตัวใหม่"
                >
                    <Bell className={`h-5 w-5 text-slate-700 transition-transform ${open ? 'scale-110 text-[#00875A]' : ''}`} />
                    
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white ring-2 ring-white shadow-xs">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-88 sm:w-[410px] p-0 rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl border border-slate-200/80 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 z-50"
            >
                {/* Header */}
                <div className="p-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8.5 w-8.5 rounded-full bg-[#E8F8F2] text-[#007A4D] flex items-center justify-center shadow-xs">
                            <Bell className="h-4.5 w-4.5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-tight">
                                การแจ้งเตือนผู้ป่วยส่งตัวใหม่
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                                รายการใหม่ ({unreadCount} ราย)
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {unreadCount > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                className="h-7 px-2 text-[11px] font-semibold text-slate-600 hover:text-[#007A4D] hover:bg-[#E8F8F2]/60 rounded-lg cursor-pointer flex items-center gap-1"
                                title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                <span>อ่านทั้งหมด</span>
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-full hover:bg-slate-200/60 text-slate-500 cursor-pointer"
                            onClick={() => fetchNotifications(true)}
                            title="รีเฟรชการแจ้งเตือน"
                        >
                            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#00875A]' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Permission Request Banner */}
                {permission === 'default' && (
                    <div className="p-3 bg-gradient-to-r from-[#E8F8F2] to-emerald-50/80 border-b border-[#A7F3D0]/80 flex items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">🔔</span>
                            <div className="min-w-0">
                                <p className="font-bold text-slate-800 leading-tight truncate">
                                    เปิดรับแจ้งเตือนผู้ป่วยใหม่
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                    แจ้งเตือนทันทีบน {osName}
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            onClick={requestDesktopNotification}
                            className="h-7.5 px-3 text-xs font-bold liquid-glass-btn-primary text-white rounded-full shrink-0 shadow-xs cursor-pointer active:scale-95"
                        >
                            เปิดใช้งาน
                        </Button>
                    </div>
                )}

                {/* iPad Add-to-Home-Screen helper note */}
                {isIPad && !isStandalone && typeof window !== 'undefined' && !('Notification' in window) && (
                    <div className="p-3 bg-amber-50/90 border-b border-amber-200 text-xs text-amber-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800">
                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>คำแนะนำการแจ้งเตือนบน iPad</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-800/90">
                            กดปุ่มแชร์ <strong>(Share ⎋)</strong> ➔ เลือก <strong>"เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)"</strong> เพื่อรับการแจ้งเตือนนอกหน้าจอ
                        </p>
                    </div>
                )}

                {/* Patient Notifications List */}
                <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                    {unreadPatients.length > 0 ? (
                        unreadPatients.map((p, idx) => {
                            const hasAllergy = (p.STS && p.STS.toUpperCase() === 'Y') || Boolean(p.OP_ALLERGIC);
                            return (
                                <div
                                    key={`${p.op_hn}-${p.VT_NO || idx}`}
                                    onClick={() => handlePatientClick(p)}
                                    className="p-3 hover:bg-[#E8F8F2]/60 cursor-pointer transition-colors duration-150 flex items-start gap-3 group relative"
                                >
                                    {/* Thumbnail or Avatar */}
                                    <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                        {p.Image_PT ? (
                                            <img
                                                src={p.Image_PT}
                                                alt={p.fullname}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <UserCheck className="h-5 w-5 text-slate-400 group-hover:text-[#00875A] transition-colors" />
                                        )}
                                    </div>

                                    {/* Patient Info */}
                                    <div className="flex-1 min-w-0 pr-6">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-[#00875A] transition-colors">
                                                {p.fullname}
                                            </p>
                                            {hasAllergy && (
                                                <Badge variant="outline" className="bg-rose-50 border-rose-200 text-rose-700 text-[10px] px-1.5 py-0 font-bold shrink-0 flex items-center gap-0.5">
                                                    <Pill className="h-2.5 w-2.5 text-rose-600" />
                                                    <span>แพ้ยา</span>
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                                            <span>CN: <strong className="text-slate-700 font-semibold">{p.op_hn}</strong></span>
                                            <span>•</span>
                                            <span>Visit: <strong className="text-slate-700 font-semibold">{p.VT_NO || '-'}</strong></span>
                                        </div>

                                        {p.OP_CHIEF && (
                                            <p className="text-[11px] text-slate-600 truncate mt-1 bg-slate-50 group-hover:bg-white p-1 rounded border border-slate-100">
                                                อาการ: {p.OP_CHIEF}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{p.formatted_date || p.pb_now1 || 'วันนี้'}</span>
                                        </div>
                                    </div>

                                    {/* Dismiss / Close button */}
                                    <button
                                        type="button"
                                        onClick={(e) => handleDismissSingle(e, p)}
                                        className="absolute top-3 right-3 h-5 w-5 rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
                                        title="ซ่อนการแจ้งเตือนนี้"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center flex flex-col items-center justify-center space-y-2 text-slate-400">
                            <CheckCircle2 className="h-10 w-10 text-[#00875A] stroke-[1.5]" />
                            <p className="text-sm font-bold text-slate-700">ไม่มีรายการแจ้งเตือนใหม่</p>
                            <p className="text-xs text-slate-400">รายการที่คุณกดเข้าไปดูแล้วจะถูกซ่อนออกจากแถบแจ้งเตือน</p>
                        </div>
                    )}
                </div>

                {/* Footer Link to Dashboard */}
                <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                    <Link
                        href={route('dashboard')}
                        onClick={() => setOpen(false)}
                        className="w-full text-center py-1.5 font-bold text-[#007A4D] hover:text-[#005C3B] transition-colors flex items-center justify-center gap-1"
                    >
                        <span>ดูตารางรายการส่งตัวทั้งหมดบนแดชบอร์ด</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
