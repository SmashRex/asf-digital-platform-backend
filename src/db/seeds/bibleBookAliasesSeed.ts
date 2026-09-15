import { db, pool } from "../index.js";
import { bibleBookAliases } from "../schema/index.js";

// Format: [bookId, [aliases...]] — aliases stored lowercase, no periods, ordinals as digits (not Roman numerals)
const aliasData: [string, string[]][] = [
  ["genesis", ["gen", "ge", "gn"]],
  ["exodus", ["exod", "ex", "exo"]],
  ["leviticus", ["lev", "le", "lv"]],
  ["numbers", ["num", "nu", "nm", "nb"]],
  ["deuteronomy", ["deut", "de", "dt"]],
  ["joshua", ["josh", "jos", "jsh"]],
  ["judges", ["judg", "jdg", "jg", "jdgs"]],
  ["ruth", ["rth", "ru"]],
  ["1-samuel", ["1 sam", "1sa", "1 sm", "1sam"]],
  ["2-samuel", ["2 sam", "2sa", "2 sm", "2sam"]],
  ["1-kings", ["1 ki", "1kgs", "1 kgs", "1kin"]],
  ["2-kings", ["2 ki", "2kgs", "2 kgs", "2kin"]],
  ["1-chronicles", ["1 chr", "1ch", "1 chron"]],
  ["2-chronicles", ["2 chr", "2ch", "2 chron"]],
  ["ezra", ["ezr"]],
  ["nehemiah", ["neh", "ne"]],
  ["esther", ["esth", "est", "es"]],
  ["job", ["jb"]],
  ["psalms", ["ps", "psa", "psalm", "pslm"]],
  ["proverbs", ["prov", "pro", "prv"]],
  ["ecclesiastes", ["eccl", "ecc", "qoh"]],
  ["song-of-solomon", ["song", "sos", "sng", "canticles"]],
  ["isaiah", ["isa", "is"]],
  ["jeremiah", ["jer", "je"]],
  ["lamentations", ["lam", "la"]],
  ["ezekiel", ["ezek", "eze", "ezk"]],
  ["daniel", ["dan", "da", "dn"]],
  ["hosea", ["hos", "ho"]],
  ["joel", ["jl"]],
  ["amos", ["am"]],
  ["obadiah", ["obad", "ob"]],
  ["jonah", ["jon"]],
  ["micah", ["mic", "mc"]],
  ["nahum", ["nah", "na"]],
  ["habakkuk", ["hab", "hb"]],
  ["zephaniah", ["zeph", "zep", "zp"]],
  ["haggai", ["hag", "hg"]],
  ["zechariah", ["zech", "zec", "zc"]],
  ["malachi", ["mal", "ml"]],
  ["matthew", ["matt", "mat", "mt"]],
  ["mark", ["mrk", "mk", "mr"]],
  ["luke", ["luk", "lk"]],
  ["john", ["jn", "jhn", "joh"]],
  ["acts", ["act", "ac"]],
  ["romans", ["rom", "ro", "rm"]],
  ["1-corinthians", ["1 cor", "1co", "1 co"]],
  ["2-corinthians", ["2 cor", "2co", "2 co"]],
  ["galatians", ["gal", "ga"]],
  ["ephesians", ["eph", "ephes"]],
  ["philippians", ["phil", "php", "pp"]],
  ["colossians", ["col", "co"]],
  ["1-thessalonians", ["1 thess", "1th", "1 the"]],
  ["2-thessalonians", ["2 thess", "2th", "2 the"]],
  ["1-timothy", ["1 tim", "1ti", "1 tm"]],
  ["2-timothy", ["2 tim", "2ti", "2 tm"]],
  ["titus", ["tit", "ti"]],
  ["philemon", ["philem", "phm", "pm"]],
  ["hebrews", ["heb"]],
  ["james", ["jas", "jm"]],
  ["1-peter", ["1 pet", "1pe", "1 pt"]],
  ["2-peter", ["2 pet", "2pe", "2 pt"]],
  ["1-john", ["1 jn", "1jo", "1joh"]],
  ["2-john", ["2 jn", "2jo", "2joh"]],
  ["3-john", ["3 jn", "3jo", "3joh"]],
  ["jude", ["jud", "jd"]],
  ["revelation", ["rev", "re", "rv"]],
];

async function seedBookAliases() {
  console.log("Seeding book abbreviation aliases...");
  const rows = aliasData.flatMap(([bookId, aliases]) => aliases.map((alias) => ({ bookId, alias })));
  await db.insert(bibleBookAliases).values(rows).onConflictDoNothing();
  console.log(`Seeded ${rows.length} book aliases.`);
  await pool.end();
}

seedBookAliases().catch((err) => {
  console.error("Failed to seed book aliases:", err);
  process.exit(1);
});