import { z } from 'zod';

export const localizedNameSchema = z.object({
  hy: z
    .string()
    .trim()
    .min(1, 'Armenian name is required')
    .max(200, 'Name must be at most 200 characters'),
  ru: z
    .string()
    .trim()
    .min(1, 'Russian name is required')
    .max(200, 'Name must be at most 200 characters'),
  en: z
    .string()
    .trim()
    .min(1, 'English name is required')
    .max(200, 'Name must be at most 200 characters'),
});

export const optionalLocalizedTextSchema = z
  .object({
    hy: z.string().trim().max(2000).optional().or(z.literal('')),
    ru: z.string().trim().max(2000).optional().or(z.literal('')),
    en: z.string().trim().max(2000).optional().or(z.literal('')),
  })
  .optional();

export const categoryFormSchema = z.object({
  name: localizedNameSchema,
  description: optionalLocalizedTextSchema,
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(120, 'Slug must be at most 120 characters')
    .regex(/^[a-z0-9\u0530-\u058f\u0400-\u04ff-]+$/, 'Slug may only contain letters, numbers, and hyphens'),
  sortOrder: z.coerce
    .number()
    .int('Sort order must be an integer')
    .min(-10000)
    .max(1000000),
  isVisible: z.boolean(),
  imageUrl: z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),
  imagePath: z.string().trim().optional().or(z.literal('')),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

