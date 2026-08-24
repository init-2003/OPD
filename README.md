# OPD Referral Management System
### ระบบจัดการเวชระเบียนและผลการตรวจทางรังสีวิทยา (X-Ray & Ultrasound)

[![Build & Deploy](https://github.com/init-2003/OPD/actions/workflows/deploy.yml/badge.svg)](https://github.com/init-2003/OPD/actions/workflows/deploy.yml)
![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?style=flat&logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Inertia.js](https://img.shields.io/badge/Inertia.js-v2-9553E9?style=flat&logo=inertia&logoColor=white)

---

## ภาพรวมระบบ (Overview)

**OPD Referral Management System** เป็นเว็บแอปพลิเคชันเกรดการแพทย์ (Medical-Grade System) สำหรับบริหารจัดการข้อมูลผู้ป่วยนอก ประวัติการตรวจรักษา การส่งต่อ (Referral) และการบันทึกรายงานผลทางรังสีวิทยา (X-Ray & Ultrasound) ออกแบบด้วยสถาปัตยกรรมที่ทันสมัย รองรับการทำงานทั้งบน Desktop, Tablet และ iPad อย่างลื่นไหล

---

## คุณสมบัติเด่น (Key Features)

### 1. ระบบจัดการผู้ป่วยนอก (OPD Patient Management)
* **Smart Dashboard & Search:** ค้นหาผู้ป่วยแบบเรียลไทม์ด้วยเลข HN, ชื่อ-สกุล หรือวันที่เข้ารับบริการ
* **State Persistence:** จดจำสถานะการค้นหา คนไข้ที่เลือก และตัวกรองค้างไว้เมื่อรีเฟรชหน้าจอ (F5) ผ่าน `sessionStorage`
* **Vitals & Clinical Data:** บันทึกและแสดงผลสัญญาณชีพ (Blood Pressure, Pulse, Temp, SpO2, BMI)
* **Chief Complaint & Diagnosis:** บันทึกอาการเบื้องต้นและการวินิจฉัยโรค พร้อมระบบ Auto-Focus ท้ายข้อความ

### 2. ระบบรายงานผลรังสีวิทยาและอัลตราซาวด์ (Radiology & Findings Editor)
* **Paginated Rich-Text Findings Editor:** โปรแกรมแก้ไขรายงานผลแบบแบ่งหน้าอัตโนมัติตามมาตรฐานเอกสารการแพทย์
* **Clinical Preset Management:** บันทึกและเรียกใช้แม่แบบผลตรวจด่วน (Presets) พร้อมระบบ Context Menu แก้ไข/ลบด้วยการคลิกขวาหรือกดค้างบน Tablet
* **Ultrasound Gallery:** ระบบอัปโหลดและจัดเก็บภาพอัลตราซาวด์ความละเอียดสูง พร้อมแถบแสดงความคืบหน้า (Progress Bar)

### 3. ระบบพิมพ์เอกสารทางการแพทย์ (Official PDF Generator)
* สร้างเอกสารผลตรวจ X-Ray และ Ultrasound แบบ PDF ที่จัดวางตำแหน่งตรงกับแบบฟอร์มโรงพยาบาล (`XRAY_Form.png`) แบบ 1:1 Pixel-Perfect
* ระบบคำนวณตัดหน้าและระยะขอบอัตโนมัติ รองรับสระภาษาไทยวรรณยุกต์บน-ล่างอย่างแม่นยำ

### 4. ระบบระบุตัวตนและเวอร์ชันอัตโนมัติ (Git-Powered Versioning)
* ดึงข้อมูล **Git Commit Count** และ **Git Short SHA** มาประกอบเป็นเลข Version และ Build อัตโนมัติ เช่น `v1.0.0 (Build: 16)`
* การันตีว่าโค้ดชุดเดียวกันที่ Build บนเครื่อง Dev, Staging หรือ Production จะได้เลขระบุตัวตนที่ **ตรงกัน 100% เสมอ**

---

## เทคโนโลยีที่ใช้ (Tech Stack)

| ส่วนของระบบ | เทคโนโลยีที่เลือกใช้ |
| :--- | :--- |
| **Backend Framework** | [Laravel 13](https://laravel.com) (PHP 8.4 / 8.5) |
| **Frontend Framework** | [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) |
| **SPA Bridge** | [Inertia.js v2](https://inertiajs.com) |
| **Styling & Theme** | [Tailwind CSS v4](https://tailwindcss.com) + Medical Emerald Green Theme (`#00875A`) |
| **UI Components** | [Shadcn UI](https://ui.shadcn.com) / [Radix UI](https://www.radix-ui.com) / [Lucide Icons](https://lucide.dev) |
| **Rich Text Editor** | [Tiptap Editor](https://tiptap.dev) |
| **Database** | Microsoft SQL Server (Production) / SQLite (Local/Testing) |
| **Web Server** | Microsoft IIS (Windows Server) / Built-in Artisan Server |

---

## การติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)
* **PHP** >= 8.4 พร้อม Extensions: `fileinfo`, `zip`, `mbstring`, `xml`, `pdo_sqlsrv` (หรือ `pdo_sqlite`), `gd`
* **Node.js** >= 20.x และ **npm**
* **Composer** >= 2.x
* **Git**

### ขั้นตอนการติดตั้ง (Installation Steps)

```bash
# 1. Clone โปรเจกต์
git clone https://github.com/init-2003/OPD.git
cd OPD

# 2. ติดตั้ง PHP Dependencies
composer install

# 3. ติดตั้ง Node Dependencies
npm.cmd install

# 4. คัดลอกและตั้งค่า Environment
copy .env.example .env
php artisan key:generate

# 5. Build ไฟล์ Frontend สำหรับใช้งาน
npm.cmd run build

# 6. เริ่มต้นรันเซิร์ฟเวอร์ Local
php artisan serve
```

---

## คำสั่งที่ใช้บ่อย (Useful Commands)

```bash
# รัน Development Mode (Vite Hot Reload)
npm.cmd run dev

# ทำการ Build หน้าบ้านสำหรับขึ้น Production
npm.cmd run build

# รันชุดทดสอบระบบทั้งหมด (Pest Test Suite)
php artisan test

# ล้างแคชทั้งหมดของระบบ
php artisan optimize:clear
```

---

## โครงสร้างโฟลเดอร์สำคัญ (Project Structure)

```text
OPDReferralManagementSystem/
├── app/
│   ├── Http/Controllers/      # ตัวควบคุมจัดการข้อมูลผู้ป่วย, ภาพ, เอกสาร PDF
│   ├── Http/Middleware/       # จัดการ Session และส่งต่อ Shared Props (Inertia)
│   ├── Models/                # Eloquent Models เชื่อมต่อฐานข้อมูล
│   └── Support/AppVersion.php # ระบบคำนวณ Version & Build จาก Git อัตโนมัติ
├── resources/
│   ├── css/app.css            # ธีม Medical Emerald Glassmorphism & Liquid Glass
│   └── js/
│       ├── Components/        # UI Components, Skeletons, Modals
│       ├── Layouts/           # Authenticated & Guest Layouts
│       └── Pages/             # หน้า Dashboard, Patient Detail, Ultrasound, Login
├── routes/
│   ├── web.php                # กำหนดเส้นทางหลักของระบบ
│   └── auth.php               # เส้นทางการยืนยันตัวตน (Authentication)
├── scripts/
│   └── update-build-version.js # สคริปต์สร้าง version.json อัตโนมัติตอน build
└── version.json               # บันทึกสถานะ Version, Build Count, Commit ล่าสุด
```

---

## ใบอนุญาตและการพัฒนา (License & Contributors)

พัฒนาและดูแลรักษาสำหรับ **OPD Referral Management System**  
ระบบสงวนลิขสิทธิ์ © 2026 สงวนสิทธิ์ทุกประการ
