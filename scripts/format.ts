import { formatWithPrettier } from './formatWithPrettier.ts';

export async function invoke(): Promise<void> {
  await formatWithPrettier(true);
}
