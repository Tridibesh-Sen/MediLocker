# MediLocker 🏥🔐
> **A Sovereign, ABHA-Aligned Digital Health Sanctuary & Clinical Ecosystem**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

---

## 🌟 Executive Summary

**MediLocker** is a production-grade, patient-sovereign digital healthcare management ecosystem built to solve fragmented medical histories, unorganized paper prescriptions, medication non-adherence, and unauthorized clinical data exposure. 

Aligned with the architectural tenets of the **Ayushman Bharat Digital Mission (ABDM)**, MediLocker equips patients with a unique, permanent digital health identifier (`ML-XXX-XXX-XXX`), automated multimodal AI prescription digitization, home medicine inventory scanning, and a secure, time-bounded **6-digit OTP doctor-patient authorization gateway**.

MediLocker operates with **zero mock data and zero artificial fallbacks**: every account, prescription, daily routine checklist, cabinet inventory item, and clinical delegation is persisted in real-time across a live **Supabase PostgreSQL** database engine and **Supabase Object Storage**.

---

## 🚀 Core Features Catalog

### 1. 🪪 ABHA-Aligned Digital Health Identifier (`ML-XXX-XXX-XXX`)
- **Deterministic Identity Generation**: Every registered patient receives a formatted MediLocker Unit ID (e.g., `ML-829-410-994`).
- **Strict Deduplication**: Enforces exactly one unique account per verified email address.
- **Role-Based Isolation**: Three specialized personas: **Patient**, **Doctor**, and **Hospital**, each with dedicated data schemas, access controls, and authentication barriers.

### 2. 📄 Multimodal AI Clinical OCR & Ingestion (Google Gemini Vision)
- **Zero-Manual Entry**: Patients take a photo or upload a PDF of handwritten prescriptions, lab diagnostic sheets, or hospital discharge summaries.
- **Clinical Entity Extraction**: Automatically recognizes:
  - Prescribing Physician Name & Medical Clinic / Hospital Name.
  - Clinical Diagnoses & Detected Allergies.
  - Prescribed Medicines, Dosages, Formulations (tablets, capsules, syrups), Administration Routes, and Duration.
  - Prescribed Diagnostic Tests & Follow-Up schedules.

### 3. 📅 Interactive Chronological Health Timeline
- **Holistic Care History**: Weaves all historical clinical encounters into an interactive, chronological timeline.
- **Categorical Filtering**: Instant filtering across **Prescriptions**, **Lab Reports**, **Scans**, and **Hospital Admissions**.
- **Deep Search**: Instant query search across past diagnoses, clinics, doctors, and active medication courses.

### 4. 💊 Smart Medication To-Do & Adherence Scoring
- **Automated Routine Conversion**: Extracted prescription items automatically populate into four structured daily intake slots:
  - 🌅 **Morning** (e.g., *After breakfast · 8:00 AM*)
  - ☀️ **Afternoon** (e.g., *After lunch · 1:30 PM*)
  - 🌇 **Evening** (e.g., *Snack time · 5:30 PM*)
  - 🌙 **Night** (e.g., *After dinner · 9:00 PM*)
- **Circular Adherence Ring**: Dynamic adherence progress ring (`0%` to `100%`) reflecting real-time checklist completions.

### 5. ❤️ Daily Feeling & Severity Assessment
- **5-Point Wellness Log**: Patients record daily feelings: **Great**, **Good**, **Okay**, **Poor**, or **Critical**.
- **7-Day Visual Heatmap**: Real-time visual tracking of holistic recovery and pain trends.
- **Clinical Severity Triggers**: Poor or Critical ratings automatically trigger safety notices and prompt consultations.

### 6. 📦 Household Medicine Cabinet & Barcode/Batch Scanner
- **Home First-Aid & Pharmacy Management**: Keep inventory of medicine boxes at home.
- **GTIN Barcode & Camera Feed Batch Reader**: Scan standard barcodes or capture pharmaceutical batch codes from live camera feeds to fetch therapeutic uses, precautions, and active salts.
- **5-Day Refill Alerts**: Automated background cron calculations flag supplies running under 5 days and provide direct reorder guidance.

### 7. 🤖 Clinical Medi-AI Companion with Guardrails
- **Evidence-Based Patient Guidance**: Safe first-aid, lifestyle recommendations, and symptom triaging.
- **Strict Guardrail Policies**:
  - 🚫 **Non-Medical Interceptor**: Blocks programming/coding queries (e.g., Python linked list prompts), math, and trivia, returning an out-of-scope notice.
  - 🚫 **Prescription Drug Gating**: Refuses to autonomously prescribe Schedule H/X controlled drugs, prescription antibiotics, or dangerous medications.
  - ⚠️ **Allergy & Drug Conflict Check**: Dynamically cross-references user allergy history and ongoing medications before suggesting OTC remedies.
  - 📌 **Concise Pin-Point Formatting**: Structured bullet points with mandatory clinical disclaimers.

