import { readFile } from "node:fs/promises";
import path from "node:path";
import { readHikingSourceData } from "./lib/hiking-source-shards.mjs";
import { writeHikeData } from "./write-hike-data.mjs";

const projectRoot = process.cwd();
const hikesPath = path.join(projectRoot, "data", "hikes.json");

const hikes = JSON.parse(await readFile(hikesPath, "utf8"));
const trailSystems = await readHikingSourceData({ projectRoot });

await writeHikeData(hikes, trailSystems);
