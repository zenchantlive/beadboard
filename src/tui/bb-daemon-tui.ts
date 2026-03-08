import { bbDaemon, type BbDaemonLifecycleStatus } from '../lib/bb-daemon';

export interface BbDaemonTuiProjectSummary {
  projectRoot: string;
  orchestratorStatus: string;
  eventCount: number;
}

export interface BbDaemonTuiSnapshot {
  daemonStatus: BbDaemonLifecycleStatus | string;
  projects: BbDaemonTuiProjectSummary[];
}

function shortenProjectRoot(projectRoot: string): string {
  const parts = projectRoot.replaceAll('\\', '/').split('/').filter(Boolean);
  return parts.slice(-2).join('/') || projectRoot;
}

export function renderDaemonTuiSnapshot(snapshot: BbDaemonTuiSnapshot): string[] {
  const header = [
    '╔══════════════════════════════════════════════════════════════╗',
    '║                    BeadBoard Daemon TUI                    ║',
    '╠══════════════════════════════════════════════════════════════╣',
    `║ Daemon Status : ${String(snapshot.daemonStatus).padEnd(44)}║`,
    `║ Projects      : ${String(snapshot.projects.length).padEnd(44)}║`,
    '╠══════════════════════════════════════════════════════════════╣',
  ];

  const projectLines = snapshot.projects.length
    ? snapshot.projects.flatMap((project) => {
        const label = shortenProjectRoot(project.projectRoot);
        return [
          `║ Project       : ${label.padEnd(44)}║`,
          `║ Orchestrator  : ${project.orchestratorStatus.padEnd(44)}║`,
          `║ Runtime Events: ${String(project.eventCount).padEnd(44)}║`,
          '╟──────────────────────────────────────────────────────────────╢',
        ];
      })
    : ['║ No registered daemon projects yet.                          ║', '╟──────────────────────────────────────────────────────────────╢'];

  const footer = [
    '║ Commands: bb daemon start | bb daemon status | bb daemon tui║',
    '╚══════════════════════════════════════════════════════════════╝',
  ];

  return [...header, ...projectLines, ...footer];
}

export function renderDaemonTuiFromRuntime(): string[] {
  const status = bbDaemon.getStatus();
  return renderDaemonTuiSnapshot({
    daemonStatus: status.lifecycle.status,
    projects: status.projects.map((project) => ({
      projectRoot: project.projectRoot,
      orchestratorStatus: project.orchestratorStatus,
      eventCount: project.eventCount,
    })),
  });
}

export function renderDaemonTuiText(): string {
  return renderDaemonTuiFromRuntime().join('\n');
}
