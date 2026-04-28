import { composeLibraryIndex } from "./lib/library-index-fragments.mjs";

const stats = await composeLibraryIndex({ projectRoot: process.cwd() });
console.log(`Composed library-index.json from ${stats.hiking} hiking records and ${stats.kayaking} kayak records`);
