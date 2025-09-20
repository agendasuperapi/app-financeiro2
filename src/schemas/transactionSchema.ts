
import { z } from 'zod';

export const createTransactionSchema = (translationFn: (key: string) => string) => {
  return z.object({
    type: z.enum(['income', 'expense', 'reminder', 'lembrete', 'outros']),
    amount: z.coerce.number().refine((val) => val !== 0, translationFn('validation.required')),
    conta: z.string().min(1, translationFn('validation.required')),
    category: z.string().min(1, translationFn('validation.required')),
    description: z.string().optional(),
    date: z.string().min(1, translationFn('validation.required')),
    goalId: z.union([z.string().min(1), z.literal("none"), z.null(), z.undefined()]).optional(),
    name: z.string().min(1, translationFn('validation.required')).optional(),
  });
};

export type TransactionFormValues = z.infer<ReturnType<typeof createTransactionSchema>>;
