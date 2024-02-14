import { ZodIssue } from "$schemas/deps.ts";

export const getDisplayMessage = (errors: ZodIssue[]) => {
  return errors.map((error) => error.message).join(". ");
};
