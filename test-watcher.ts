import { readIssuesFromDisk } from './src/lib/read-issues';
import { runBdCommand } from './src/lib/bridge';

const projectRoot = 'C:\\Users\\Zenchant\\codex\\beadboard';

async function run() {
    console.log('1. Reading current state...');
    const state1 = await readIssuesFromDisk({ projectRoot, preferBd: true, skipAgentFilter: true });
    console.log(`State 1 has ${state1.length} issues.`);

    console.log('2. Creating a test issue via bd...');
    await runBdCommand({ projectRoot, args: ['create', 'Diff test issue', '-p', '0'] });

    console.log('3. Reading new state...');
    const state2 = await readIssuesFromDisk({ projectRoot, preferBd: true, skipAgentFilter: true });
    console.log(`State 2 has ${state2.length} issues.`);

    if (state1.length === state2.length) {
        console.error('ERROR: State length did not change! readIssuesFromDisk is caching or returning stale data.');
    } else {
        console.log('SUCCESS: State length changed. The issue is in watcher.ts snapshot management.');
    }
}

run().catch(console.error);
