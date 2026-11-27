const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const cv = fs.readFileSync(path.join(__dirname, "..", "cv", "index.html"), "utf8");

// Owner decision (2026-10-22): the CV shows the owner's own phone and ceo@; nothing else.
test("the CV page publishes only the public contact routes", () => {
  const links = [...cv.matchAll(/href="((?:tel|mailto):[^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(links)].sort(), ["mailto:ceo@exgenius.pro", "tel:+48571075533"]);
  const phones = (cv.replace(/[\s.\-()]/g, "").match(/\+?\d{9,}/g) || []).filter((d) => !/^\d{4}$/.test(d));
  for (const p of phones) assert.match(p, /^\+?(48)?571075533$/, "unexpected number " + p);
  const emails = new Set(cv.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g));
  assert.deepEqual([...emails], ["ceo@exgenius.pro"], "every e-mail on the page, linked or shown");
});

test("the booth page links to the CV and LinkedIn", () => {
  const booth = fs.readFileSync(path.join(__dirname, "..", "targi-pracy", "orlen", "index.html"), "utf8");
  assert.match(booth, /href="\/cv\/"/);
  assert.match(booth, /linkedin\.com\/in\/evgenii-lopatin/);
});
