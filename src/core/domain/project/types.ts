import { z } from "zod/v4";
import { paginationSchema } from "@/lib/pagination";

export const projectIdSchema = z
  .string()
  .min(1)
  .refine((val) => val.trim().length > 0 && val === val.trim(), {
    message:
      "ID cannot be empty, whitespace only, or have leading/trailing whitespace",
  })
  .brand("projectId");
export type ProjectId = z.infer<typeof projectIdSchema>;

export const projectSchema = z.object({
  id: projectIdSchema,
  name: z.string(),
  path: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectParamsSchema = z.object({
  name: z
    .string()
    .min(1)
    .refine((val) => val.trim().length > 0, {
      message: "Name cannot be empty or whitespace only",
    }),
  path: z
    .string()
    .min(1)
    .refine((val) => val.trim().length > 0, {
      message: "Path cannot be empty or whitespace only",
    }),
});
export type CreateProjectParams = z.infer<typeof createProjectParamsSchema>;

export const updateProjectParamsSchema = z.object({
  id: projectIdSchema,
  name: z.string().optional(),
  path: z.string().optional(),
});
export type UpdateProjectParams = z.infer<typeof updateProjectParamsSchema>;

export const listProjectQuerySchema = z.object({
  pagination: paginationSchema,
  filter: z
    .object({
      name: z.string().optional(),
      path: z.string().optional(),
    })
    .optional(),
});
export type ListProjectQuery = z.infer<typeof listProjectQuerySchema>;
