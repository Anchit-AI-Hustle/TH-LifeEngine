import { z } from 'zod';

export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().min(1).max(120),
  gender: z.enum(['male', 'female', 'other']),
  goals: z.array(z.string()),
  healthConcerns: z.string(),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
  preferredTime: z.enum(['morning', 'evening', 'flexible']),
  subscriptionType: z.enum(['quarterly', 'annual', 'custom']),
});

export const IntakeSchema = z.object({
  profileId: z.string(),
  primaryPlanType: z.string(),
  secondaryPlanType: z.string().optional(),
  startDate: z.string(), // ISO date
  endDate: z.string(), // ISO date
  preferences: z.record(z.string(), z.any()), // flexible object for preferences
});

export const PlanSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  intakeId: z.string(),
  days: z.array(z.object({
    date: z.string(), // ISO date
    activities: z.array(z.object({
      type: z.string(),
      name: z.string(),
      duration: z.number(), // minutes
      description: z.string(),
    })),
    meals: z.array(z.object({
      type: z.string(),
      name: z.string(),
      calories: z.number(),
      description: z.string(),
    })),
  })),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Intake = z.infer<typeof IntakeSchema>;
export type Plan = z.infer<typeof PlanSchema>;
