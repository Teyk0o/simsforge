/**
 * Script to dynamically update the coverage badge in the root README.
 * Reads Jest coverage-summary.json and updates the shields.io badge URL.
 *
 * Badge format:
 * https://img.shields.io/badge/{TEXT}-{HEX-COLOR}?style=for-the-badge&logo=jest&logoColor=white
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_PATH = path.resolve(__dirname, '../coverage/coverage-summary.json');
const README_PATH = path.resolve(__dirname, '../../README.md');

/** Jest brand color */
const JEST_COLOR = 'C21325';

/**
 * Read coverage summary and compute overall line coverage
 * @returns {number} Coverage percentage
 */
function getCoverage() {
  if (!fs.existsSync(COVERAGE_PATH)) {
    console.error('Coverage summary not found. Run "npm test" first.');
    process.exit(1);
  }

  const summary = JSON.parse(fs.readFileSync(COVERAGE_PATH, 'utf-8'));
  return summary.total.lines.pct;
}

/**
 * Update the badge in the README file
 * @param {number} pct - Coverage percentage
 */
function updateReadme(pct) {
  if (!fs.existsSync(README_PATH)) {
    console.error('README.md not found at project root.');
    process.exit(1);
  }

  const text = `Coverage_${pct}${encodeURIComponent('%')}`;
  const badgeUrl = `https://img.shields.io/badge/${text}-${JEST_COLOR}?style=for-the-badge&logo=jest&logoColor=white`;

  let readme = fs.readFileSync(README_PATH, 'utf-8');

  // Replace existing backend coverage badge
  const badgeRegex = /!\[Backend Coverage\]\(https:\/\/img\.shields\.io\/badge\/[^)]+\)/;

  if (badgeRegex.test(readme)) {
    readme = readme.replace(badgeRegex, `![Backend Coverage](${badgeUrl})`);
  } else {
    console.error('Coverage badge placeholder not found in README.');
    process.exit(1);
  }

  fs.writeFileSync(README_PATH, readme, 'utf-8');
  console.log(`Badge updated: ${pct}% (color: #${JEST_COLOR})`);
}

const pct = getCoverage();
updateReadme(pct);
