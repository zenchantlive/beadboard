'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { ProjectScopeMode, ProjectScopeOption } from '../../lib/project-scope';

interface ScannerProject {
  key: string;
  displayPath: string;
}

interface ScannerPayload {
  projects: ScannerProject[];
  stats: {
    scannedDirectories: number;
    ignoredDirectories: number;
    skippedDirectories: number;
    elapsedMs: number;
  };
}

interface ProjectScopeControlsProps {
  projectScopeKey: string;
  projectScopeMode: ProjectScopeMode;
  projectScopeOptions: ProjectScopeOption[];
}

function buildHref(pathname: string, mode: ProjectScopeMode, key: string): string {
  const params = new URLSearchParams();
  if (mode !== 'single') {
    params.set('mode', mode);
  }
  if (key !== 'local') {
    params.set('project', key);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function ProjectScopeControls({
  projectScopeKey,
  projectScopeMode,
  projectScopeOptions,
}: ProjectScopeControlsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [addPath, setAddPath] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanResult, setScanResult] = useState<ScannerPayload | null>(null);
  const [scanMode, setScanMode] = useState<'default' | 'full-drive'>('default');

  const selected = useMemo(
    () => projectScopeOptions.find((option) => option.key === projectScopeKey) ?? projectScopeOptions[0] ?? null,
    [projectScopeKey, projectScopeOptions],
  );

  const discovered = useMemo(() => {
    if (!scanResult) {
      return [];
    }
    const registered = new Set(projectScopeOptions.map((option) => option.key));
    return scanResult.projects.filter((project) => !registered.has(project.key));
  }, [projectScopeOptions, scanResult]);

  const navigate = (mode: ProjectScopeMode, key: string) => {
    const href = buildHref(pathname, mode, key);
    router.push(href);
    router.refresh();
  };

  const setMode = (mode: ProjectScopeMode) => {
    navigate(mode, projectScopeKey);
  };

  const setProjectKey = (key: string) => {
    navigate(projectScopeMode, key);
  };

  const addProject = async () => {
    if (!addPath.trim()) {
      setStatusMessage('Enter an absolute Windows path (example: C:/Repos/MyProject).');
      return;
    }
    setBusy(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: addPath.trim() }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to add project.');
      }
      setAddPath('');
      setStatusMessage('Project added.');
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to add project.');
    } finally {
      setBusy(false);
    }
  };

  const removeProject = async (path: string, key: string) => {
    setBusy(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to remove project.');
      }
      if (projectScopeKey === key) {
        navigate(projectScopeMode, 'local');
      } else {
        router.refresh();
      }
      setStatusMessage('Project removed.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to remove project.');
    } finally {
      setBusy(false);
    }
  };

  const runScan = async () => {
    setBusy(true);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/scan?mode=${scanMode}`, { cache: 'no-store' });
      const payload = (await response.json()) as ScannerPayload & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Scan failed.');
      }
      setScanResult(payload);
      setStatusMessage(`Scan complete. Found ${payload.projects.length} projects.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Scan failed.');
    } finally {
      setBusy(false);
    }
  };

  const importProject = async (project: ScannerProject) => {
    setBusy(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: project.displayPath }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Import failed.');
      }
      setStatusMessage(`Imported ${project.displayPath}`);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-border-soft bg-surface/65 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Scope</label>
        <select
          className="ui-field ui-select rounded-lg px-2 py-1 text-xs"
          value={projectScopeKey}
          onChange={(event) => setProjectKey(event.target.value)}
        >
          {projectScopeOptions.map((option) => (
            <option className="ui-option" key={option.key} value={option.key}>
              {option.source === 'local' ? 'Local workspace' : option.displayPath}
            </option>
          ))}
        </select>
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Mode</label>
        <select
          className="ui-field ui-select rounded-lg px-2 py-1 text-xs"
          value={projectScopeMode}
          onChange={(event) => setMode(event.target.value as ProjectScopeMode)}
        >
          <option className="ui-option" value="single">Single project</option>
          <option className="ui-option" value="aggregate">Aggregate</option>
        </select>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border border-border-soft bg-surface-muted/70 px-2.5 py-1 text-xs text-text-body"
        >
          {open ? 'Hide manager' : 'Manage projects'}
        </button>
      </div>
      {selected ? (
        <p className="mt-2 text-xs text-text-muted">
          Active: <span className="font-mono text-text-body">{selected.source === 'local' ? 'local workspace' : selected.displayPath}</span>
        </p>
      ) : null}
      {open ? (
        <div className="mt-3 grid gap-3 border-t border-border-soft pt-3">
          <div className="rounded-lg border border-border-soft/80 bg-surface/55 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Add project root</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="text"
                className="ui-field flex-1 rounded-lg px-2 py-1.5 text-xs"
                placeholder="C:/Repos/MyProject"
                value={addPath}
                onChange={(event) => setAddPath(event.target.value)}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void addProject()}
                className="rounded-lg border border-border-soft bg-surface-muted/70 px-2.5 py-1.5 text-xs text-text-body disabled:opacity-60"
              >
                Add
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border-soft/80 bg-surface/55 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Registered projects</p>
            <div className="mt-2 space-y-1.5">
              {projectScopeOptions.filter((option) => option.source === 'registry').map((option) => (
                <div key={option.key} className="flex items-center justify-between gap-2 rounded-md border border-border-soft/80 bg-surface-muted/40 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setProjectKey(option.key)}
                    className="truncate text-left font-mono text-xs text-text-body hover:text-sky-100"
                    title={option.displayPath}
                  >
                    {option.displayPath}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeProject(option.displayPath, option.key)}
                    className="rounded border border-rose-300/30 bg-rose-500/10 px-1.5 py-0.5 text-[11px] text-rose-100 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {projectScopeOptions.every((option) => option.source !== 'registry') ? (
                <p className="text-xs text-text-muted">No registered projects yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-border-soft/80 bg-surface/55 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Scanner</p>
              <select
                className="ui-field ui-select rounded-lg px-2 py-1 text-xs"
                value={scanMode}
                onChange={(event) => setScanMode(event.target.value as 'default' | 'full-drive')}
              >
                <option className="ui-option" value="default">Safe roots</option>
                <option className="ui-option" value="full-drive">Full drive</option>
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runScan()}
                className="rounded-lg border border-border-soft bg-surface-muted/70 px-2.5 py-1 text-xs text-text-body disabled:opacity-60"
              >
                Run scan
              </button>
            </div>
            {scanResult ? (
              <p className="mt-2 text-[11px] text-text-muted">
                scanned {scanResult.stats.scannedDirectories}, ignored {scanResult.stats.ignoredDirectories}, skipped {scanResult.stats.skippedDirectories} ({scanResult.stats.elapsedMs}ms)
              </p>
            ) : null}
            {discovered.length > 0 ? (
              <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {discovered.map((project) => (
                  <div key={project.key} className="flex items-center justify-between gap-2 rounded-md border border-border-soft/80 bg-surface-muted/40 px-2 py-1.5">
                    <span className="truncate font-mono text-xs text-text-body" title={project.displayPath}>
                      {project.displayPath}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void importProject(project)}
                      className="rounded border border-sky-300/30 bg-sky-500/10 px-1.5 py-0.5 text-[11px] text-sky-100 disabled:opacity-60"
                    >
                      Import
                    </button>
                  </div>
                ))}
              </div>
            ) : scanResult ? (
              <p className="mt-2 text-xs text-text-muted">No new projects to import.</p>
            ) : null}
          </div>

          {statusMessage ? <p className="text-xs text-text-muted">{statusMessage}</p> : null}
        </div>
      ) : null}
      {searchParams.get('project') && projectScopeKey === 'local' ? (
        <p className="mt-2 text-[11px] text-amber-200/90">Unknown project key in URL; fell back to local workspace.</p>
      ) : null}
    </section>
  );
}
