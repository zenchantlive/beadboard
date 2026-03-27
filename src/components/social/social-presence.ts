"use client";

import type { AgentState } from '../../lib/agent';
import { selectTaskAssignedAgentStates } from '../../lib/agent/ownership';
import type { BeadIssue } from '../../lib/types';
import type { SocialCard as SocialCardData } from '../../lib/social-cards';
import type { AgentStatus } from '../shared/agent-avatar';
import { mapAgentStateToAvatarStatus } from '../shared/agent-presence';

export interface SocialAgentPresence {
  label: string;
  status: AgentStatus;
  live: boolean;
  runtimeStatus: AgentState['status'] | null;
}

export function buildSocialAgentPresenceByName(
  card: SocialCardData,
  issue: BeadIssue | undefined,
  agentStates: readonly AgentState[],
): Record<string, SocialAgentPresence> {
  const presenceByName: Record<string, SocialAgentPresence> = {};
  if (card.agents.length === 0) {
    return presenceByName;
  }

  const assignedStates = selectTaskAssignedAgentStates(agentStates, card.id, issue?.agentInstanceId ?? null);
  const primaryState = assignedStates[0] ?? null;

  if (!primaryState) {
    for (const agent of card.agents) {
      presenceByName[agent.name] = {
        label: agent.name,
        status: agent.status,
        live: false,
        runtimeStatus: null,
      };
    }
    return presenceByName;
  }

  const avatarStatus = mapAgentStateToAvatarStatus(primaryState);
  const label = primaryState.label?.trim() || card.agents[0]?.name || card.id;

  for (const agent of card.agents) {
    presenceByName[agent.name] = {
      label,
      status: avatarStatus,
      live: true,
      runtimeStatus: primaryState.status,
    };
  }

  if (!presenceByName[label]) {
    presenceByName[label] = {
      label,
      status: avatarStatus,
      live: true,
      runtimeStatus: primaryState.status,
    };
  }

  return presenceByName;
}
