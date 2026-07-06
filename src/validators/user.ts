import { z } from "zod";

export const walkInSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(1, "Age is required").max(150, "Invalid age"),
  genderId: z.number().min(1, "Gender is required"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  image: z.string().url().nullable().optional(),
  age: z.number().min(1).max(150).optional(),
  genderId: z.number().min(1).optional(),
});

export type WalkInFormData = z.infer<typeof walkInSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
