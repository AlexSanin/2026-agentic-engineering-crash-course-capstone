/**
 * Copy `text`, and report the outcome instead of a rejection. A refused permission rejects, and
 * a browser with no clipboard API passes `undefined`.
 */
export async function copy(
  text: string,
  clipboard: { writeText(text: string): Promise<void> } | undefined,
): Promise<"copied" | "failed"> {
  if (!clipboard) return "failed";
  try {
    await clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
