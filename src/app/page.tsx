import { KanbanPage } from '../components/kanban/kanban-page';
import { readIssuesFromDisk } from '../lib/read-issues';

export default async function Page() {
  const issues = await readIssuesFromDisk();
  return <KanbanPage issues={issues} projectRoot={process.cwd()} />;
}
