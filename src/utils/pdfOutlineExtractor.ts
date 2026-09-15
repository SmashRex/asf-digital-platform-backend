import {
  scanForScriptureReferences,
  type ResolveBooksByAliasFn,
  type ScriptureRefMatch,
} from "./scriptureRefScanner.js";

export interface ExtractedOutline {
  topic: string | null;
  theme: string | null;
  subTheme: string | null;
  textRef: string | null;
  memoryVerseRef: string | null;
  memoryVerseText: string | null;
  aim: string | null;
  introduction: string | null;
  studyGuide: string[];
  discussionQuestions: string[];
  conclusion: string | null;
  prayerPoints: string[];
  scriptureReferences: ScriptureRefMatch[];
}

function stripPageArtifacts(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !/^\s*--?\s*\d+\s+of\s+\d+\s*--?\s*$/i.test(line))
    .join("\n");
}

export interface ExtractedStudy {
  lessonNumberGuess: number | null;
  extracted: ExtractedOutline;
  rawBlockText: string;
}

export interface AliasMap {
  [canonicalKey: string]: string[];
}

export type ResolveBookIdFn = (normalizedToken: string) => Promise<{ bookId: string; bookName: string } | null>;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLabelPattern(aliases: string[]): RegExp {
  const alternation = aliases.map(escapeRegex).join("|");
  return new RegExp(`^\\s*(?:${alternation})s?\\s*:?\\s*`, "i");
}

function toBulletList(block: string): string[] {
  return block
    .split(/\n+/)
    .map((line) => line.replace(/^[\d\.\-\)\s]+/, "").trim())
    .filter((line) => line.length > 0);
}
export function splitIntoStudyBlocks(
  rawText: string,
  studyMarkerAliases: string[]
): { lessonNumberGuess: number | null; text: string }[] {
  const lines = rawText.split(/\r?\n/);
  const markerPattern = new RegExp(`^\\s*(?:${studyMarkerAliases.map(escapeRegex).join("|")})\\s+(\\d+)\\b`, "i");

  const boundaries: { lineIndex: number; lessonNumber: number }[] = [];
  lines.forEach((line, index) => {
    const match = line.match(markerPattern);
    if (match) {
      boundaries.push({ lineIndex: index, lessonNumber: parseInt(match[1], 10) });
    }
  });

  if (boundaries.length === 0) {
    return [{ lessonNumberGuess: null, text: rawText }];
  }

  const blocks: { lessonNumberGuess: number | null; text: string }[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i].lineIndex;
    const end = i + 1 < boundaries.length ? boundaries[i + 1].lineIndex : lines.length;
    blocks.push({ lessonNumberGuess: boundaries[i].lessonNumber, text: lines.slice(start, end).join("\n") });
  }
  return blocks;
}

export async function extractOutlineFromBlock(
  blockText: string,
  aliasMap: AliasMap,
  resolveBookId: ResolveBookIdFn,
  resolveBooksByAlias?: ResolveBooksByAliasFn
): Promise<ExtractedOutline> {
  const sectionKeys: (keyof Omit<ExtractedOutline, "scriptureReferences" | "memoryVerseText">)[] = [
    "topic", "theme", "subTheme", "textRef", "memoryVerseRef", "aim", "introduction",
    "studyGuide", "discussionQuestions", "conclusion", "prayerPoints",
  ];

  const lines = blockText.split(/\r?\n/);
  const markerPositions: { key: (typeof sectionKeys)[number]; lineIndex: number }[] = [];

  lines.forEach((line, index) => {
    for (const key of sectionKeys) {
      const aliases = aliasMap[key];
      if (!aliases || aliases.length === 0) continue;
      if (buildLabelPattern(aliases).test(line)) {
        markerPositions.push({ key, lineIndex: index });
        break;
      }
    }
  });

  markerPositions.sort((a, b) => a.lineIndex - b.lineIndex);

  const result: ExtractedOutline = {
    topic: null, theme: null, subTheme: null, textRef: null, memoryVerseRef: null, memoryVerseText: null,
    aim: null, introduction: null, studyGuide: [], discussionQuestions: [], conclusion: null,
    prayerPoints: [], scriptureReferences: [],
  };

  for (let i = 0; i < markerPositions.length; i++) {
    const current = markerPositions[i];
    const next = markerPositions[i + 1];
    const startLine = current.lineIndex;
    const endLine = next ? next.lineIndex : lines.length;

    const blockLines = [...lines.slice(startLine, endLine)];
    const labelPattern = buildLabelPattern(aliasMap[current.key]);
    blockLines[0] = blockLines[0].replace(labelPattern, "");
    const block = blockLines.join("\n").trim();

    if (current.key === "studyGuide" || current.key === "discussionQuestions" || current.key === "prayerPoints") {
      result[current.key] = toBulletList(block);
    } else {
      (result[current.key] as string | null) = block || null;
    }
  }

  if (result.memoryVerseRef) {
    const parts = result.memoryVerseRef.split("\n");
    result.memoryVerseRef = parts[0]?.trim() || null;
    result.memoryVerseText = parts.slice(1).join(" ").trim() || null;
  }

const allRefs = await scanForScriptureReferences(blockText, resolveBookId, resolveBooksByAlias);
const seen = new Set<string>();
result.scriptureReferences = allRefs.filter((ref) => {
  const key = ref.bookId
    ? `${ref.bookId}|${ref.chapter}|${ref.verseStart}|${ref.verseEnd}`
    : `unrecognized|${ref.raw.toLowerCase().replace(/\s+/g, " ")}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

  return result;
}

export async function extractAllStudies(
  rawText: string,
  aliasMap: AliasMap,
  resolveBookId: ResolveBookIdFn,
  resolveBooksByAlias?: ResolveBooksByAliasFn
): Promise<ExtractedStudy[]> {
  const cleanedText = stripPageArtifacts(rawText);
  const studyMarkerAliases = aliasMap.studyMarker ?? ["Study", "Lesson"];
  const blocks = splitIntoStudyBlocks(cleanedText, studyMarkerAliases);

  const studies: ExtractedStudy[] = [];
  for (const block of blocks) {
    const extracted = await extractOutlineFromBlock(block.text, aliasMap, resolveBookId, resolveBooksByAlias);
    studies.push({ lessonNumberGuess: block.lessonNumberGuess, extracted, rawBlockText: block.text });
  }
  return studies;
}