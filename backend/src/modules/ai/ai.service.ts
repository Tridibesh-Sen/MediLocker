import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { ClinicalGuardrails, PatientClinicalContext } from './ai.guardrails';

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
  private static apiKeys = [env.MISTRAL_API_KEY, env.MISTRAL_API_KEY_2].filter(Boolean);
  private static currentKeyIndex = 0;
  private static apiUrl = 'https://api.mistral.ai/v1';

  private static get apiKey(): string | undefined {
    return this.apiKeys[0];
  }

  private static getActiveKeys(): string[] {
    return this.apiKeys.length > 0 ? this.apiKeys : [];
  }

  private static async runMistralOcr(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const keys = this.getActiveKeys();
    if (keys.length === 0) throw new Error('No Mistral API keys configured');

    const isPdf = mimeType === 'application/pdf';
    const base64 = fileBuffer.toString('base64');
    const docPayload = isPdf
      ? { type: 'document_url', document_url: `data:application/pdf;base64,${base64}` }
      : { type: 'image_url', image_url: `data:${mimeType || 'image/jpeg'};base64,${base64}` };

    let lastError: any = null;
    const startIndex = this.currentKeyIndex % keys.length;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % keys.length;

    for (let i = 0; i < keys.length; i++) {
      const keyIdx = (startIndex + i) % keys.length;
      const key = keys[keyIdx];
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
          throw new Error(`Mistral OCR key ${keyIdx + 1} status ${res.status}: ${errText}`);
        }

        const data = (await res.json()) as any;
        const pages = data.pages || [];
        return pages.map((p: any) => p.markdown || '').join('\n\n').trim();
      } catch (err: any) {
        lastError = err;
        logger.warn(`Mistral OCR key ${keyIdx + 1} failed, attempting failover key:`, err?.message);
      }
    }

    throw lastError || new Error('All Mistral OCR keys failed');
  }

  private static async runMistralChat(messages: Array<{ role: string; content: string }>, jsonFormat: boolean = false): Promise<string> {
    const keys = this.getActiveKeys();
    if (keys.length === 0) throw new Error('No Mistral API keys configured');

    const body: any = {
      model: 'ministral-8b-latest',
      messages,
    };
    if (jsonFormat) {
      body.response_format = { type: 'json_object' };
    }

    let lastError: any = null;
    const startIndex = this.currentKeyIndex % keys.length;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % keys.length;

    for (let i = 0; i < keys.length; i++) {
      const keyIdx = (startIndex + i) % keys.length;
      const key = keys[keyIdx];
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
          throw new Error(`Mistral chat key ${keyIdx + 1} status ${res.status}: ${errText}`);
        }

        const data = (await res.json()) as any;
        return data.choices?.[0]?.message?.content?.trim() || '';
      } catch (err: any) {
        lastError = err;
        logger.warn(`Mistral chat key ${keyIdx + 1} failed, attempting failover key:`, err?.message);
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
}
