import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/Components/ui/button';

export interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    displayDate?: string;
}

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
    { value, onChange, displayDate },
    forwardedRef
) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

    React.useImperativeHandle(forwardedRef, () => buttonRef.current!);

    const getInitialDate = () => {
        if (value && value !== 'all' && pregMatchDate(value)) {
            const [y, m, d] = value.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        return new Date();
    };

    function pregMatchDate(str: string) {
        return /^\d{4}-\d{2}-\d{2}$/.test(str);
    }

    const todayObj = new Date();
    const todayY = todayObj.getFullYear();
    const todayM = todayObj.getMonth();
    const todayD = todayObj.getDate();
    const todayYMD = `${todayY}-${String(todayM + 1).padStart(2, '0')}-${String(todayD).padStart(2, '0')}`;
    const todayDisplayStr = `${String(todayD).padStart(2, '0')}/${String(todayM + 1).padStart(2, '0')}/${todayY}`;

    const [currentMonth, setCurrentMonth] = useState<Date>(getInitialDate());

    useEffect(() => {
        if (value && value !== 'all' && pregMatchDate(value)) {
            const [y, m, d] = value.split('-').map(Number);
            setCurrentMonth(new Date(y, m - 1, d));
        }
    }, [value]);

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const popoverWidth = 336; // 84 * 4 = 336px
            const left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, rect.right - popoverWidth));
            const top = rect.bottom + 6;
            setPopoverPos({ top, left });
        }
    };

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (isOpen) {
            updatePosition();
            setIsMounted(true);
            const raf = requestAnimationFrame(() => {
                setIsVisible(true);
            });
            return () => cancelAnimationFrame(raf);
        } else {
            setIsVisible(false);
            timer = setTimeout(() => {
                setIsMounted(false);
            }, 200);
        }
        return () => clearTimeout(timer);
    }, [isOpen]);

    useEffect(() => {
        if (isMounted) {
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isMounted]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent | TouchEvent) {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(year, month + 1, 1));
    };

    const handleSelectDay = (day: number) => {
        const mStr = String(month + 1).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const formatted = `${year}-${mStr}-${dStr}`;
        onChange(formatted);
        setIsOpen(false);
    };

    const isDateActive = Boolean(value && value !== 'all');

    const formatDisplay = () => {
        if (value === 'all') return 'เลือกวันที่...';
        if (displayDate) return displayDate;
        if (value && pregMatchDate(value)) {
            const [y, m, d] = value.split('-').map(Number);
            return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
        }
        return 'เลือกวันที่...';
    };

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative z-10 h-9 w-[146px] px-2 text-xs sm:text-sm font-bold rounded-full flex items-center justify-center gap-1.5 sm:gap-2 transition-colors duration-200 cursor-pointer select-none bg-transparent"
            >
                <CalendarIcon className={`h-4 w-4 shrink-0 transition-colors duration-200 ${isDateActive ? 'text-white' : 'text-[#00875A]'}`} />
                <span className={`whitespace-nowrap transition-colors duration-200 ${isDateActive ? 'text-white' : 'text-slate-700 hover:text-[#00875A]'}`}>{formatDisplay()}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-all duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''} ${isDateActive ? 'text-white/90' : 'text-slate-400'}`} />
            </button>

            {isMounted && popoverPos && createPortal(
                <div
                    ref={popoverRef}
                    style={{
                        position: 'fixed',
                        top: `${popoverPos.top}px`,
                        left: `${popoverPos.left}px`,
                        zIndex: 999999,
                    }}
                    className={`w-84 rounded-3xl liquid-glass-card p-4 shadow-2xl border border-white/90 text-slate-900 backdrop-blur-2xl transition-all duration-200 ease-out origin-top ${
                        isVisible
                            ? 'opacity-100 scale-100 translate-y-0'
                            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                    }`}
                >
                    {/* Header: Month & Year */}
                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-200/80 -mx-4 -mt-4 px-4 pt-3.5 rounded-t-3xl bg-slate-50/80">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-700 hover:bg-[#00875A]/15 hover:text-[#00875A] rounded-full liquid-glass-box cursor-pointer"
                            onClick={handlePrevMonth}
                        >
                            <ChevronLeft className="h-4.5 w-4.5" />
                        </Button>
                        <span className="text-base font-bold text-slate-800 tracking-tight">
                            {THAI_MONTHS[month]} {year}
                        </span>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-700 hover:bg-[#00875A]/15 hover:text-[#00875A] rounded-full liquid-glass-box cursor-pointer"
                            onClick={handleNextMonth}
                        >
                            <ChevronRight className="h-4.5 w-4.5" />
                        </Button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-2.5">
                        {WEEKDAYS.map((wd, i) => (
                            <div
                                key={wd}
                                className={`text-xs font-bold ${i === 0 ? 'text-rose-500 font-extrabold' : i === 6 ? 'text-[#00875A] font-extrabold' : 'text-slate-600'
                                    }`}
                            >
                                {wd}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                            <div key={`empty-${idx}`} className="h-9 w-9" />
                        ))}

                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                            const dayNum = idx + 1;
                            const mStr = String(month + 1).padStart(2, '0');
                            const dStr = String(dayNum).padStart(2, '0');
                            const dayDateStr = `${year}-${mStr}-${dStr}`;

                            const isSelected = value === dayDateStr;
                            const isToday = year === todayY && month === todayM && dayNum === todayD;

                            return (
                                <button
                                    key={dayNum}
                                    type="button"
                                    onClick={() => handleSelectDay(dayNum)}
                                    className={`h-9 w-9 text-sm rounded-full font-bold transition-all duration-150 flex items-center justify-center mx-auto cursor-pointer ${isSelected
                                            ? 'liquid-glass-btn-primary text-white shadow-md shadow-[#00875A]/35 scale-105'
                                            : isToday
                                                ? 'border-2 border-[#00875A] text-[#00875A] bg-[#E8F8F2] hover:bg-[#00875A]/20 shadow-2xs'
                                                : 'text-slate-800 hover:bg-[#00875A]/15 hover:text-[#00875A] hover:scale-105'
                                        }`}
                                >
                                    {dayNum}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer Buttons */}
                    <div className="mt-3.5 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs sm:text-sm">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-bold text-[#007A4D] bg-[#E8F8F2] hover:bg-[#E8F8F2]/80 px-3.5 rounded-full border border-[#A7F3D0] shadow-2xs cursor-pointer"
                            onClick={() => {
                                onChange(todayYMD);
                                setIsOpen(false);
                            }}
                        >
                            วันนี้ ({todayDisplayStr})
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs liquid-glass-btn-primary text-white font-bold px-4 rounded-full shadow-md shadow-[#00875A]/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            onClick={() => {
                                onChange('all');
                                setIsOpen(false);
                            }}
                        >
                            ดูทั้งหมด
                        </Button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
});
