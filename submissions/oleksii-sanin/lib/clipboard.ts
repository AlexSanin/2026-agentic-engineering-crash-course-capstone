/**
 * Copy `text`, and report the outcome instead of a rejection. A refused permission rejects, and
 * a browser with no clipboard API passes `undefined`.
 *
 * With `html`, the copy is rich text: one clipboard item with a `text/html` entry and a
 * `text/plain` entry. Google Docs, Word and Gmail paste the HTML. A plain text field pastes `text`.
 * A browser with no `ClipboardItem` throws inside the `try`, so it reports failed too.
 */
export async function copy(
  text: string,
  clipboard: { writeText(text: string): Promise<void>; write?(items: ClipboardItem[]): Promise<void> } | undefined,
  html?: string,
): Promise<"copied" | "failed"> {
  if (!clipboard) return "failed";
  try {
    if (html === undefined) {
      await clipboard.writeText(text);
    } else {
      if (!clipboard.write) return "failed";
      const blob = (value: string, type: string) => new Blob([value], { type });
      await clipboard.write([
        new ClipboardItem({ "text/html": blob(html, "text/html"), "text/plain": blob(text, "text/plain") }),
      ]);
    }
    return "copied";
  } catch {
    return "failed";
  }
}
