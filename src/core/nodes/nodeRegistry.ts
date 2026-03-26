/**
 * Node Type Registry
 *
 * Centralizes node type definitions so adding a new node type requires
 * registering it in one place. Consumers (canvas, toolbar, context menu,
 * connection validation) read from the registry instead of hardcoding types.
 *
 * To add a new node type:
 * 1. Define its data interface in types/nodes.ts
 * 2. Create the component in components/nodes/
 * 3. Register it via registerNodeType() in registerAll.ts
 */

import type { ComponentType } from 'react';
import type { NodeTypes } from '@xyflow/react';
import { withErrorBoundary } from '../../components/nodes/base/withErrorBoundary';

export interface NodeTypeDefinition {
  /** Unique type identifier (e.g. 'calculation') */
  type: string;
  /** UI display name */
  label: string;
  /** Short label for toolbar (defaults to label) */
  shortLabel?: string;
  /** Icon key for NodeIcon component */
  icon: string;
  /** React component for rendering this node */
  component: ComponentType<any>;
  /** Default data when creating a new instance */
  defaultData: Record<string, unknown>;
  /** Node capabilities */
  capabilities: {
    canExport: boolean;
    canImport: boolean;
    isFileNode: boolean;
  };
  /** Whether this type appears in toolbar/context menu for user creation */
  creatable: boolean;
  /** Toolbar tooltip */
  description?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY STATE
// ═══════════════════════════════════════════════════════════════════════════════

const registry = new Map<string, NodeTypeDefinition>();

/** Cached React Flow nodeTypes record — invalidated on registration */
let cachedNodeTypes: NodeTypes | null = null;

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

export function registerNodeType(def: NodeTypeDefinition): void {
  registry.set(def.type, def);
  cachedNodeTypes = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

export function getNodeType(type: string): NodeTypeDefinition | undefined {
  return registry.get(type);
}

export function getAllNodeTypes(): NodeTypeDefinition[] {
  return Array.from(registry.values());
}

/** Returns node types that should appear in toolbar / context menu */
export function getCreatableTypes(): NodeTypeDefinition[] {
  return Array.from(registry.values()).filter((d) => d.creatable);
}

/** Returns the React Flow nodeTypes record (components wrapped with error boundaries) */
export function getNodeTypes(): NodeTypes {
  if (cachedNodeTypes) return cachedNodeTypes;
  const result: NodeTypes = {};
  for (const def of registry.values()) {
    result[def.type] = withErrorBoundary(def.component, def.type) as any;
  }
  cachedNodeTypes = result;
  return result;
}

/** Check if a node type string has a given capability */
export function hasCapability(type: string, cap: 'canExport' | 'canImport' | 'isFileNode'): boolean {
  const def = registry.get(type);
  return def ? def.capabilities[cap] : false;
}

/** Get all type strings with a given capability */
export function getTypesWithCapability(cap: 'canExport' | 'canImport' | 'isFileNode'): string[] {
  return Array.from(registry.values())
    .filter((d) => d.capabilities[cap])
    .map((d) => d.type);
}
