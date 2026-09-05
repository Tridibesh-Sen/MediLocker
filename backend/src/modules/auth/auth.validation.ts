import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const patientSignupSchema = z.object({
  role: z.literal(UserRole.PATIENT),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Valid phone number is required'),
  dob: z.string().optional(),
  gender: z.string().optional(),
  blood: z.string().optional(),
  govid: z.string().optional(),
  insurance: z.string().optional(),
  allergy: z.string().optional(),
  medications: z.string().optional(),
  history: z.string().optional(),
  emergency: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

export const doctorSignupSchema = z.object({
  role: z.literal(UserRole.DOCTOR),
  name: z.string().min(2, 'Doctor name is required'),
  email: z.string().email('Professional email is required'),
  phone: z.string().min(7, 'Phone number is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  registrationNumber: z.string().min(1, 'Medical registration number is required'),
  specialization: z.string().min(1, 'Specialization is required'),
  registrationDate: z.string().optional(),
  experience: z.coerce.number().optional().default(0),
  clinicName: z.string().min(1, 'Clinic/Hospital name is required'),
  clinicVerification: z.string().optional(),
  address: z.string().min(1, 'Clinic address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  verification: z.enum(['PENDING_VERIFICATION', 'VERIFIED']).optional(),
});

export const hospitalSignupSchema = z.object({
  role: z.literal(UserRole.HOSPITAL),
  name: z.string().min(2, 'Hospital name is required'),
  email: z.string().email('Official email is required'),
  phone: z.string().min(7, 'Contact number is required'),
  hospitalId: z.string().min(1, 'Hospital ID is required'),
  license: z.string().min(1, 'License number is required'),
  registrationDate: z.string().optional(),
  address: z.string().min(1, 'Hospital address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  hospitalType: z.string().optional(),
  beds: z.coerce.number().optional().default(0),
  representative: z.string().optional(),
  verification: z.enum(['PENDING_VERIFICATION', 'VERIFIED']).optional(),
  verificationRef: z.string().optional(),
});

export const signupSchema = z.discriminatedUnion('role', [
  patientSignupSchema,
  doctorSignupSchema,
  hospitalSignupSchema,
]);

export const setupMpinSchema = z.object({
  medilockerId: z.string().min(1, 'MediLocker ID is required'),
  mpin: z.string().regex(/^\d{6}$/, 'MPIN must be exactly 6 numeric digits'),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  medilockerId: z.string().min(1, 'MediLocker ID is required'),
  role: z.nativeEnum(UserRole),
  mpin: z.string().optional(),
});

export const changeMpinSchema = z.object({
  oldMpin: z.string().regex(/^\d{6}$/, 'Old MPIN must be 6 digits'),
  newMpin: z.string().regex(/^\d{6}$/, 'New MPIN must be 6 digits'),
});
