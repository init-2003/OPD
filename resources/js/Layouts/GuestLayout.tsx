import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden font-sans p-4 sm:p-6 select-none">
            {/* Ambient Soft Light Jade Orbs */}
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#00B377]/12 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#00875A]/12 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#E8F8F2]/70 rounded-full blur-[140px] pointer-events-none" />

            {/* Radial Gradient Fading Grid Pattern: Tight Faint Mask Immediately Around Card */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#94a3b8_1.5px,transparent_1.5px),linear-gradient(to_bottom,#94a3b8_1.5px,transparent_1.5px)] bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_480px_580px_at_50%_50%,transparent_35%,#000_85%)] opacity-75 pointer-events-none" />

            <div className="w-full max-w-md relative z-10 my-auto">
                {children}
            </div>
        </div>
    );
}
