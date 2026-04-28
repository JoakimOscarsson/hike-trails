import { readFile } from "node:fs/promises";
import path from "node:path";
import { importKayakData } from "./import-kayak-data.mjs";
import { writeHikeData } from "./write-hike-data.mjs";

const projectRoot = process.cwd();
const hikesPath = path.join(projectRoot, "data", "hikes.json");
const trailSystemsPath = path.join(projectRoot, "data", "trail-systems.json");

const hikes = JSON.parse(await readFile(hikesPath, "utf8"));
const trailSystems = JSON.parse(await readFile(trailSystemsPath, "utf8").catch(() => "[]"));

await writeHikeData(hikes, trailSystems);
await importKayakData({ projectRoot });