### 8. 🔐 Time-Bounded Doctor Access Delegation & 6-Digit OTP
- **Quarantined Patient Search**: When a doctor searches by patient Unit ID (`ML-XXX-XXX-XXX`), the response returns **strictly Full Name and DOB**. Zero medical records, prescriptions, or allergies are exposed during lookup.
- **Configurable Access Duration**: Doctor selects authorization duration from **30 minutes up to 7 days** (30m, 1h, 2h, 6h, 12h, 24h, 3d, 7d).
- **Dynamic 15-Minute 6-Digit Passcode**: Request appears on the patient's **Consent & Access** dashboard displaying doctor credentials and an expiring 6-digit numeric OTP.
- **Two-Factor Access Unlock**: Doctor enters the 6-digit passcode to unlock complete patient records, timeline, to-dos, and cabinet.
- **1-Click Immediate Revocation**: Patients retain full sovereignty and can terminate active doctor authorizations at any second with a single click.

### 9. 📊 Diagnostic Lab Findings & Biometrics Tracker
- **Vital Signs Monitoring**: Track Blood Pressure (Sys/Dia), Fasting Glucose, HbA1c, Heart Rate, and Blood Oxygen (SpO2).
- **Clinical Alert Thresholds**: Automatic classification into **Normal**, **Elevated**, or **Alert** with visual indicators.

### 10. 🏥 Dedicated Healthcare Provider Portals
- **Doctor Portal**: Verifiable Medical Registration Numbers (NMC/DCI/State Council), patient Unit ID lookups, access requests, and historical record viewing.
- **Hospital Portal**: Institutional staff allocations, inpatient coordination, and departmental auditing.
- **Immutable Audit Logging**: Every access grant, record view, and search is logged in the `audit_logs` table with IP address, user agent, and timestamp.

### 11. 🌐 Universal Accessibility & Multilingual Localization
- Real-time client-side localization across 7 languages:
  - **English**, **বাংলা (Bengali)**, **हिन्दी (Hindi)**, **मराठी (Marathi)**, **اردو (Urdu - RTL)**, **ਪੰਜਾਬੀ (Punjabi)**, and **ಕನ್ನಡ (Kannada)**.

---

## 🏗️ Technical Architecture

```
                               ┌───────────────────────────────────────────────┐
                               │            Client Layer (Vite 5)              │
                               │  HTML5 + Vanilla CSS3 (Design Tokens) + JS    │
                               │  - Patient Portal        - Doctor Portal      │
                               │  - Hospital Portal       - Medi-AI Companion  │
                               └──────────────────────┬────────────────────────┘
                                                      │ HTTPS / REST API
                                                      ▼
                               ┌───────────────────────────────────────────────┐
                               │           Backend API Layer (Port 5000)       │
                               │        Node.js + Express + TypeScript         │
                               ├───────────────────────────────────────────────┤
                               │ • JWT & Role-Based Access Control (RBAC)      │
                               │ • Clinical Guardrails Engine (ai.guardrails)  │
                               │ • Multer File Ingestion & SHA-256 Checksums   │
                               │ • Background Cron Scheduler (Refills/Expiry)  │
                               │ • Delegation OTP Gateway (delegation.service) │
                               └───────┬───────────────────────────────┬───────┘
                                       │                               │
                      Prisma ORM (v5)  │                               │ Google Gemini 1.5
                                       ▼                               ▼
                 ┌───────────────────────────────┐      ┌─────────────────────────────┐
                 │    Supabase PostgreSQL        │      │    Gemini Multimodal AI     │
                 │  - users & profiles           │      │  - Prescription Vision OCR  │
                 │  - medical_records            │      │  - Batch Code Recognition   │
                 │  - timeline & prescriptions   │      │  - Symptom Triage Engine    │
                 │  - patient_access_delegations │      └─────────────────────────────┘
                 │  - audit_logs & inventory     │
                 └───────────────────────────────┘
```

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5 Semantic Architecture, Vanilla CSS3 (Manrope & DM Sans typography), ES2022 JavaScript, Vite v5 |
| **Backend** | Node.js (v18+), Express.js, TypeScript (v5), Prisma ORM (v5.22.0) |
| **Database** | PostgreSQL hosted on Supabase (`db.mmgyamemhbecpytpibrr.supabase.co`) |
| **Storage** | Supabase Cloud Object Storage (`medical-records` bucket) |
| **AI / ML** | Google Gemini 1.5 Flash / Pro Multimodal Vision API |
| **Security** | Crypto SHA-256 Checksums, Bcrypt password hashing, JWT Bearer tokens, CORS |
| **Tooling** | Concurrently, ts-node-dev, node-cron |

---

## 📁 Repository Structure

