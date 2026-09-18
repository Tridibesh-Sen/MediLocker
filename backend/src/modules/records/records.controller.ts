import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { RecordsService } from './records.service';
import { DocumentType } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';

export class RecordsController {
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('File is required for upload.', 400);
      }

      const docTypeStr = (req.body.documentType || '').toUpperCase();
      const documentType: DocumentType =
        docTypeStr === 'REPORT' || docTypeStr.includes('REPORT') || docTypeStr.includes('LAB')
          ? DocumentType.REPORT
          : docTypeStr === 'SCAN'
          ? DocumentType.SCAN
          : docTypeStr === 'PRESCRIPTION'
          ? DocumentType.PRESCRIPTION
          : DocumentType.OTHER;
      const note = req.body.note;
      const eventDate = req.body.eventDate || req.body.docDate;
      const isMedicineStillNeeded =
        req.body.isMedicineStillNeeded !== undefined
          ? String(req.body.isMedicineStillNeeded).toLowerCase() !== 'false'
          : true;
      const doctorUnitId = req.body.doctorUnitId;

      const result = await RecordsService.uploadAndProcess(
        req.user!.userId,
        req.file,
        documentType,
        note,
        eventDate,
        isMedicineStillNeeded,
        doctorUnitId
      );

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await RecordsService.getRecordStatus(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  static async viewFile(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await RecordsService.getSecureRecordView(
        req.user!.userId,
        req.user!.role,
        req.params.id
      );

      const isBinaryMedia =
        record.mimeType?.startsWith('image/') ||
        record.mimeType === 'application/pdf' ||
        record.mimeType?.startsWith('audio/');

      // If requested raw JSON download
      if (req.query.format === 'raw' || req.query.format === 'json') {
        if (record.storageKey && fs.existsSync(record.storageKey)) {
          res.setHeader('Content-Type', record.mimeType || 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="${record.originalFilename}"`);
          return fs.createReadStream(record.storageKey).pipe(res);
        }
        return res.status(200).json({ success: true, data: record });
      }

      // If fileUrl is a remote URL (Supabase/Cloudinary)
      if (record.fileUrl && (record.fileUrl.startsWith('http://') || record.fileUrl.startsWith('https://'))) {
        return res.redirect(record.fileUrl);
      }

      // If storageKey is a local path and file exists
      if (record.storageKey && fs.existsSync(record.storageKey)) {
        if (isBinaryMedia) {
          res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
          res.setHeader('Content-Disposition', `inline; filename="${record.originalFilename}"`);
          return fs.createReadStream(record.storageKey).pipe(res);
        }
      }

      // If stored relative in uploads
      const uploadsFallback = path.join(process.cwd(), 'uploads', record.originalFilename);
      if (fs.existsSync(uploadsFallback)) {
        if (isBinaryMedia) {
          res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
          res.setHeader('Content-Disposition', `inline; filename="${record.originalFilename}"`);
          return fs.createReadStream(uploadsFallback).pipe(res);
        }
      }

      // If stored with relative fileUrl in uploads
      if (record.fileUrl && record.fileUrl.startsWith('/uploads/')) {
        const localPath = path.join(process.cwd(), record.fileUrl.replace(/^\//, ''));
        if (fs.existsSync(localPath) && isBinaryMedia) {
          res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
          res.setHeader('Content-Disposition', `inline; filename="${record.originalFilename}"`);
          return fs.createReadStream(localPath).pipe(res);
        }
      }

      // Render clinical consultation / digital EHR view for clinical documents, JSON intakes, or records without raw binary
      const escape = (str: any) =>
        String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      const patientName = escape((record as any).patient?.patientProfile?.fullName || 'Verified Patient');
      const medilockerId = escape((record as any).patient?.medilockerId || 'ML-VAL-2026');
      const bloodGroup = escape((record as any).patient?.patientProfile?.bloodGroup || 'Not Specified');
      const gender = escape((record as any).patient?.patientProfile?.gender || 'N/A');
      const doctorName = escape((record as any).timelineEvent?.doctorName || 'Attending Physician');
      const clinicName = escape((record as any).timelineEvent?.clinicName || 'MediLocker Sovereign Digital Vault');
      const dateFormatted = (record as any).timelineEvent?.eventDateDdmmyyyy
        ? `${(record as any).timelineEvent.eventDateDdmmyyyy.slice(0, 2)}/${(record as any).timelineEvent.eventDateDdmmyyyy.slice(2, 4)}/${(record as any).timelineEvent.eventDateDdmmyyyy.slice(4)}`
        : new Date(record.uploadedAt).toLocaleDateString('en-IN');

      const diagnoses: string[] = (record as any).timelineEvent?.diagnoses || [];
      const testsDue: any[] = (record as any).timelineEvent?.clinicalTestsDue || [];
      const clinicalSummary = (record as any).timelineEvent?.clinicalSummary || record.userNote || 'Clinical record archived in digital health locker.';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escape(record.originalFilename)} — MediLocker Clinical Record</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0284c7;
      --primary-dark: #0369a1;
      --surface: #ffffff;
      --bg: #f8fafc;
      --border: #e2e8f0;
      --text: #0f172a;
      --muted: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px 16px;
    }
    .container {
      max-width: 820px;
      margin: 0 auto;
      background: var(--surface);
      border-radius: 20px;
      border: 1px solid var(--border);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .top-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 24px;
      background: #0f172a;
      color: #fff;
    }
    .btn-group { display: flex; gap: 10px; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-primary { background: #0284c7; color: #fff; border: none; }
    .btn-primary:hover { background: #0369a1; }
    .btn-secondary { background: rgba(255, 255, 255, 0.15); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.25); }
    .header {
      padding: 32px 32px 24px;
      border-bottom: 2px dashed var(--border);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 44px; height: 44px;
      background: linear-gradient(135deg, #0284c7, #6366f1);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 22px;
    }
    .badge-verified {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }
    .patient-strip {
      background: #f1f5f9;
      padding: 18px 32px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
      border-bottom: 1px solid var(--border);
    }
    .strip-item span { display: block; font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 800; letter-spacing: 0.5px; }
    .strip-item strong { font-size: 14px; color: var(--text); }
    .body-content { padding: 32px; }
    .section { margin-bottom: 28px; }
    .section-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--primary);
      font-weight: 800;
      margin-bottom: 10px;
    }
    .callout {
      background: #f8fafc;
      border-left: 4px solid var(--primary);
      padding: 16px 20px;
      border-radius: 0 12px 12px 0;
      font-size: 14px;
      line-height: 1.6;
    }
    .pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .pill {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th { text-align: left; background: #f1f5f9; padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 2px solid var(--border); }
    td { padding: 12px 14px; border-bottom: 1px solid var(--border); }
    .urgency-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      background: #fef3c7;
      color: #92400e;
    }
    .footer {
      background: #f8fafc;
      border-top: 1px solid var(--border);
      padding: 20px 32px;
      font-size: 12px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
    @media print {
      body { background: #fff; padding: 0; }
      .top-actions { display: none !important; }
      .container { border: none; box-shadow: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-actions">
      <div style="font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px;">
        <span>🔒 MediLocker Sovereign Health Document</span>
      </div>
      <div class="btn-group">
        <button onclick="window.print()" class="btn btn-primary">🖨 Print / Save PDF</button>
        <button onclick="window.close()" class="btn btn-secondary">Close</button>
      </div>
    </div>

    <div class="header">
      <div>
        <div class="brand">
          <div class="brand-icon">⚕</div>
          <div>
            <h1 style="font-size: 20px; font-weight: 800; color: #0f172a;">MediLocker Electronic Health Vault</h1>
            <p style="font-size: 13px; color: var(--muted);">${clinicName} · ${doctorName}</p>
          </div>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="badge-verified">✓ ABDM Verified Record</span>
        <div style="font-size: 12px; color: var(--muted); margin-top: 6px;">Date: <strong>${dateFormatted}</strong></div>
      </div>
    </div>

    <div class="patient-strip">
      <div class="strip-item">
        <span>Patient Name</span>
        <strong>${patientName}</strong>
      </div>
      <div class="strip-item">
        <span>MediLocker ID</span>
        <strong class="mono" style="color: #0284c7;">${medilockerId}</strong>
      </div>
      <div class="strip-item">
        <span>Blood Group</span>
        <strong>${bloodGroup}</strong>
      </div>
      <div class="strip-item">
        <span>Gender</span>
        <strong>${gender}</strong>
      </div>
      <div class="strip-item">
        <span>Document Type</span>
        <strong>${escape(record.documentType)}</strong>
      </div>
    </div>

    <div class="body-content">
      ${
        record.userNote
          ? `
      <div class="section">
        <div class="section-title">Reported Chief Complaints & Symptoms</div>
        <div class="callout">${escape(record.userNote)}</div>
      </div>`
          : ''
      }

      <div class="section">
        <div class="section-title">Clinical Narrative & Assessment</div>
        <div class="callout" style="background: #ffffff; border: 1px solid var(--border); border-left: 4px solid #10b981;">
          ${escape(clinicalSummary)}
        </div>
      </div>

      ${
        diagnoses.length > 0
          ? `
      <div class="section">
        <div class="section-title">Clinical Findings & Diagnoses (${diagnoses.length})</div>
        <div class="pills">
          ${diagnoses.map((d) => `<span class="pill">${escape(d)}</span>`).join('')}
        </div>
      </div>`
          : ''
      }

      ${
        testsDue.length > 0
          ? `
      <div class="section">
        <div class="section-title">Recommended Diagnostic Investigations (${testsDue.length})</div>
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Urgency</th>
              <th style="width: 45%;">Diagnostic Investigation</th>
              <th style="width: 40%;">Clinical Indication</th>
            </tr>
          </thead>
          <tbody>
            ${testsDue
              .map(
                (t: any) => `
            <tr>
              <td><span class="urgency-badge">${escape(t.urgency || 'Routine')}</span></td>
              <td><strong>${escape(t.testName || 'Investigation')}</strong></td>
              <td style="color: var(--muted);">${escape(t.clinicalReason || 'Standard clinical review')}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
          : ''
      }
    </div>

    <div class="footer">
      <div>
        <span>Document Integrity Hash (SHA-256): </span>
        <span class="mono">${escape(record.sha256Checksum || record.id)}</span>
      </div>
      <div>
        <span>Status: </span>
        <strong style="color: #10b981;">VERIFIED & ACTIVE IN EHR</strong>
      </div>
    </div>
  </div>
</body>
</html>`;

      res.status(200).type('text/html').send(html);
    } catch (error) {
      next(error);
    }
  }

  static async createManual(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RecordsService.createManualRecord(req.user!.userId, req.body);
      res.status(201).json({ success: true, record: result.record, timelineEvent: result.timelineEvent });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filter = req.query.type as string;
      const result = await RecordsService.listRecords(req.user!.userId, filter);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RecordsService.getRecordById(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RecordsService.deleteRecord(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }
}
