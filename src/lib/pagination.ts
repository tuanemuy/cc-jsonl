import { z } from "zod/v4";

export const dbOrderSchema = z.enum(["asc", "desc"]);
export type DBOrder = z.infer<typeof dbOrderSchema>;

export function stringToDBOrder(str: string): DBOrder | undefined {
  switch (str) {
    case "asc":
      return dbOrderSchema.enum.asc;
    case "desc":
      return dbOrderSchema.enum.desc;
    default:
      return undefined;
  }
}

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  order: dbOrderSchema,
  orderBy: z.string(),
});
export type Pagination = z.infer<typeof paginationSchema>;
