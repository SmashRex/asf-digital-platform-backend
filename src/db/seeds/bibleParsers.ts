export interface ParsedVerse {
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

// Small shared helper — used by every parser below. Fails loudly instead of
// silently turning a missing/malformed value into the string "undefined",
// which would otherwise get stored as real verse text without anyone noticing.
function toVerseText(value: unknown, context: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Malformed verse text at ${context}: expected a non-empty string, got ${JSON.stringify(value)}`);
  }
  return value;
}

function toVerseNumber(value: unknown, context: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Malformed number at ${context}: expected a positive integer, got ${JSON.stringify(value)}`);
  }
  return n;
}

// Shape A: { translation: "...", books: [{ name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }
function parseNestedArrayFormat(data: any): ParsedVerse[] | null {
  if (!Array.isArray(data.books)) return null;

  const result: ParsedVerse[] = [];
  for (const book of data.books) {
    if (!book.name || !Array.isArray(book.chapters)) return null;

    for (const chapter of book.chapters) {
      if (!Array.isArray(chapter.verses)) return null;

      for (const verse of chapter.verses) {
        result.push({
          bookName: book.name,
          chapter: toVerseNumber(chapter.chapter, `${book.name} chapter`),
          verse: toVerseNumber(verse.verse, `${book.name} ${chapter.chapter}:?`),
          text: toVerseText(verse.text, `${book.name} ${chapter.chapter}:${verse.verse}`),
        });
      }
    }
  }
  return result;
}

// Shape B: { "Genesis": { "1": { "1": "text", "2": "text" } }, "Exodus": {...} }
function parseFlatObjectFormat(data: any): ParsedVerse[] | null {
  if (Array.isArray(data) || typeof data !== "object" || data === null || data.books) return null;

  const keys = Object.keys(data);
  if (keys.length === 0) return null;

  const firstValue = data[keys[0]];
  if (typeof firstValue !== "object" || firstValue === null || Array.isArray(firstValue)) return null;

  const result: ParsedVerse[] = [];
  for (const [bookName, chapters] of Object.entries<any>(data)) {
    for (const [chapterNumStr, verses] of Object.entries<any>(chapters)) {
      const chapter = toVerseNumber(chapterNumStr, `${bookName} chapter`);
      for (const [verseNumStr, text] of Object.entries<any>(verses)) {
        result.push({
          bookName,
          chapter,
          verse: toVerseNumber(verseNumStr, `${bookName} ${chapter}:?`),
          text: toVerseText(text, `${bookName} ${chapter}:${verseNumStr}`),
        });
      }
    }
  }
  return result;
}

// Shape C: [{ book: "Genesis", chapters: [{ chapter: "1", verses: [{ verse: "1", text: "..." }] }] }]
function parseBookArrayFormat(data: any): ParsedVerse[] | null {
  if (!Array.isArray(data) || data.length === 0) return null;

  for (const book of data) {
    if (typeof book !== "object" || book === null || typeof book.book !== "string" || !Array.isArray(book.chapters)) {
      return null;
    }
  }

  const result: ParsedVerse[] = [];
  for (const book of data) {
    for (const chapter of book.chapters) {
      if (!Array.isArray(chapter.verses)) return null;

      for (const verse of chapter.verses) {
        result.push({
          bookName: book.book,
          chapter: toVerseNumber(chapter.chapter, `${book.book} chapter`),
          verse: toVerseNumber(verse.verse, `${book.book} ${chapter.chapter}:?`),
          text: toVerseText(verse.text, `${book.book} ${chapter.chapter}:${verse.verse}`),
        });
      }
    }
  }
  return result;
}

// Shape D: flat array of individual verse records — scrollmapper's actual raw
// export shape for some translations: [{ book_name: "Genesis", chapter: 1, verse: 1, text: "..." }, ...]
function parseFlatVerseListFormat(data: any): ParsedVerse[] | null {
  if (!Array.isArray(data) || data.length === 0) return null;

  const first = data[0];
  if (
    typeof first !== "object" ||
    first === null ||
    Array.isArray(first) ||
    typeof (first.book_name ?? first.book) !== "string" ||
    first.chapter === undefined ||
    first.verse === undefined ||
    first.text === undefined
  ) {
    return null;
  }

  const result: ParsedVerse[] = [];
  for (const row of data) {
    const bookName = row.book_name ?? row.book;
    result.push({
      bookName,
      chapter: toVerseNumber(row.chapter, `${bookName} chapter`),
      verse: toVerseNumber(row.verse, `${bookName} ${row.chapter}:?`),
      text: toVerseText(row.text, `${bookName} ${row.chapter}:${row.verse}`),
    });
  }
  return result;
}

// Shape E: flat object keyed by reference string — { "Genesis 1:1": "text", "Genesis 1:2": "text" }
function parseReferenceKeyFormat(data: any): ParsedVerse[] | null {
  if (Array.isArray(data) || typeof data !== "object" || data === null) return null;

  const keys = Object.keys(data);
  if (keys.length === 0) return null;

  const referencePattern = /^(.+?)\s+(\d+):(\d+)$/;
  if (!referencePattern.test(keys[0])) return null;

  const result: ParsedVerse[] = [];
  for (const [key, text] of Object.entries<any>(data)) {
    const match = key.match(referencePattern);
    if (!match) {
      throw new Error(`Reference key "${key}" doesn't match the expected "Book Chapter:Verse" pattern`);
    }
    const [, bookName, chapterStr, verseStr] = match;
    result.push({
      bookName,
      chapter: toVerseNumber(chapterStr, `${key} chapter`),
      verse: toVerseNumber(verseStr, `${key} verse`),
      text: toVerseText(text, key),
    });
  }
  return result;
}

const knownFormats = [
  parseNestedArrayFormat,
  parseFlatObjectFormat,
  parseBookArrayFormat,
  parseFlatVerseListFormat,
  parseReferenceKeyFormat,
];

export function parseBibleFile(data: any): ParsedVerse[] {
  for (const parser of knownFormats) {
    const result = parser(data);
    if (result) return result;
  }
  throw new Error(
    "Unrecognized Bible file format. None of the known parsers matched this file's structure. " +
      "You'll need to add a new parser function to bibleParsers.ts for this shape."
  );
}