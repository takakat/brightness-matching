import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const defaultOutputRoot = path.resolve(projectRoot, "..", "..", "online-experiment-public");
const outputRoot = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : defaultOutputRoot;

const filesToCopy = [
  ".gitignore",
  ".nojekyll",
  "README.md",
  "TEST_PRODUCTION.md",
  "app.js",
  "index.html",
  "package-lock.json",
  "package.json",
  "preview-urls.md",
  "runtime-config.js",
  "server.js",
  "specification.md",
  "styles.css",
  "test-production.js",
];

const directoriesToCopy = [
  "assets",
  "config",
  "logic",
  "pages",
  "scripts",
  "tests",
];

function ensureOutputIsOutsideProject() {
  const relativeOutputPath = path.relative(projectRoot, outputRoot);
  const isInsideProject =
    relativeOutputPath === "" ||
    (!relativeOutputPath.startsWith("..") && !path.isAbsolute(relativeOutputPath));

  if (isInsideProject) {
    throw new Error("Choose an output directory outside online-experiment.");
  }
}

async function resetOutputDirectory() {
  await fs.rm(outputRoot, { force: true, recursive: true });
  await fs.mkdir(outputRoot, { recursive: true });
}

async function copyFile(relativePath) {
  const sourcePath = path.join(projectRoot, relativePath);
  const destinationPath = path.join(outputRoot, relativePath);

  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
}

async function copyDirectory(relativePath) {
  const sourcePath = path.join(projectRoot, relativePath);
  const destinationPath = path.join(outputRoot, relativePath);

  await fs.cp(sourcePath, destinationPath, {
    force: true,
    recursive: true,
  });
}

async function writeExportSummary() {
  const summaryPath = path.join(outputRoot, "EXPORT_SUMMARY.md");
  const lines = [
    "# Standalone Export",
    "",
    `Source: ${projectRoot}`,
    `Exported: ${new Date().toISOString()}`,
    "",
    "This directory is intended to become a separate Git repository.",
    "",
    "Suggested next steps:",
    "",
    "1. cd into this directory",
    "2. review runtime-config.js",
    "3. run npm install",
    "4. run npm run test:smoke",
    "5. initialize a new GitHub repository and push",
    "",
  ];

  await fs.writeFile(summaryPath, lines.join("\n"), "utf8");
}

async function main() {
  ensureOutputIsOutsideProject();
  await resetOutputDirectory();

  for (const filePath of filesToCopy) {
    await copyFile(filePath);
  }

  for (const directoryPath of directoriesToCopy) {
    await copyDirectory(directoryPath);
  }

  await writeExportSummary();

  console.log(`Standalone project exported to ${outputRoot}`);
}

await main();
