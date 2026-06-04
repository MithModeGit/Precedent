import { z } from 'zod'

export const ImproveOutputSchema = z.object({
  notes: z
    .array(z.string())
    .describe(
      'Array of 1 to 5 plain-language observations comparing this session to recent sessions. Each note identifies a specific clause type or dimension that is trending in a particular direction, and what that trend suggests about the reference database or prompt calibration.',
    ),
})

export type ImproveOutput = z.infer<typeof ImproveOutputSchema>
