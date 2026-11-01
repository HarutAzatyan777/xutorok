import { z } from 'zod';
import { localizedNameSchema, optionalLocalizedTextSchema } from '../../categories/schemas/categorySchema';

export const productVariantSchema = z.object({
  id: z.string().trim().min(1, 'Variant ID is required'),
  label: z.object({
    hy: z.string().trim().max(120).optional().or(z.literal('')),
    ru: z.string().trim().max(120).optional().or(z.literal('')),
    en: z.string().trim().max(120).optional().or(z.literal('')),
  }),
  price: z.coerce
    .number()
    .min(0, 'Variant price must be 0 or greater')
    .max(100000000, 'Price exceeds maximum allowed value'),
  sortOrder: z.coerce.number().int().min(0).max(1000),
});

export const productFormSchema = z.object({
  categoryId: z.string().trim().min(1, 'Please select a category'),
  name: localizedNameSchema,
  description: optionalLocalizedTextSchema,
  price: z.coerce
    .number()
    .min(0, 'Price must be 0 or greater')
    .max(100000000, 'Price exceeds maximum allowed value'),
  currency: z.literal('AMD'),
  variants: z.array(productVariantSchema).max(20).optional(),
  imageUrl: z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),
  imagePath: z.string().trim().optional().or(z.literal('')),
  isAvailable: z.boolean(),
  isVisible: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.coerce.number().int().min(-10000).max(1000000),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