```
MediLocker/
├── frontend/                     # Client application (Vite 5)
│   ├── css/
│   │   └── style.css             # Comprehensive design tokens, components & responsive layout
│   ├── js/
│   │   ├── i18n.js               # 7-language localization dictionary
│   │   └── main.js               # Core client logic, API handlers, portal bindings
│   ├── favicon.svg               # Medical cross + secure locker vault SVG favicon
│   ├── index.html                # High-conversion comprehensive landing page
│   ├── login.html                # Role-aware authentication portal (Patient/Doctor/Hospital)
│   ├── signup.html               # Registration & ABHA Unit ID generator
│   ├── dashboard.html            # Patient dashboard & health vitals overview
│   ├── records.html              # Medical records browser & document viewer
│   ├── upload.html               # Multi-document upload & AI OCR trigger
│   ├── medications.html          # Daily medication routine & adherence checklist
│   ├── timeline.html             # Chronological consultation & care timeline
│   ├── inventory.html            # Household medicine cabinet & barcode/batch scanner
│   ├── ai-companion.html         # Clinical Medi-AI assistant with safety guardrails
│   ├── delegation.html           # Doctor-patient consent requests & 6-digit OTP generator
│   ├── tests.html                # Diagnostic lab findings & vitals tracker
│   ├── profile.html              # Sovereign patient profile & emergency contact
│   ├── doctor.html               # Verified doctor portal with patient lookup & OTP entry
│   ├── hospital.html             # Institutional healthcare administration portal
│   └── 404.html                  # Error fallback page
│
├── backend/                      # Server application (TypeScript)
│   ├── prisma/
│   │   ├── schema.prisma         # Complete PostgreSQL relational schema
│   │   └── supabase_schema.sql   # Direct SQL migration reference
│   ├── src/
│   │   ├── modules/
│   │   │   ├── ai/               # Gemini AI OCR, batch reader, and clinical guardrails
│   │   │   ├── auth/             # Registration, deduplication, and login services
│   │   │   ├── delegation/       # 6-digit OTP generation, verification, and revocation
│   │   │   ├── inventory/        # Medicine cabinet, barcode GTIN, and refill tracking
│   │   │   └── records/          # Document upload, storage, and timeline ingestion
│   │   ├── app.ts                # Express application configuration & middleware
│   │   └── server.ts             # Server entrypoint & background cron scheduler
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                  # Root workspace package for concurrent development
├── README.md                     # Comprehensive project documentation
└── .gitignore                    # Git tracking exemptions
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Supabase Account**: With PostgreSQL and Object Storage enabled

### 1. Clone the Repository
```bash
git clone https://github.com/Tridibesh-Sen/MediLocker.git
cd MediLocker
```

### 2. Install Dependencies
```bash
# Install workspace root, backend, and frontend dependencies
npm run install:all
```

### 3. Configure Environment Variables
Create a `.env` file in `backend/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_ID].supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_ID].supabase.co:5432/postgres?sslmode=require"
SUPABASE_URL="https://[YOUR_PROJECT_ID].supabase.co"
SUPABASE_ANON_KEY="[YOUR_SUPABASE_ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR_SUPABASE_SERVICE_ROLE_KEY]"
SUPABASE_STORAGE_BUCKET="medical-records"
JWT_SECRET="medilocker_super_secret_production_key_2026"
GEMINI_API_KEY="[YOUR_GEMINI_API_KEY]"
FRONTEND_URL="http://localhost:3000"
```

### 4. Synchronize Database & Generate Prisma Client
```bash
cd backend
npx prisma generate
npx prisma db push
cd ..
```

### 5. Launch Development Servers
```bash
npm run dev
```
- 🌐 **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- 📡 **Backend Core API**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 🔒 Clinical Safety & Security Model

1. **Patient Data Sovereignty**:
   Patients possess exclusive ownership over their medical records. Clinical access by third parties requires explicit, time-bounded consent via 6-digit OTPs.
2. **Zero PHI Exposure on Query**:
   Provider patient queries reveal only Full Name and DOB, neutralizing potential harvesting of sensitive clinical records.
3. **Automated Session Expiration**:
   Delegated clinical authorizations terminate automatically upon reaching their granted duration (`expiresAt < now`).
4. **Clinical AI Boundaries**:
   Autonomous drug prescribing is prevented by regex interceptors and knowledge checks. Emergency and non-medical queries trigger explicit medical boundary notices.
5. **Tamper-Evident SHA-256 Integrity**:
   Every uploaded medical record has a cryptographic checksum recorded in PostgreSQL to verify document integrity.

---

## 👥 Contributors & Acknowledgements
Developed with ❤️ by **Tridibesh Sen** and the **MediLocker Engineering Team**. Designed in adherence to **Ayushman Bharat Digital Mission (ABDM)** principles.

---

## 📄 License
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.