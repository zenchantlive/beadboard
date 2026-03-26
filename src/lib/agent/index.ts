/**
 * Agent Bounded Context
 * 
 * This module provides the public API for agent coordination:
 * - Registry: agent registration, listing, state management
 * - Messaging: mail, inbox, handoffs
 * - Reservations: scope locking, resource allocation
 * - Sessions: lifecycle, liveness, coordination
 * 
 * Current state: Migration in progress.
 * Import from individual modules for now.
 */

// Re-export from types (already migrated)
export * from './types';
export * from './state';
