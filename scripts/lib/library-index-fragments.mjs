import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const activities = ["hiking", "kayaking"];

function publicDataDir(projectRoot) {
  return path.join(projectRoot, "public", "data");
}

export function activityLibraryIndexPath(activity, { projectRoot = process.cwd() } = {}) {
  return path.join(publicDataDir(projectRoot), `library-index.${activity}.json`);
}

export function composedLibraryIndexPath({ projectRoot = process.cwd() } = {}) {
  return path.join(publicDataDir(projectRoot), "library-index.json");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function writeActivityLibraryIndex(activity, items, { projectRoot = process.cwd() } = {}) {
  if (!activities.includes(activity)) throw new Error(`Unsupported library-index activity "${activity}"`);
  if (!Array.isArray(items)) throw new Error(`library-index.${activity}.json must be written from an array`);

  await mkdir(publicDataDir(projectRoot), { recursive: true });
  await writeFile(activityLibraryIndexPath(activity, { projectRoot }), `${JSON.stringify(items, null, 2)}\n`);
}

export async function readActivityLibraryIndex(activity, { projectRoot = process.cwd() } = {}) {
  const filePath = activityLibraryIndexPath(activity, { projectRoot });
  const items = await readJson(filePath);
  if (!Array.isArray(items)) throw new Error(`${path.relative(projectRoot, filePath)} must contain an array`);
  return items;
}

export async function composeLibraryIndex({ projectRoot = process.cwd() } = {}) {
  const fragments = await Promise.all(activities.map((activity) => readActivityLibraryIndex(activity, { projectRoot })));
  const items = fragments.flat();
  const seenIds = new Set();

  for (const item of items) {
    if (!item?.id) throw new Error("library-index fragments must only contain records with IDs");
    if (seenIds.has(item.id)) throw new Error(`Duplicate library-index item ID "${item.id}" across activity fragments`);
    seenIds.add(item.id);
  }

  await mkdir(publicDataDir(projectRoot), { recursive: true });
  await writeFile(composedLibraryIndexPath({ projectRoot }), `${JSON.stringify(items, null, 2)}\n`);
  return {
    total: items.length,
    hiking: fragments[0].length,
    kayaking: fragments[1].length
  };
}
