/**
 * Contextual Suggestions
 *
 * Pure function that examines canvas state and returns
 * actionable suggestions to guide the user.
 */

import type { Edge } from '@xyflow/react';
import type { LynkNode, LynkNodeType } from '../types';
import { ExtractorNode, CalculationNode } from '../types';

export interface Suggestion {
  id: string;
  message: string;
  action?: { label: string; nodeType: LynkNodeType };
}

export function getSuggestions(nodes: LynkNode[], edges: Edge[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const hasType = (type: LynkNodeType) => nodes.some((n) => n.type === type);
  const nodesOfType = (type: LynkNodeType) => nodes.filter((n) => n.type === type);

  // No edges at all but has multiple nodes
  if (nodes.length >= 2 && edges.length === 0) {
    suggestions.push({
      id: 'connect-nodes',
      message: 'Connect nodes by dragging from an output handle to an input handle.',
    });
  }

  // Has extractor with regions but no calculation or sheet
  const extractorsWithRegions = nodesOfType('extractor').filter(
    (n) => ExtractorNode.is(n) && n.data.regions.length > 0
  );
  if (extractorsWithRegions.length > 0 && !hasType('calculation') && !hasType('sheet')) {
    suggestions.push({
      id: 'add-calculation',
      message: 'You have extracted data — try adding a Calculation node to sum or average values.',
      action: { label: '+ Calculation', nodeType: 'calculation' },
    });
  }

  // Has extractor with regions but no label
  if (extractorsWithRegions.length > 0 && !hasType('label')) {
    suggestions.push({
      id: 'add-label',
      message: 'Add a Label node to display an extracted value.',
      action: { label: '+ Label', nodeType: 'label' },
    });
  }

  // Has calculation with result but no label connected downstream
  const calcsWithResults = nodesOfType('calculation').filter(
    (n) => CalculationNode.is(n) && n.data.result !== undefined
  );
  if (calcsWithResults.length > 0) {
    const calcIds = new Set(calcsWithResults.map((n) => n.id));
    const hasDownstreamLabel = edges.some(
      (e) => calcIds.has(e.source) && nodes.some((n) => n.id === e.target && n.type === 'label')
    );
    if (!hasDownstreamLabel && hasType('label') === false) {
      suggestions.push({
        id: 'label-for-calc',
        message: 'Connect your calculation result to a Label node to display it.',
        action: { label: '+ Label', nodeType: 'label' },
      });
    }
  }

  // Multiple extractors but no sheet
  if (nodesOfType('extractor').length >= 2 && !hasType('sheet')) {
    suggestions.push({
      id: 'add-sheet',
      message: 'Use a Sheet node to aggregate data from multiple documents.',
      action: { label: '+ Sheet', nodeType: 'sheet' },
    });
  }

  return suggestions;
}
