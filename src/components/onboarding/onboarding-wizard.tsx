'use client';

import { useState } from 'react';
import { CheckCircle, ArrowRight, Play, MessageSquare, GitBranch, Zap } from 'lucide-react';

interface OnboardingWizardProps {
  hasProjects: boolean;
  piInstalled: boolean;
  hasAuth: boolean;
}

export function OnboardingWizard({ hasProjects }: OnboardingWizardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSkipToApp = () => {
    window.location.href = '/?onboarded=true';
  };

  return (
    <div className="min-h-screen bg-[var(--surface-primary)] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              Welcome to BeadBoard
            </h1>
            <p className="text-[var(--text-secondary)]">
              Multi-agent swarm coordination for dependency-constrained work
            </p>
          </div>

          {/* Features */}
          <div className="grid gap-4 mb-8">
            <div className="flex items-start gap-3 p-4 bg-[var(--surface-quaternary)] rounded-lg">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <MessageSquare size={20} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Orchestrator Chat</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Left panel has a built-in AI orchestrator. Just send a message to get started.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[var(--surface-quaternary)] rounded-lg">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Zap size={20} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Spawn Workers</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Tell the orchestrator to spawn workers for parallel task execution.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[var(--surface-quaternary)] rounded-lg">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <GitBranch size={20} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Task Graphs</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Visualize dependencies and coordinate work across your project.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Start */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-emerald-400 mb-2 flex items-center gap-2">
              <CheckCircle size={16} /> Everything is ready
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              The agent runtime will install automatically when you send your first message.
              No manual setup required!
            </p>
          </div>

          {/* Project hint if needed */}
          {!hasProjects && (
            <div className="bg-[var(--surface-quaternary)] rounded-lg p-4 mb-6">
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                <strong>Tip:</strong> Add a project to coordinate work:
              </p>
              <code className="block bg-black/30 rounded p-2 text-cyan-300 font-mono text-sm">
                bb project add /path/to/your/project
              </code>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleSkipToApp}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <Play size={16} /> Start Using BeadBoard
            </button>
          </div>

          <p className="text-center text-[var(--text-tertiary)] text-xs mt-4">
            You can also run <code className="bg-black/30 px-1 rounded">bb --help</code> in terminal for CLI commands
          </p>
        </div>
      </div>
    </div>
  );
}
