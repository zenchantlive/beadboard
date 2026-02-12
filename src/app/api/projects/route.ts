import { NextResponse } from 'next/server';

import { addProject, listProjects, RegistryValidationError, removeProject } from '../../../lib/registry';

export const runtime = 'nodejs';

function projectsPayload(projects: Array<{ path: string }>): { projects: Array<{ path: string }> } {
  return {
    projects: projects.map((project) => ({ path: project.path })),
  };
}

async function readPathFromBody(request: Request): Promise<string> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new RegistryValidationError('Request body must be valid JSON.');
  }

  const path = (body as { path?: unknown }).path;
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw new RegistryValidationError('`path` is required and must be a non-empty string.');
  }

  return path;
}

export async function GET(): Promise<Response> {
  const projects = await listProjects();
  return NextResponse.json(projectsPayload(projects), { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const projectPath = await readPathFromBody(request);
    const result = await addProject(projectPath);
    return NextResponse.json(projectsPayload(result.projects), { status: result.added ? 201 : 200 });
  } catch (error) {
    if (error instanceof RegistryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to add project.' }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const projectPath = await readPathFromBody(request);
    const result = await removeProject(projectPath);
    return NextResponse.json({ removed: result.removed, ...projectsPayload(result.projects) }, { status: 200 });
  } catch (error) {
    if (error instanceof RegistryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to remove project.' }, { status: 500 });
  }
}
