export interface User {
    Em_id?: number | string;
    Em_Fullname?: string;
    PB_user?: string;
    EMP_STS_Name?: string;
    EMP_STS?: string;
    Em_Cer_No?: string;
    Sts?: string;
    STS_Type?: string;
    Degree?: string;
    Report_By?: string;
    name?: string;
    email?: string;
    email_verified_at?: string;
    [key: string]: any;
}

export interface PatientVisit {
    VT_NO?: number | string;
    op_hn: string;
    fullname: string;
    pb_now1?: string;
    formatted_date?: string;
    STS?: string;
    OP_ALLERGIC?: string;
    OP_Ultrasound_Result?: string;
    OP_Xray_Result?: string;
    Image_PT?: string | null;
    OP_SEND_DR_Name?: string;
    OP_BIRTH?: string;
    op_birth?: string;
    formatted_age?: string;
    OP_WEIGHT?: string | number;
    OP_HIGHT?: string | number;
    OP_BP_UP?: string | number;
    OP_BP_DW?: string | number;
    OP_BT?: string | number;
    OP_HR?: string | number;
    OP_RR?: string | number;
    OP_R?: string | number;
    OP_O2SAT?: string | number;
    OP_CHIEF?: string;
    OP_AR?: string | number;
    OP_DIAG?: string;
    OP_PROC?: string;
    OP_Track_STS?: string;
    OP_IDEN?: string;
    [key: string]: any;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    flash?: {
        success?: string | null;
        error?: string | null;
        login_success?: boolean | null;
        logout_success?: boolean | null;
        status?: string | null;
    };
    patients?: PatientVisit[];
    selectedDate?: string;
    displayDate?: string;
    stats?: {
        total: number;
        allergic: number;
    };
};

