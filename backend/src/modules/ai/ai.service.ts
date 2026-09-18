import path from 'path';
import fs from 'fs';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { prisma } from '../../database/prisma';
import { ClinicalGuardrails, PatientClinicalContext } from './ai.guardrails';
import { cacheService } from '../../utils/cache';


export interface ExtractedPrescription {
  eventDateDdmmyyyy: string;
  doctorName: string;
  clinicName: string;
  diagnoses: string[];
  allergiesDetected: string[];
  prescribedMedications: Array<{
    medicineName: string;
    activeSalt?: string;
    dosage: string;
    frequency: string;
    route?: string;
    timingInstruction?: string;
    courseStartDate: string;
    courseEndDate: string;
    totalQuantityNeeded: number;
  }>;
  clinicalTestsDue: Array<{
    testName: string;
    dueWithinDays: number;
  }>;
  clinicalSummary: string;
}

export class AIService {
  private static apiUrl = 'https://api.mistral.ai/v1';

  private static get apiKey(): string | undefined {
    return env.MISTRAL_API_KEY || env.MISTRAL_API_KEY_DOCUMENT_OCR || '';
  }

  private static getKeyPool(dedicatedKey?: string): string[] {
    const primary = (dedicatedKey || env.MISTRAL_API_KEY || '').trim();
    const fallbacks = [
      env.MISTRAL_API_KEY_DOCUMENT_OCR,
      env.MISTRAL_API_KEY_MEDICINE_SCAN,
      env.MISTRAL_API_KEY_COMPANION,
      env.MISTRAL_API_KEY_VOICE_INTAKE,
      env.MISTRAL_API_KEY_DISEASE_PREDICTION,
      env.MISTRAL_API_KEY_DOUBLE_CODING,
      env.MISTRAL_API_KEY_CLINICAL_TRIAGE,
      env.MISTRAL_API_KEY,
      env.MISTRAL_API_KEY_2,
    ]
      .map((k) => (k || '').trim())
      .filter(Boolean);

    return Array.from(new Set([primary, ...fallbacks])).filter(Boolean);
  }

