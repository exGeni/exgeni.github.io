const { test } = require("node:test");
const assert = require("node:assert");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const booth = path.join(root, "targi-pracy", "orlen");

test("every booth style has a label, an emoji and a prompt", () => {
  const styles = JSON.parse(fs.readFileSync(path.join(booth, "styles.json"), "utf8"));
  assert.ok(Object.keys(styles).length > 0);
  for (const [key, s] of Object.entries(styles)) {
    assert.match(key, /^[a-z]+$/);
    for (const field of ["label", "emoji", "prompt"]) assert.ok(s[field], `${key}.${field}`);
  }
});

const php = spawnSync("php", ["-v"]).status === 0;
test("api.php parses", { skip: !php && "php not installed" }, () => {
  execFileSync("php", ["-l", path.join(booth, "api.php")], { stdio: "pipe" });
});

// The page is on GitHub Pages and api.php on the PHP hosting: every API call goes to the hosting.
test("the booth page calls api.php on exgenius.pro, never a relative api.php", () => {
  const page = fs.readFileSync(path.join(booth, "index.html"), "utf8");
  assert.match(page, /const API = "https:\/\/exgenius\.pro\/targi-pracy\/orlen\/api\.php";/);
  assert.doesNotMatch(page, /["']api\.php/);
  assert.match(page, /new URL\(s\.img, API\)/, "the result image resolves against the API");
  assert.match(page, /href="https:\/\/exgenius\.pro\/privacy\/"/, "the privacy page stays on exgenius.pro");
});

test("the old addresses on the hosting redirect to GitHub Pages, api.php excepted", () => {
  const read = (f) => fs.readFileSync(path.join(root, "hosting", f), "utf8");
  assert.match(read("orlen.htaccess"), /^RewriteRule !\^api\\\.php\$ https:\/\/exgeni\.github\.io\/targi-pracy\/orlen\/ \[R=301,L\]$/m);
  assert.match(read("cv.htaccess"), /^RewriteRule \^ https:\/\/exgeni\.github\.io\/cv\/ \[R=301,L\]$/m);
});
