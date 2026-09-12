import fs from "node:fs";
import { parseBibleFile } from "./bibleParsers.js";

function main() {
  const [filePath] = process.argv.slice(2);

  if (!filePath) {
    console.error("Usage: tsx verifyBibleFile.ts <FILE_PATH>");
    process.exit(1);
  }

  console.log(`Reading ${filePath}...`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  console.log("Detecting format and parsing...");
  const verses = parseBibleFile(data);
  console.log(`Parsed ${verses.length} total verses.\n`);

  const referenceChecks = [
    { book: "John", chapter: 3, verse: 3 },
    { book: "John", chapter: 3, verse: 16 },
    { book: "Genesis", chapter: 1, verse: 1 },
    { book: "Psalm", chapter: 23, verse: 1 }, // note: some files say "Psalm", others "Psalms" — informational only
  ];

  console.log("Spot-check these against a known copy of the translation before importing:\n");

  for (const ref of referenceChecks) {
    const match = verses.find(
      (v) => v.bookName.toLowerCase().replace(/s$/, "") === ref.book.toLowerCase().replace(/s$/, "") &&
        v.chapter === ref.chapter &&
        v.verse === ref.verse
    );
    if (match) {
      console.log(`${ref.book} ${ref.chapter}:${ref.verse} (as "${match.bookName}")`);
      console.log(`  "${match.text}"\n`);
    } else {
      console.log(`${ref.book} ${ref.chapter}:${ref.verse} — not found (book name mismatch is common, not necessarily an error)\n`);
    }
  }

  console.log("Compare the wording above against a source you trust (biblegateway.com, biblehub.com, etc.)");
  console.log("    for the translation you THINK this file is, before running bibleSeed.ts with any translation ID.");
}

main();