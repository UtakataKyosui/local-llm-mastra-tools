import { collectFeeds } from './collect';

const results = await collectFeeds(process.argv.slice(2));
console.table(results);
