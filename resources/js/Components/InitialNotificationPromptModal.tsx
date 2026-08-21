import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Bell, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function InitialNotificationPromptModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Harmonic hospital notification chime
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
            // ignore
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Check if already prompted
        const hasPrompted = localStorage.getItem('pwa_initial_notif_prompt_shown_v1') === 'true';
        if (hasPrompted) return;

        // Check browser notification support & default permission
        if ('Notification' in window && Notification.permission === 'default') {
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 850);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('pwa_initial_notif_prompt_shown_v1', 'true');
        }
        setIsOpen(false);
    };

    const handleRequestPermission = async () => {
        setIsProcessing(true);
        if (typeof window !== 'undefined') {
            localStorage.setItem('pwa_initial_notif_prompt_shown_v1', 'true');
        }

        if (typeof window !== 'undefined' && 'Notification' in window) {
            try {
                const perm = await Notification.requestPermission();
                if (perm === 'granted') {
                    new Notification('🏥 ระบบแจ้งเตือนผู้ป่วยส่งตัว OPD', {
                        body: 'เปิดรับการแจ้งเตือนสำเร็จ! ระบบจะแจ้งเตือนเมื่อมีผู้ป่วยส่งตัวใหม่เข้ามาในระบบ',
                        icon: '/icons/icon-192x192.png',
                        silent: false,
                    });
                    playChimeSound();
                }
            } catch (err) {
                console.error('Error requesting permission:', err);
            }
        }

        setIsProcessing(false);
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
            <DialogContent className="sm:max-w-md rounded-3xl p-6 liquid-glass-card shadow-2xl animate-in zoom-in-95 duration-200">
                <DialogHeader className="text-left space-y-3">
                    <div className="flex items-center gap-3.5">
                        <div className="h-12 w-12 rounded-2xl bg-[#E8F8F2] text-[#00875A] flex items-center justify-center shadow-inner shrink-0 ring-4 ring-[#00875A]/10">
                            <Bell className="h-6 w-6 stroke-[2.2] animate-bounce" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-slate-900">
                                เปิดรับการแจ้งเตือนผู้ป่วยส่งตัว
                            </DialogTitle>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                แจ้งเตือนเคสใหม่และผลตรวจแบบเรียลไทม์
                            </p>
                        </div>
                    </div>

                    <DialogDescription className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                        <span>
                            ต้องการเปิดรับการแจ้งเตือนเมื่อมีผู้ป่วยส่งตัวเข้ามาใหม่บนอุปกรณ์นี้หรือไม่?
                        </span>
                        <div className="flex items-center gap-2 text-xs text-[#007A4D] font-semibold pt-1">
                            <ShieldCheck className="h-4 w-4 shrink-0 text-[#00875A]" />
                            <span>ไม่พลาดทุกรายการส่งตัวผู้ป่วย แม้ไม่ได้เปิดดูหน้าจอ</span>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="pt-3 flex flex-row items-center justify-end gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleDismiss}
                        disabled={isProcessing}
                        className="rounded-full px-5 h-9.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                        ไว้คราวหลัง
                    </Button>
                    <Button
                        type="button"
                        onClick={handleRequestPermission}
                        disabled={isProcessing}
                        className="rounded-full px-6 h-9.5 text-xs font-bold liquid-glass-btn-primary text-white shadow-md shadow-[#00875A]/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                        <Bell className="h-4 w-4 stroke-[2.5]" />
                        <span>เปิดรับการแจ้งเตือน</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
