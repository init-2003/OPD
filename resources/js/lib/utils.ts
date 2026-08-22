import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Ensures any date string displays year in Gregorian (ค.ศ.) A.D. format.
 * Automatically converts Buddhist year (e.g. 2569) to Gregorian year (2026).
 */
export function formatDateGregorian(dateStr?: string | null): string {
    if (!dateStr) return '-';
    let s = dateStr.toString();
    s = s.replace(/\b(25\d{2})\b/g, (match) => (parseInt(match, 10) - 543).toString());
    return s;
}

/**
 * Strips unnecessary trailing zeros like .0000 or .5000 from numbers and vital sign values.
 * e.g. "36.5000" -> "36.5", "55.0000" -> "55", "120.0000" -> "120"
 */
export function formatVitalValue(val?: string | number | null, unit: string = ''): string {
    if (val === undefined || val === null || val === '') return '-';
    const s = String(val).trim();
    if (s === '' || s === '-') return '-';

    // If it's a simple number
    if (/^-?\d+(\.\d+)?$/.test(s)) {
        const num = parseFloat(s);
        if (isNaN(num)) return s + (unit ? ` ${unit}` : '');
        return `${num}${unit ? ` ${unit}` : ''}`;
    }

    // Clean any embedded decimal numbers e.g. "120.0000 / 80.0000"
    const cleaned = s.replace(/(\.\d*?[1-9])0+\b/g, '$1').replace(/\.0+\b/g, '');
    return `${cleaned}${unit ? ` ${unit}` : ''}`;
}

/**
 * Strips trailing zeros from a numeric string or number.
 * e.g. "120.0000" -> "120", "36.5000" -> "36.5"
 */
export function cleanDecimals(val?: string | number | null): string {
    if (val === undefined || val === null || val === '') return '';
    const s = String(val).trim();
    if (s === '' || s === '-') return '';
    if (/^-?\d+(\.\d+)?$/.test(s)) {
        const num = parseFloat(s);
        return isNaN(num) ? s : num.toString();
    }
    return s.replace(/(\.\d*?[1-9])0+\b/g, '$1').replace(/\.0+\b/g, '');
}

/**
 * Strips default zero / decimal zeros (.0000) from OP_PROC (Ultrasound / Procedure).
 * If OP_PROC is "0.0000", "0.00", "0", empty or null, returns empty string "".
 * If it has numeric or text content with .0000, trims .0000.
 */
export function cleanProcValue(val?: string | number | null): string {
    if (val === undefined || val === null) return '';
    const s = String(val).trim();
    if (s === '' || s === '-' || /^0+(\.0+)?$/.test(s)) return '';
    return cleanDecimals(s);
}

/**
 * Calculates patient age with years and months (e.g. "40 ปี 9 เดือน", "40 ปี", "9 เดือน")
 * from OP_BIRTH date string to current date, with fallback to OP_AGE.
 */
export function calculateAgeWithMonths(birthDate?: string | null, fallbackAge?: string | number | null): string {
    if (!birthDate || birthDate === '-' || birthDate.trim() === '') {
        if (fallbackAge !== undefined && fallbackAge !== null && fallbackAge !== '') {
            const num = parseFloat(String(fallbackAge));
            return isNaN(num) ? String(fallbackAge) : `${Math.floor(num)} ปี`;
        }
        return '-';
    }

    let s = birthDate.trim();
    // Handle Thai Buddhist Era year e.g. 2530-05-14 -> 1987-05-14
    s = s.replace(/\b(25\d{2})\b/g, (match) => (parseInt(match, 10) - 543).toString());

    const birth = new Date(s);
    if (isNaN(birth.getTime())) {
        if (fallbackAge !== undefined && fallbackAge !== null && fallbackAge !== '') {
            const num = parseFloat(String(fallbackAge));
            return isNaN(num) ? String(fallbackAge) : `${Math.floor(num)} ปี`;
        }
        return '-';
    }

    const now = new Date();
    if (birth > now) {
        if (fallbackAge !== undefined && fallbackAge !== null && fallbackAge !== '') {
            const num = parseFloat(String(fallbackAge));
            return isNaN(num) ? String(fallbackAge) : `${Math.floor(num)} ปี`;
        }
        return '-';
    }

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
        months -= 1;
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} ปี`);
    if (months > 0) parts.push(`${months} เดือน`);

    if (parts.length === 0) {
        return days > 0 ? `${days} วัน` : '0 วัน';
    }
    return parts.join(' ');
}

/**
 * Returns formatted patient age string combining years and months.
 */
export function formatPatientAge(patient?: any): string {
    if (!patient) return '-';
    if (patient.formatted_age) return patient.formatted_age;
    return calculateAgeWithMonths(patient.OP_BIRTH || patient.op_birth, patient.op_age || patient.OP_AGE);
}

/**
 * Returns formatted Thai sex string ('ชาย' for M/1, 'หญิง' for F/2).
 */
export function formatPatientSex(sex?: string | null): string {
    if (!sex) return '-';
    const s = String(sex).trim();
    if (s === 'M' || s === 'm' || s === '1' || s === 'ชาย' || s.toLowerCase() === 'male') {
        return 'ชาย';
    }
    if (s === 'F' || s === 'f' || s === '2' || s === 'หญิง' || s.toLowerCase() === 'female') {
        return 'หญิง';
    }
    return s || '-';
}


