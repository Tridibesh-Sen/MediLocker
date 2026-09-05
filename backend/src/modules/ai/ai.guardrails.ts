export interface PatientClinicalContext {
  fullName?: string;
  isPregnant?: boolean;
  recentAlcohol?: boolean;
  knownAllergies?: string[];
  chronicConditions?: string[];
  homeSupplies?: Array<{ name: string; activeSalt?: string; quantity: number }>;
}

export interface DrugCandidate {
  name: string;
  activeSalt: string;
  isNsaid?: boolean;
  sedativeProperty?: boolean;
}

export class ClinicalGuardrails {
  private static emergencyKeywords = [
    'chest pain',
    'heart attack',
    'left arm pain',
    'shortness of breath',
    'cannot breathe',
    'face droop',
    'slurred speech',
    'stroke',
    'unconscious',
    'coughing blood',
    'severe allergic reaction',
    'anaphylaxis',
    'swelling of throat',
  ];

  /**
   * Evaluates prompt for life-threatening emergency signs
   */
  static isEmergency(userQuery: string): boolean {
    const lower = userQuery.toLowerCase();
    return this.emergencyKeywords.some((keyword) => lower.includes(keyword));
  }

  /**
   * Returns standardized emergency response
   */
  static getEmergencyResponse(): string {
    return `⚠️ EMERGENCY ALERT: Your symptoms may indicate an acute medical emergency. 
Please contact emergency medical services immediately (Dial 112 or 108 in India / 911) or proceed to the nearest hospital emergency room without delay. Medi-AI cannot triage life-threatening conditions.`;
  }

  /**
   * Cross-references home medicine candidate against patient history
   */
  static checkSafety(patient: PatientClinicalContext, drug: DrugCandidate): { safe: boolean; reason?: string } {
    // 1. Pregnancy check
    if (patient.isPregnant && drug.isNsaid) {
      return {
        safe: false,
        reason: `CONTRAINDICATION: NSAIDs (like ${drug.name}) should be avoided during pregnancy due to fetal risk.`,
      };
    }

    // 2. Alcohol interaction
    if (patient.recentAlcohol && drug.sedativeProperty) {
      return {
        safe: false,
        reason: `CONTRAINDICATION: Combining ${drug.name} with alcohol increases the risk of severe central nervous system depression.`,
      };
    }

    // 3. Documented Allergies
    if (patient.knownAllergies && patient.knownAllergies.length > 0) {
      const allergyMatch = patient.knownAllergies.find((allergy) =>
        drug.activeSalt.toLowerCase().includes(allergy.toLowerCase()) ||
        drug.name.toLowerCase().includes(allergy.toLowerCase())
      );
      if (allergyMatch) {
        return {
          safe: false,
          reason: `CONTRAINDICATION: You have a documented allergy to ${allergyMatch}. Do not consume ${drug.name}.`,
        };
      }
    }

    return { safe: true };
  }
}
