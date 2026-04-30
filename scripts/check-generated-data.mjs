import { spawn } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const outputPaths = [
  "public/data",
  "public/routes/kayaking",
  "data/source/kayaking/source-manifest.json",
  "data/source/kayaking/README.md"
];

async function copyRequiredProjectInputs(tempRoot) {
  for (const directory of ["scripts", "data", "public"]) {
    await cp(path.join(projectRoot, directory), path.join(tempRoot, directory), {
      recursive: true,
      force: true,
      errorOnExist: false
    });
  }
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}\n${output}`));
    });
  });
}

async function collectFiles(root, relativeTarget) {
  const absoluteTarget = path.join(root, relativeTarget);
  let targetStat;
  try {
    targetStat = await stat(absoluteTarget);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  if (targetStat.isFile()) return [relativeTarget];
  if (!targetStat.isDirectory()) return [];

  const files = [];

  async function walk(relativeDirectory) {
    const entries = await readdir(path.join(root, relativeDirectory), { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = path.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) await walk(relativePath);
      else if (entry.isFile()) files.push(relativePath);
    }
  }

  await walk(relativeTarget);
  return files;
}

async function compareFiles(originalRoot, generatedRoot, relativeTarget) {
  const originalFiles = await collectFiles(originalRoot, relativeTarget);
  const generatedFiles = await collectFiles(generatedRoot, relativeTarget);
  const originalSet = new Set(originalFiles);
  const generatedSet = new Set(generatedFiles);
  const diffs = [];

  for (const file of originalFiles) {
    if (!generatedSet.has(file)) diffs.push(`missing generated file: ${file}`);
  }
  for (const file of generatedFiles) {
    if (!originalSet.has(file)) diffs.push(`unexpected generated file: ${file}`);
  }
  for (const file of originalFiles) {
    if (!generatedSet.has(file)) continue;
    const [original, generated] = await Promise.all([
      readFile(path.join(originalRoot, file)),
      readFile(path.join(generatedRoot, file))
    ]);
    if (!original.equals(generated)) diffs.push(`content differs: ${file}`);
  }

  return {
    checkedFiles: new Set([...originalFiles, ...generatedFiles]).size,
    diffs
  };
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "hike-trails-data-check-"));

try {
  await copyRequiredProjectInputs(tempRoot);
  await run(process.execPath, ["scripts/build-data.mjs"], { cwd: tempRoot });

  let checkedFiles = 0;
  const diffs = [];
  for (const outputPath of outputPaths) {
    const result = await compareFiles(projectRoot, tempRoot, outputPath);
    checkedFiles += result.checkedFiles;
    diffs.push(...result.diffs);
  }

  if (diffs.length > 0) {
    console.error("Generated data drift detected. Run npm run data:build and review the resulting files.");
    for (const diff of diffs.slice(0, 80)) console.error(`- ${diff}`);
    if (diffs.length > 80) console.error(`- ...and ${diffs.length - 80} more differences`);
    process.exitCode = 1;
  } else {
    console.log(`Generated data check passed (${checkedFiles} files compared).`);
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
