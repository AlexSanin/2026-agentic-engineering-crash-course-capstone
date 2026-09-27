/**
 * The largest file that the page reads. It is higher than the 100 KB that the transform accepts,
 * because a `.docx` file is compressed, and its markdown is much smaller than the file.
 */
export const MAX_FILE_BYTES = 1024 * 1024;

/** The conversion path for a file, or the reason the page refuses it. Call it before the file is read. */
export function importKind(name: string, size: number): { kind: "markdown" | "html" | "docx" } | { error: string } {
  const kind = /\.(md|markdown|txt)$/i.test(name)
    ? "markdown"
    : /\.html$/i.test(name)
      ? "html"
      : /\.docx$/i.test(name)
        ? "docx"
        : undefined;
  if (!kind) return { error: "Open a .md, .markdown, .txt, .html or .docx file." };
  if (size > MAX_FILE_BYTES) return { error: "The file is over the 1 MB limit." };
  return { kind };
}
