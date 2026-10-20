// Runs after vite build and stamps the resulting deployable dist/release-info.json.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {buildReleaseInfo} from './release-metadata.mjs';
const readJson=async file=>JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));
const pkg=await readJson('../package.json');
const commit=(process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'})).trim().toLowerCase();
const metadata=buildReleaseInfo(pkg.version,commit,new Date().toISOString());
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
await writeFile(new URL('../dist/release-info.json',import.meta.url),
  JSON.stringify(metadata,null,2)+'\n');
process.stdout.write('Stamped Framefield '+metadata.phase+' artifact '+metadata.commit.slice(0,12)+'\n');