  private static async runMistralOcr(fileBuffer: Buffer, mimeType: string, dedicatedKey?: string): Promise<string> {
    const keys = this.getKeyPool(dedicatedKey || env.MISTRAL_API_KEY_DOCUMENT_OCR);
    if (keys.length === 0) throw new Error('No Mistral OCR API keys configured');

    const isPdf = mimeType === 'application/pdf';
    const base64 = fileBuffer.toString('base64');
    const docPayload = isPdf
      ? { type: 'document_url', document_url: `data:application/pdf;base64,${base64}` }
      : { type: 'image_url', image_url: `data:${mimeType || 'image/jpeg'};base64,${base64}` };

    let lastError: any = null;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        const res = await fetch(`${this.apiUrl}/ocr`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mistral-ocr-latest',
            document: docPayload,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Mistral OCR key ${i + 1} status ${res.status}: ${errText}`);
        }

        const data = (await res.json()) as any;
        const pages = data.pages || [];
        return pages.map((p: any) => p.markdown || '').join('\n\n').trim();
      } catch (err: any) {
        lastError = err;
        logger.warn(`Mistral OCR key ${i + 1} failed, attempting failover key:`, err?.message);
      }
    }

    throw lastError || new Error('All Mistral OCR keys failed');
  }

  private static async runMistralChat(
    messages: Array<{ role: string; content: string }>,
    jsonFormat: boolean = false,
    dedicatedKey?: string
  ): Promise<string> {
    const keys = this.getKeyPool(dedicatedKey);
    if (keys.length === 0) throw new Error('No Mistral API keys configured');

    const body: any = {
      model: 'ministral-8b-latest',
      messages,
    };
    if (jsonFormat) {
      body.response_format = { type: 'json_object' };
    }

    let lastError: any = null;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        const res = await fetch(`${this.apiUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Mistral chat key ${i + 1} status ${res.status}: ${errText}`);
        }

        const data = (await res.json()) as any;
        return data.choices?.[0]?.message?.content?.trim() || '';
      } catch (err: any) {
        lastError = err;
        logger.warn(`Mistral chat key ${i + 1} failed, attempting failover:`, err?.message);
      }
    }

    throw lastError || new Error('All Mistral chat keys failed');
  }

  static async analyzeDocument(
    fileBuffer: Buffer,
    mimeType: string,
    originalFilename: string,
    userNote?: string
  ): Promise<ExtractedPrescription> {
    const today = new Date();
    const defaultDdmmyyyy = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${today.getFullYear()}`;

    if (!this.apiKey) {
      logger.warn('MISTRAL_API_KEY not configured. Checking clinical notes or returning clean extraction.');
      if (userNote && userNote.trim().length > 3) {
        return this.analyzeClinicalText(userNote, defaultDdmmyyyy);
      }
      return this.getCleanExtraction(defaultDdmmyyyy, originalFilename);
    }

    try {
      let ocrText = '';
      try {
        ocrText = await this.runMistralOcr(fileBuffer, mimeType);
      } catch (ocrErr: any) {
        logger.warn('Mistral OCR extraction failed, checking for accompanying note:', ocrErr?.message);
      }

      if ((!ocrText || ocrText.trim().length === 0) && userNote && userNote.trim().length > 3) {
        return await this.analyzeClinicalText(userNote, defaultDdmmyyyy);
      }

      const prompt = `You are Medi-AI, an expert clinical document intelligence parser for MediLocker.
Analyze the following clinical text extracted via OCR from a medical prescription or lab report, along with any accompanying patient or doctor note:

--- DOCUMENT OCR TEXT ---
${ocrText || '(No text extracted by OCR)'}
-------------------------
--- ACCOMPANYING CLINICAL NOTE / INSTRUCTIONS ---
${userNote || '(None provided)'}
-------------------------------------------------

Output a strictly valid JSON object conforming exactly to this structure:
{
  "eventDateDdmmyyyy": "ddmmyyyy",
  "doctorName": "Doctor or Laboratory name or 'Attending Physician'",
  "clinicName": "Clinic or Diagnostic Center name or 'MediLocker Vault'",
  "diagnoses": ["list of diagnosed conditions, lab findings, abnormal test values, or issues"],
  "allergiesDetected": ["list of detected drug allergies or contraindications"],
  "prescribedMedications": [
    {
      "medicineName": "Full brand name and strength",
      "activeSalt": "Generic salt name",
      "dosage": "e.g. 500mg or 1 tablet",
      "frequency": "e.g. 1-0-1 or once daily or twice daily",
      "route": "Oral",
      "timingInstruction": "After food / Before food / At bedtime",
      "courseStartDate": "YYYY-MM-DD",
      "courseEndDate": "YYYY-MM-DD",
      "totalQuantityNeeded": 10
    }
  ],
  "clinicalTestsDue": [
    {
      "testName": "Name of recommended lab or imaging test",
      "dueWithinDays": 7
    }
  ],
  "clinicalSummary": "Concise summary of clinical findings, test results, and doctor advice"
}

Rule: eventDateDdmmyyyy must be strictly 8 digits (e.g. 05092026 for 5 Sep 2026). If not found, use today's date ${defaultDdmmyyyy}. If no medicines are found, prescribedMedications must be empty array [].`;

      const responseText = await this.runMistralChat(
        [
          { role: 'system', content: 'You are a clinical document parser. You output ONLY valid JSON without markdown fences.' },
          { role: 'user', content: prompt },
        ],
        true
      );

      const cleanedJson = responseText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanedJson);

      let eventDate = String(parsed.eventDateDdmmyyyy || defaultDdmmyyyy).replace(/\D/g, '');
      if (eventDate.length !== 8) {
        eventDate = defaultDdmmyyyy;
      }
      parsed.eventDateDdmmyyyy = eventDate;

      return parsed;
    } catch (error: any) {
      logger.error('Mistral OCR/chat parsing error, falling back to note or clean extraction:', error?.message);
      if (userNote && userNote.trim().length > 3) {
        try {
          return await this.analyzeClinicalText(userNote, defaultDdmmyyyy);
        } catch (_) {}
      }
      return this.getCleanExtraction(defaultDdmmyyyy, originalFilename);
    }
  }

  static async analyzeFoil(fileBuffer: Buffer, mimeType: string) {
    if (!this.apiKey) {
      return {
        brandName: 'Household Medicine',
        activeSalt: 'Active Formulation',
        dosage: 'Standard dose',
        batchNumber: null,
        expiryDate: null,
        aiCategory: 'Healthcare Supply',
      };
    }

    let ocrText = '';
    try {
      ocrText = await this.runMistralOcr(fileBuffer, mimeType);
    } catch (ocrErr: any) {
      logger.warn('Foil OCR error:', ocrErr?.message);
    }

    const batchRegex = /(?:B\.?\s*(?:No|N|L)?\.?|Batch(?:\s*No\.?)?|Lot(?:\s*No\.?)?|Lote|B\/N|BN|Ch\.?-?B\.?)\s*[:.-]?\s*([A-Z0-9\/-]{3,20})/i;
    const expRegex = /(?:Exp\.?\s*(?:Date)?|Expiry(?:\s*Date)?|EXP)\s*[:.-]?\s*([0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}[/-][0-9]{1,2})/i;
    const batchMatch = ocrText.match(batchRegex);
    const expMatch = ocrText.match(expRegex);

    try {
      const prompt = `From this photo OCR text of a medicine blister foil, packaging carton, strip, or bottle:
"${ocrText || '(No OCR text available)'}"

Extract the Brand Name, Active Salt / Generic Name, Dosage Strength, Batch / Lot Number, and Expiry Date.
Look carefully for any sequence indicating a batch, lot, or control number (e.g. following 'B.No.', 'Batch', 'Lot', 'BN', or embossed alphanumeric codes).
Return strictly JSON:
{
  "brandName": "e.g. Dolo 650 or Augmentin 625",
  "activeSalt": "e.g. Paracetamol or Amoxicillin",
  "dosage": "e.g. 650mg or 500mg",
  "batchNumber": "Extracted batch or lot number e.g. B24091 or null if unreadable",
  "expiryDate": "YYYY-MM-DD or MM/YYYY or null if unreadable",
  "aiCategory": "e.g. Antipyretic / Antibiotic / Pain Relief"
}`;
      const responseText = await this.runMistralChat(
        [
          { role: 'system', content: 'You are a pharmaceutical OCR parser specializing in medicine blister strips and batch numbers. Return valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        true
      );
      const cleaned = responseText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      const isInvalidBatch = !parsed.batchNumber || String(parsed.batchNumber).toLowerCase() === 'null' || String(parsed.batchNumber).toLowerCase() === 'unreadable';
      if (isInvalidBatch) {
        parsed.batchNumber = batchMatch ? batchMatch[1].trim() : null;
      }
      const isInvalidExp = !parsed.expiryDate || String(parsed.expiryDate).toLowerCase() === 'null' || String(parsed.expiryDate).toLowerCase() === 'unreadable';
      if (isInvalidExp) {
        parsed.expiryDate = expMatch ? expMatch[1].trim() : null;
      }

      return parsed;
    } catch (error) {
      return {
        brandName: ocrText ? ocrText.split('\n')[0].substring(0, 30).trim() : 'Household Medicine',
        activeSalt: 'Active Formulation',
        dosage: 'Standard',
        batchNumber: batchMatch ? batchMatch[1].trim() : null,
        expiryDate: expMatch ? expMatch[1].trim() : null,
        aiCategory: 'General Healthcare',
      };
    }
  }

  static async categorizeMedicine(medicineName: string) {
    if (!this.apiKey) {
      return {
        activeSalt: medicineName,
        aiCategory: 'Common Household Medicine',
        aiUsesDescription: 'Used for common symptomatic relief as advised by doctor.',
        aiPrecautions: 'Store in a cool, dry place. Do not exceed recommended dosage.',
      };
    }

    try {
      const prompt = `Given the medicine name "${medicineName}":
Identify its active pharmaceutical ingredient, primary clinical uses, and safety precautions.
Return strictly JSON:
{
  "activeSalt": "generic drug salt",
  "aiCategory": "e.g. Antipyretic / Analgesic",
  "aiUsesDescription": "Short bullet points of indications",
  "aiPrecautions": "Short storage and safety precautions"
}`;
      const responseText = await this.runMistralChat(
        [
          { role: 'system', content: 'You are an expert pharmacologist. Return valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        true
      );
      const cleaned = responseText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      return {
        activeSalt: medicineName,
        aiCategory: 'Household Relief',
        aiUsesDescription: 'Symptomatic relief.',
        aiPrecautions: 'Store safely out of reach of children.',
      };
    }
  }

  static async chatWithCompanion(
    userMessage: string,
    clinicalContext: PatientClinicalContext
  ): Promise<{ response: string; emergencyBypass: boolean; recommendedHomeItem?: string }> {
    if (ClinicalGuardrails.isEmergency(userMessage)) {
      return {
        response: ClinicalGuardrails.getEmergencyResponse(),
        emergencyBypass: true,
      };
    }

    if (ClinicalGuardrails.isNonMedical(userMessage)) {
      return {
        response: ClinicalGuardrails.getNonMedicalRefusal(),
        emergencyBypass: false,
      };
    }

    const allergyConflict = ClinicalGuardrails.checkDirectAllergyConflict(clinicalContext, userMessage);
    if (allergyConflict.hasConflict) {
      return {
        response: `🚨 CRITICAL ALLERGY WARNING

• Documented Allergy: You have a verified medical allergy to "${allergyConflict.allergen}".
• Safety Directive: Do NOT consume or take any medicine, food, or preparation containing this ingredient. Exposure can trigger acute allergic reactions or life-threatening anaphylaxis.
• Immediate Action: If you have already ingested this, seek emergency medical care immediately (Dial 112 or 108).

${ClinicalGuardrails.getStandardDisclaimer()}`,
        emergencyBypass: false,
      };
    }

    const restrictedDrug = ClinicalGuardrails.isRestrictedDrugRequest(userMessage);
    if (restrictedDrug.isRestricted) {
      return {
        response: `⚠️ Prescription-Only Medication Alert

• Restricted Drug: "${restrictedDrug.drugName?.toUpperCase()}" is a strict prescription-only (Schedule H / antibiotic / controlled) medication.
• Safety Guardrail: Medi-AI cannot prescribe, recommend doses for, or authorize prescription-only drugs without a licensed physician's clinical examination.
• Permitted Care: For immediate daily relief, consider non-prescription supportive measures (adequate hydration, rest, saline or steam inhalation) and schedule a consultation with your attending doctor for an official prescription.

${ClinicalGuardrails.getStandardDisclaimer()}`,
        emergencyBypass: false,
      };
    }

    let homeCabinetContext = 'None recorded.';
    if (clinicalContext.homeSupplies && clinicalContext.homeSupplies.length > 0) {
      homeCabinetContext = clinicalContext.homeSupplies
        .map((m) => `${m.name} (${m.activeSalt || 'Active'} - Qty: ${m.quantity})`)
        .join(', ');
    }

    let prescribedMedsSummary = 'None recorded.';
    if (clinicalContext.alreadyPrescribedMedications && clinicalContext.alreadyPrescribedMedications.length > 0) {
      prescribedMedsSummary = clinicalContext.alreadyPrescribedMedications
        .map((m) => `${m.medicineName}${m.activeSalt ? ` (${m.activeSalt})` : ''}${m.dosage ? ` - ${m.dosage}` : ''}${m.frequency ? ` [${m.frequency}]` : ''}`)
        .join(', ');
    }

    if (!this.apiKey) {
      return {
        response: `• Assessment: Received inquiry regarding "${userMessage}".
• Daily Advice: Ensure adequate hydration, rest, and monitor symptoms closely.
• Safety Profile: Documented allergies (${clinicalContext.knownAllergies?.join(', ') || 'None'}), Prescribed medicines (${prescribedMedsSummary}).
• When to Consult: Seek medical care if symptoms worsen or high fever occurs.

${ClinicalGuardrails.getStandardDisclaimer()}`,
        emergencyBypass: false,
      };
    }

    try {
      const prompt = `You are Medi-AI, an expert clinical healthcare companion inside MediLocker.
You are strictly confined to personal daily health needs, non-prescription over-the-counter (OTC) guidance, home remedies, and medical advice.

PATIENT CLINICAL CONTEXT:
- Patient Name: ${clinicalContext.fullName || 'Patient'}
- Documented Allergies: ${clinicalContext.knownAllergies?.join(', ') || 'None documented'}
- Currently Prescribed Active Medications: ${prescribedMedsSummary}
- Is Pregnant: ${clinicalContext.isPregnant ? 'YES (Strictly avoid NSAIDs, Aspirin, and high-risk drugs)' : 'No'}
- Alcohol Consumption: ${clinicalContext.recentAlcohol ? 'YES (Sedation risks and liver toxicity contraindication)' : 'No'}
- Chronic Medical Conditions: ${clinicalContext.chronicConditions?.join(', ') || 'None documented'}
- Available Home Cabinet Supplies: ${homeCabinetContext}

USER INQUIRY: "${userMessage}"

MANDATORY CLINICAL GUARDRAILS:
1. NON-MEDICAL PROHIBITION: You must REFUSE any non-medical request (coding, programming, mathematics, general trivia, essays, etc.).
   If the inquiry is not about personal health, symptoms, medicine, or wellness, return:
   "⚠️ Out of Scope: Medi-AI is strictly confined to personal healthcare, daily wellness, and medical advice."
2. NO PRESCRIPTION DRUGS: Never prescribe Schedule H drugs, narcotics, or antibiotics. Only recommend non-prescription OTC care (steam, hydration, rest, OTC antacid/saline) or safe home cabinet items.
3. CONTEXT CHECKS:
   - Check against user's documented allergies: ${clinicalContext.knownAllergies?.join(', ') || 'None'}.
   - Check against already prescribed medicines (${prescribedMedsSummary}) for interactions or duplicate active salts.
4. FORMAT CONSTRAINT — PIN-POINT ACCURATE BULLET POINTS ONLY:
   - NEVER output long narrative paragraphs.
   - Use crisp, structured bullet points only:
     • **Direct Assessment**: 1 concise sentence answering the core concern.
     • **Actionable Guidance**: 2 to 3 bullet points of safe, non-prescription steps or OTC relief.
     • **Safety & Profile Cross-Check**: 1 bullet point referencing the patient's allergies and current prescriptions.
     • **When to See a Doctor**: 1 bullet point on warning signs.
5. DISCLAIMER:
   Append this exact disclaimer at the end:
   "${ClinicalGuardrails.getStandardDisclaimer()}"`;

      const responseText = await this.runMistralChat([
        { role: 'system', content: 'You are Medi-AI, an expert clinical healthcare companion. Output pin-point accurate bullet points only. Never output narrative paragraphs. Confined strictly to daily needed non-prescription medical advice.' },
        { role: 'user', content: prompt },
      ]);

      let finalResponse = responseText.trim();
      if (!finalResponse.includes('Medical Disclaimer')) {
        finalResponse += `\n\n${ClinicalGuardrails.getStandardDisclaimer()}`;
      }

      return {
        response: finalResponse,
        emergencyBypass: false,
      };
    } catch (error: any) {
      return {
        response: `• Assessment: Inquiry received regarding your symptoms.
• Action: Ensure adequate hydration, rest, and monitor your symptoms.
• Safety Note: Consult your doctor before taking new medications with your current prescription (${prescribedMedsSummary}).
• Emergency Notice: If fever exceeds 101°F or severe symptoms develop, seek medical care immediately.

${ClinicalGuardrails.getStandardDisclaimer()}`,
        emergencyBypass: false,
      };
    }
  }

  static async analyzeClinicalText(text: string, defaultDate: string): Promise<ExtractedPrescription> {
    if (!this.apiKey || !text || text.trim().length < 5) {
      return this.getCleanExtraction(defaultDate, 'Prescription Note');
    }

    try {
      const prompt = `You are Medi-AI, an expert clinical document intelligence parser for MediLocker.
Analyze the following clinical text provided by a patient or doctor (which may be a prescription, laboratory report, diagnostic findings, or clinical notes):

--- CLINICAL TEXT ---
${text}
--------------------

Output a strictly valid JSON object conforming exactly to this structure:
{
  "eventDateDdmmyyyy": "ddmmyyyy",
  "doctorName": "Doctor or Laboratory name or 'Attending Physician'",
  "clinicName": "Clinic or Diagnostic Center name or 'MediLocker Vault'",
  "diagnoses": ["list of diagnosed conditions, lab findings, abnormal test values, or observations"],
  "allergiesDetected": ["list of detected drug allergies or contraindications"],
  "prescribedMedications": [
    {
      "medicineName": "Full brand name and strength",
      "activeSalt": "Generic salt name",
      "dosage": "e.g. 500mg or 1 tablet",
      "frequency": "e.g. 1-0-1 or once daily or twice daily",
      "route": "Oral",
      "timingInstruction": "After food / Before food / At bedtime",
      "courseStartDate": "YYYY-MM-DD",
      "courseEndDate": "YYYY-MM-DD",
      "totalQuantityNeeded": 10
    }
  ],
  "clinicalTestsDue": [
    {
      "testName": "Name of recommended lab or imaging test",
      "dueWithinDays": 7
    }
  ],
  "clinicalSummary": "Concise summary of findings, report values, and clinical guidance"
}

Rule: eventDateDdmmyyyy must be strictly 8 digits (e.g. ${defaultDate}). If no medicines are mentioned, prescribedMedications must be empty array [].`;

      const responseText = await this.runMistralChat(
        [
          { role: 'system', content: 'You are a clinical document parser. You output ONLY valid JSON without markdown fences.' },
          { role: 'user', content: prompt },
        ],
        true
      );

      const cleanedJson = responseText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanedJson);
      let eventDate = String(parsed.eventDateDdmmyyyy || defaultDate).replace(/\D/g, '');
      if (eventDate.length !== 8) eventDate = defaultDate;
      parsed.eventDateDdmmyyyy = eventDate;
      return parsed;
    } catch (err: any) {
      logger.error('Error analyzing clinical text with Mistral:', err?.message);
      return this.getCleanExtraction(defaultDate, 'Prescription Note');
    }
  }

  private static getCleanExtraction(defaultDate: string, filename: string): ExtractedPrescription {
    return {
      eventDateDdmmyyyy: defaultDate,
      doctorName: 'Attending Physician',
      clinicName: 'Clinical Facility',
      diagnoses: [filename ? `Record: ${filename.replace(/\.[^/.]+$/, '')}` : 'Clinical Record'],
      allergiesDetected: [],
      prescribedMedications: [],
      clinicalTestsDue: [],
      clinicalSummary: `Document ${filename} stored securely in sovereign vault.`,
    };
  }

  /**
   * Feature 1: Multilingual Dialect Voice & Text Intake with Dynamic SOCRATES Framework
   */
  static async conductVoiceIntake(payload: {
    input: string;
    history?: Array<{ role: string; content: string }>;
    dialect?: string;
    language?: string;
    currentSocrates?: Record<string, any>;
  }) {
    const input = (payload.input || '').trim();
    const lang = (payload.language || '').toLowerCase();
    const dialect =
      payload.dialect ||
      (lang === 'en'
        ? 'English'
        : lang === 'bn'
        ? 'Bengali'
        : lang === 'mr'
        ? 'Marathi'
        : lang === 'te'
        ? 'Telugu'
        : lang === 'ta'
        ? 'Tamil'
        : lang === 'ur'
        ? 'Urdu'
        : 'Hindi / Bhojpuri');
    const current = payload.currentSocrates || {};
    const history = payload.history || [];

    // Count existing filled dimensions for completeness check
    const socratesDimensions = ['site', 'onset', 'character', 'radiation', 'associations', 'timeCourse', 'exacerbatingRelieving', 'severity'];
    const filledCount = socratesDimensions.filter((dim) => {
      const val = current[dim];
      if (val === null || val === undefined) return false;
      if (typeof val === 'string' && (!val.trim() || val.toLowerCase() === 'null' || val.toLowerCase() === 'pending')) return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
    }).length;

    const prompt = `You are the MediLocker Clinical OPD Intake Engine.
Patient input: "${input}"
Patient Dialect / Language preference: "${dialect}" (ISO code: ${lang || 'hi'})
Existing SOCRATES matrix collected so far:
${JSON.stringify(current, null, 2)}
Number of SOCRATES dimensions already filled: ${filledCount} out of ${socratesDimensions.length}

Recent Conversation History:
${history.slice(-4).map((h) => `${h.role}: ${h.content}`).join('\n')}

CLINICAL TASK:
1. Extract any new details matching the clinical SOCRATES dimensions:
   - site: anatomical location of pain/discomfort
   - onset: sudden, gradual, time started
   - character: burning, sharp, throbbing, dull, cramping
   - radiation: spreads anywhere else (e.g. to arm, back, neck)
   - associations: nausea, fever, vomiting, sweating, dizziness
   - timeCourse: constant, intermittent, worsening after food/exercise
   - exacerbatingRelieving: what makes it better or worse
   - severity: scale 1 to 10
2. Merge the patient's new input into the existing SOCRATES matrix. Return the FULL updated matrix (not just new fields).
3. COMPLETENESS RULES (CRITICAL — follow strictly):
   - Count non-null, non-empty SOCRATES dimensions in the UPDATED (merged) matrix.
   - If 5 or more of the 8 dimensions are filled with meaningful clinical data, set "isComplete": true.
   - If fewer than 5 dimensions are filled, set "isComplete": false and ask ONE follow-up.
   - NEVER ask more than 6 total follow-up questions across the conversation. If the conversation history already has 6+ exchanges, set "isComplete": true regardless.
   - When "isComplete" is true, give a warm reassuring closing message in the patient's dialect saying the intake is done and the system will now analyze their symptoms.
4. When "isComplete" is false, ask EXACTLY ONE gentle, conversational follow-up question in the patient's spoken dialect ("${dialect}") targeting the most clinically important missing dimension.
5. Output strictly valid JSON conforming to this schema:
{
  "assistantReply": "Spoken/written response in the patient's dialect (${dialect})",
  "detectedDialect": "${dialect}",
  "socrates": {
    "site": "anatomical region or null",
    "onset": "onset detail or null",
    "character": "character detail or null",
    "radiation": "radiation or null",
    "associations": ["list of associated symptoms"],
    "timeCourse": "temporal pattern or null",
    "exacerbatingRelieving": "modifying factors or null",
    "severity": 5
  },
  "isComplete": true or false,
  "completenessScore": number between 0 and 100,
  "filledDimensions": number of non-null SOCRATES dimensions (0-8),
  "nextMissingDimension": "site / onset / character / etc or null if complete",
  "clinicalSummaryEn": "One concise clinical summary sentence in scientific medical English"
}`;

    try {
      const responseText = await this.runMistralChat(
        [
          { role: 'system', content: 'You are an expert clinical intake officer. Output ONLY valid JSON.' },
          { role: 'user', content: prompt },
        ],
        true,
        env.MISTRAL_API_KEY_VOICE_INTAKE
      );

      const cleaned = responseText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      // Server-side completeness enforcement
      // Re-count filled dimensions from the AI's returned socrates matrix
      const returnedSocrates = parsed.socrates || {};
      const serverFilledCount = socratesDimensions.filter((dim) => {
        const val = returnedSocrates[dim as keyof typeof returnedSocrates];
        if (val === null || val === undefined) return false;
        if (typeof val === 'string' && (!val.trim() || val.toLowerCase() === 'null' || val.toLowerCase() === 'pending')) return false;
        if (Array.isArray(val) && val.length === 0) return false;
        return true;
      }).length;

      // Force complete if 5+ dimensions filled OR 6+ conversation exchanges
      const conversationExchanges = history.filter((h: any) => h.role === 'user').length;
      if (serverFilledCount >= 5 || conversationExchanges >= 6) {
        parsed.isComplete = true;
      }
      parsed.filledDimensions = serverFilledCount;
      parsed.completenessScore = Math.round((serverFilledCount / socratesDimensions.length) * 100);

      return parsed;
    } catch (err: any) {
      logger.error('Voice intake processing error:', err?.message);
      const fallbackReplies: Record<string, string> = {
        en: 'Please share more about your symptoms. When did this first begin?',
        hi: 'कृपया अपनी समस्या के बारे में और बताएं, यह कब से शुरू हुआ?',
        bn: 'আপনার শারীরিক সমস্যা সম্পর্কে আরো জানান, এটি কখন থেকে শুরু হয়েছে?',
        mr: 'आपल्या त्रासाबद्दल अधिक सांगा, हा त्रास कधीपासून सुरू झाला?',
        te: 'దయచేసి మీ సమస్య గురించి మరింత వివరంగా చెప్పండి, ఇది ఎప్పుడు ప్రారంభమైంది?',
        ta: 'உங்கள் பிரச்சினையைப் பற்றி மேலும் சொல்லுங்கள், இது எப்போது தொடங்கியது?',
        ur: 'براہ کرم اپنی تکلیف کے بارے میں مزید بتائیں، یہ کب سے شروع ہوئی؟',
      };
      const assistantReply =
        fallbackReplies[lang] ||
        fallbackReplies[dialect.toLowerCase().slice(0, 2)] ||
        fallbackReplies.en;

      return {
        assistantReply,
        detectedDialect: dialect,
        socrates: { ...current, site: input },
        isComplete: false,
        nextMissingDimension: 'onset',
        clinicalSummaryEn: `Patient reported complaint: ${input}`,
      };
    }
  }

  /**
   * Feature 1 Extension: High-Accuracy Disease Prediction & Diagnostic Test Recommendation
   */
  static async predictDiseasesAndTests(payload: {
    socrates: Record<string, any>;
    patientContext?: {
      age?: number;
      gender?: string;
      knownAllergies?: string[];
      chronicConditions?: string[];
    };
    language?: string;
  }) {
    const socrates = payload.socrates || {};
    const context = payload.patientContext || {};
    const lang = payload.language || 'hi';

    const prompt = `You are a Senior Clinical Differential Diagnosis AI Specialist.
Analyze the following patient clinical intake data:

SOCRATES DATA:
${JSON.stringify(socrates, null, 2)}

PATIENT CONTEXT:
Age: ${context.age || 'Adult'}
Gender: ${context.gender || 'Unspecified'}
Known Allergies: ${(context.knownAllergies || []).join(', ') || 'None documented'}
Chronic Conditions: ${(context.chronicConditions || []).join(', ') || 'None documented'}

CLINICAL OBJECTIVES:
1. Predict the top 3 most likely medical conditions (Differential Diagnosis) with scientific justification and probability rating (High / Moderate / Low). Include standard ICD code (e.g. K29.0, J45.9).
2. Recommend necessary laboratory, imaging, or diagnostic investigations required to confirm or rule out the diagnoses.
3. Identify any urgent Red-Flag Clinical Escalation signs (e.g. cardiac compromise, severe hypoxia, acute surgical abdomen, neuro deficits).
4. Provide a clear, calming explanation for the patient in simple layperson language in their preferred language (${lang}).

Output strictly valid JSON:
{
  "predictedConditions": [
    {
      "conditionName": "Scientific condition name",
      "probability": "High" | "Moderate" | "Low",
      "scientificRationale": "Concise pathophysiology rationale based on symptoms",
      "icdCode": "ICD-10/11 code"
    }
  ],
  "recommendedTests": [
    {
      "testName": "Investigation name (e.g. Complete Blood Count, USG Abdomen)",
      "urgency": "Immediate" | "Routine" | "Next Visit",
      "clinicalReason": "Diagnostic purpose"
    }
  ],
  "redFlags": ["list of critical warning signs or empty if safe"],
  "patientExplanation": "Clear layperson guidance in requested language (${lang})"
}`;

    try {
      const responseText = await this.runMistralChat(
        [
          { role: 'system', content: 'You are a clinical diagnostics AI. Output ONLY valid JSON conforming to the schema.' },
          { role: 'user', content: prompt },
        ],
        true,
        env.MISTRAL_API_KEY_DISEASE_PREDICTION
      );

      const cleaned = responseText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (err: any) {
      logger.error('Disease prediction error:', err?.message);
      return {
        predictedConditions: [
          {
            conditionName: 'Acute Symptomatic Evaluation Needed',
            probability: 'Moderate',
            scientificRationale: 'Symptom pattern requires formal physician physical examination.',
            icdCode: 'R69',
          },
        ],
        recommendedTests: [
          {
            testName: 'Complete Blood Count (CBC)',
            urgency: 'Routine',
            clinicalReason: 'Baseline infection and hematological screening.',
          },
        ],
        redFlags: [],
        patientExplanation: 'कृपया अपने नजदीकी स्वास्थ्य केंद्र या चिकित्सक से शारीरिक जांच करवाएं।',
      };
    }
  }

  /**
   * Feature 2: Dual-Standard Medical Classification (NAMASTE + WHO ICD-11 Chapter 26)
   */
  static async doubleCodeDiagnosis(payload: { complaintOrDiagnosis: string; language?: string }) {
    const text = (payload.complaintOrDiagnosis || '').trim();

    const prompt = `You are the Dual-Standard Medical Terminology Classification Engine for MediLocker.
Target standards:
1. National Morbidity Codes (NAMASTE Standard: National AYUSH Morbidity and Standardized Terminologies)
2. WHO ICD-11 Chapter 26 (Traditional Medicine Module 2 - TM2)

Clinical input text:
"${text}"

STANDARDIZED ONTOLOGY EXAMPLES:
- Acid dyspepsia / hyperacidity -> NAMASTE: NAMC-AG-01 (Amlapitta) | WHO ICD-11 TM2: SF10 (Disorders of Pitta / Metabolic-Inflammatory state)
- Bronchial asthma / wheezing -> NAMASTE: NAMC-SW-03 (Tamaka Shwasa) | WHO ICD-11 TM2: SF00 (Disorders of Vata) & SF20 (Disorders of Kapha)
- Osteoarthritis / joint pain -> NAMASTE: NAMC-ST-02 (Sandhivata) | WHO ICD-11 TM2: SF00 (Disorders of Vata / Neuro-motor & musculoskeletal regulation)
- Febrile illness -> NAMASTE: NAMC-JV-01 (Jvara) | WHO ICD-11 TM2: SF10 (Pitta inflammatory state)
- Metabolic syndrome / diabetes -> NAMASTE: NAMC-PR-01 (Prameha) | WHO ICD-11 TM2: SF20 (Kapha-Pitta metabolic dysregulation)
- Irritable bowel / malabsorption -> NAMASTE: NAMC-GH-01 (Grahani) | WHO ICD-11 TM2: SF10 / SF00 (Agni-Vata gastrointestinal dysmotility)
- Chronic cough -> NAMASTE: NAMC-KS-01 (Kasa) | WHO ICD-11 TM2: SF00 / SF20
- Gouty arthritis -> NAMASTE: NAMC-VR-01 (Vatarakta) | WHO ICD-11 TM2: SF00 / SF10
- Jaundice / hepatitis -> NAMASTE: NAMC-KM-01 (Kamala) | WHO ICD-11 TM2: SF10 (Severe Pitta hepatic dysfunction)
- Cephalea / Migraine -> NAMASTE: NAMC-SR-01 (Shiroroga) | WHO ICD-11 TM2: SF00 (Neuro-vascular Vata disorder)

CLINICAL TASK:
Map the input condition into both coding standards with scientific descriptions. Avoid mystical terms; use neuro-motor, metabolic-inflammatory, and structural-fluid scientific equivalents.

Output strictly valid JSON:
{
  "nationalMorbidityCode": {
    "code": "e.g. NAMC-AG-01",
    "term": "Standardized Clinical Term (e.g. Amlapitta)",
    "scientificCategory": "e.g. Upper Gastrointestinal Acid-Peptic Disorder"
  },
  "icd11Tm2Code": {
    "code": "e.g. TM2: SF10",
    "term": "WHO TM2 Standard Nomenclature",
    "description": "Scientific systemic description (e.g. Systemic metabolic-inflammatory hyper-responsiveness)"
  },
  "confidenceScore": 0.95,
  "physiologicalProfile": {
    "neuroMotorIndex": 30,
    "metabolicInflammatoryIndex": 60,
    "structuralFluidIndex": 10
  }
}`;

    try {
      const responseText = await this.runMistralChat(
        [
          { role: 'system', content: 'You are a medical informatics ontology classifier. Output ONLY valid JSON.' },
          { role: 'user', content: prompt },
        ],
        true,
        env.MISTRAL_API_KEY_DOUBLE_CODING
      );

      const cleaned = responseText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (err: any) {
      logger.error('Double-coding ontology error:', err?.message);
      return {
        nationalMorbidityCode: {
          code: 'NAMC-GN-01',
          term: 'Samanya Roga',
          scientificCategory: 'General Clinical Complaint',
        },
        icd11Tm2Code: {
          code: 'TM2: SF99',
          term: 'Unspecified Traditional Medicine Disorder',
          description: 'General systemic metabolic imbalance',
        },
        confidenceScore: 0.75,
        physiologicalProfile: {
          neuroMotorIndex: 33,
          metabolicInflammatoryIndex: 34,
          structuralFluidIndex: 33,
        },
      };
    }
  }

  /**
   * Feature 6: 30-Second High-Density Clinical Vaidya OPD Summary
   */
  static async generateClinicalTriageSummary(patientId: string) {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: patientId },
      include: { user: true },
    }).catch(() => null);

    const records = await prisma.medicalRecord.findMany({
      where: { patientId },
      take: 5,
      orderBy: { uploadedAt: 'desc' },
      include: { timelineEvent: true },
    }).catch(() => []);

    const recentTodos = await prisma.dailyTodoItem.findMany({
      where: { patientId },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    const recentFeeling = await prisma.dailyFeelingLog.findMany({
      where: { patientId },
      take: 5,
      orderBy: { logDate: 'desc' },
    }).catch(() => []);

    const activeMeds = await prisma.prescribedMedication.findMany({
      where: { patientId, isActive: true },
    }).catch(() => []);

    const clinicalContext = {
      name: patient?.fullName || 'Patient',
      age: patient?.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / 31557600000) : 'Adult',
      gender: patient?.gender || 'Unspecified',
      bloodGroup: patient?.bloodGroup || 'Not documented',
      allergies: patient?.baselineAllergies || 'None documented',
      chronicConditions: patient?.chronicConditions || [],
      activeMedicationsCount: activeMeds.length,
      recentRecords: records.map((r: any) => ({
        type: r.documentType,
        diagnoses: r.timelineEvent?.diagnoses,
        summary: r.timelineEvent?.clinicalSummary,
      })),
      recentFeelingStatus: recentFeeling.map((f: any) => ({ date: f.logDate, score: f.feelingScore, color: f.severityColor })),
    };

    const prompt = `You are the 30-Second Clinical OPD Summary AI for attending physicians and Vaidyas.
Synthesize the following patient clinical chart into an ultra-high-density briefing readable in under 30 seconds:

PATIENT CHART DATA:
${JSON.stringify(clinicalContext, null, 2)}

CLINICAL SYNTHESIS REQUIREMENTS:
1. chiefComplaint30s: 2-3 precise bullet points summarizing primary current clinical complaints.
2. redFlags: Any vital signs or contraindication red flags (or ["No acute emergency flags detected"]).
3. physiologicalProfile:
   - vataNeuroMotorScore: 0-100%
   - pittaMetabolicScore: 0-100%
   - kaphaStructuralScore: 0-100%
   - agniDigestiveState: "Sama (Balanced)" | "Vishama (Irregular)" | "Tikshna (Hyperactive)" | "Manda (Hypoactive)"
4. standardizedDoubleCodes: Primary NAMASTE code and primary WHO ICD-11 TM2 code.
5. recommendedClinicalPlan: 3 actionable clinical points for the physician.

Output strictly valid JSON:
{
  "chiefComplaint30s": ["bullet 1", "bullet 2"],
  "redFlags": ["flag 1" or "No acute flags detected"],
  "physiologicalProfile": {
    "neuroMotorScore": 35,
    "metabolicScore": 45,
    "structuralScore": 20,
    "metabolicStatus": "Balanced / Mildly elevated metabolic fire"
  },
  "standardizedDoubleCodes": {
    "namasteCode": "NAMC-AG-01",
    "namasteTerm": "Amlapitta",
    "icd11Tm2": "TM2: SF10 (Pitta disorder)"
  },
  "recommendedClinicalPlan": ["Guideline 1", "Guideline 2", "Guideline 3"]
}`;

    try {
      const responseText = await this.runMistralChat(
        [
          { role: 'system', content: 'You are an emergency OPD triage specialist. Output strictly valid JSON.' },
          { role: 'user', content: prompt },
        ],
        true,
        env.MISTRAL_API_KEY_CLINICAL_TRIAGE
      );

      const cleaned = responseText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        patientId,
        patientName: patient?.fullName || 'Patient',
        medilockerId: patient?.user?.medilockerId || 'ML-VAULT',
        bloodGroup: patient?.bloodGroup || 'Unspecified',
        allergies: patient?.baselineAllergies || 'None',
        ...parsed,
      };
    } catch (err: any) {
      logger.error('Clinical triage summary error:', err?.message);
      return {
        patientId,
        patientName: patient?.fullName || 'Patient',
        medilockerId: patient?.user?.medilockerId || 'ML-VAULT',
        bloodGroup: patient?.bloodGroup || 'Unspecified',
        allergies: patient?.baselineAllergies || 'None',
        chiefComplaint30s: ['Routine clinical evaluation', 'Medical records verified in sovereign vault'],
        redFlags: ['No acute emergency flags detected'],
        physiologicalProfile: {
          neuroMotorScore: 33,
          metabolicScore: 34,
          structuralScore: 33,
          metabolicStatus: 'Equilibrium (Sama)',
        },
        standardizedDoubleCodes: {
          namasteCode: 'NAMC-GN-01',
          namasteTerm: 'Samanya Roga',
          icd11Tm2: 'TM2: SF99 (General systemic evaluation)',
        },
        recommendedClinicalPlan: [
          'Review active medication compliance',
          'Evaluate routine laboratory reports',
          'Maintain balanced diet and adequate hydration',
        ],
      };
    }
  }

  /**
   * Real-time persistence: Save Voice Intake & Disease Prediction to PostgreSQL
   */
  static async saveIntakeToVault(userId: string, data: {
    socrates: Record<string, any>;
    predictedConditions: Array<{ conditionName: string; icdCode?: string; probability?: string }>;
    recommendedTests: Array<{ testName: string; urgency?: string; clinicalReason?: string }>;
    patientExplanation?: any;
  }) {
    const intakeId = `intake-${Date.now()}`;
    const timestamp = new Date();
    const dd = String(timestamp.getDate()).padStart(2, '0');
    const mm = String(timestamp.getMonth() + 1).padStart(2, '0');
    const yyyy = timestamp.getFullYear();

    const diagnosisList = (data.predictedConditions || []).map((c) => c.conditionName);
    const primaryComplaint = data.socrates?.site
      ? `${data.socrates.site} (${data.socrates.character || 'discomfort'})`
      : 'Clinical Symptom Intake';

    // 1. Persist intake JSON payload
    const intakeDir = path.join(process.cwd(), 'uploads', 'intake', userId);
    if (!fs.existsSync(intakeDir)) {
      fs.mkdirSync(intakeDir, { recursive: true });
    }
    const intakeFilePath = path.join(intakeDir, `${intakeId}.json`);
    const intakeRelativeUrl = `/uploads/intake/${userId}/${intakeId}.json`;
    try {
      fs.writeFileSync(intakeFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (_) {}

    // 2. Create real Medical Record
    const record = await prisma.medicalRecord.create({
      data: {
        patientId: userId,
        originalFilename: `AI_Clinical_Intake_${dd}${mm}${yyyy}.json`,
        storageKey: intakeFilePath,
        fileUrl: intakeRelativeUrl,
        mimeType: 'application/json',
        fileSizeBytes: BigInt(JSON.stringify(data).length),
        sha256Checksum: intakeId,
        documentType: 'OTHER',
        userNote: `Voice Intake: ${primaryComplaint}`,
        processingStatus: 'COMPLETED',
      },
    });

    // 2. Create real Timeline Event
    const timelineEvent = await prisma.timelineEvent.create({
      data: {
        recordId: record.id,
        patientId: userId,
        eventDateDdmmyyyy: `${dd}${mm}${yyyy}`,
        doctorName: 'Medi-AI Diagnostic Intelligence',
        clinicName: 'MediLocker Digital Vault',
        diagnoses: diagnosisList.length > 0 ? diagnosisList : ['Clinical Consultation'],
        clinicalTestsDue: data.recommendedTests || [],
        clinicalSummary: `Patient intake reported ${primaryComplaint}. Top predicted condition: ${diagnosisList[0] || 'Under review'}.`,
      },
    });

    // 3. Automatically schedule real DailyTodoItem reminders for recommended lab tests
    if (Array.isArray(data.recommendedTests) && data.recommendedTests.length > 0) {
      for (const test of data.recommendedTests) {
        await prisma.dailyTodoItem.create({
          data: {
            patientId: userId,
            scheduleDate: new Date(),
            timeSlot: 'MORNING',
            taskLabel: `⚗ Diagnostic Investigation Due: ${test.testName}`,
            isCompleted: false,
          },
        });
      }
    }

    // 4. Invalidate all user caches
    await cacheService.invalidateUserAll(userId);

    return {
      success: true,
      message: 'Intake and diagnostic investigations saved to sovereign vault successfully.',
      recordId: record.id,
      timelineEventId: timelineEvent.id,
    };
  }
}

