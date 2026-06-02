import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(projectRoot, "dist", "pages");

const filesToCopy = [
  ".nojekyll",
  "app.js",
  "index.html",
  "runtime-config.js",
  "styles.css",
];

const directoriesToCopy = [
  "assets",
  "config",
  "logic",
  "pages",
];

async function resetOutputDirectory() {
  await fs.rm(outputRoot, { recursive: true, force: true });
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

async function writeManifest() {
  const manifestPath = path.join(outputRoot, "deploy-manifest.json");
  const manifest = {
    generatedAt: new Date().toISOString(),
    files: filesToCopy,
    directories: directoriesToCopy,
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function main() {
  await resetOutputDirectory();

  for (const filePath of filesToCopy) {
    await copyFile(filePath);
  }

  for (const directoryPath of directoriesToCopy) {
    await copyDirectory(directoryPath);
  }

  await writeManifest();

  console.log(`Prepared GitHub Pages artifact at ${outputRoot}`);
}

await main();
