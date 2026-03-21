/**
 * Canvas Templates
 *
 * Pre-built canvas configurations that users can start from.
 * Each template is a CanvasState with positioned nodes and edges.
 */

import type { CanvasState } from '../types';

export interface LynkTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  canvas: CanvasState;
}

export const templates: LynkTemplate[] = [
  {
    id: 'invoice-total',
    name: 'Invoice Total',
    description: 'Extract line items from an invoice and sum them up. Drop your PDF onto the Extractor to get started.',
    tags: ['invoice', 'calculation', 'sum'],
    canvas: {
      version: '1.0.0',
      metadata: {
        id: 'template-invoice-total',
        name: 'Invoice Total',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      nodes: [
        {
          id: 'node-1',
          type: 'extractor',
          position: { x: 100, y: 150 },
          data: {
            label: 'Invoice',
            fileType: 'pdf',
            fileName: undefined,
            fileUrl: undefined,
            regions: [],
            currentPage: 1,
            totalPages: 1,
          },
        },
        {
          id: 'node-2',
          type: 'calculation',
          position: { x: 550, y: 150 },
          data: {
            label: 'Total',
            operation: 'sum',
            precision: 2,
            inputs: [],
            result: undefined,
            inputCache: {},
          },
        },
        {
          id: 'node-3',
          type: 'label',
          position: { x: 850, y: 150 },
          data: {
            label: 'Invoice Total',
            format: 'currency',
            value: undefined,
            fontSize: 'large',
            alignment: 'center',
          },
        },
      ],
      edges: [
        {
          id: 'edge-node-2-result-node-3-input',
          source: 'node-2',
          target: 'node-3',
          sourceHandle: 'result',
          targetHandle: 'input',
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  },
  {
    id: 'multi-doc-comparison',
    name: 'Multi-Document Comparison',
    description: 'Compare data across two documents side by side using a Sheet to aggregate results.',
    tags: ['comparison', 'sheet', 'multiple'],
    canvas: {
      version: '1.0.0',
      metadata: {
        id: 'template-multi-doc',
        name: 'Multi-Document Comparison',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      nodes: [
        {
          id: 'node-1',
          type: 'extractor',
          position: { x: 100, y: 50 },
          data: {
            label: 'Document A',
            fileType: 'pdf',
            fileName: undefined,
            fileUrl: undefined,
            regions: [],
            currentPage: 1,
            totalPages: 1,
          },
        },
        {
          id: 'node-2',
          type: 'extractor',
          position: { x: 100, y: 400 },
          data: {
            label: 'Document B',
            fileType: 'pdf',
            fileName: undefined,
            fileUrl: undefined,
            regions: [],
            currentPage: 1,
            totalPages: 1,
          },
        },
        {
          id: 'node-3',
          type: 'sheet',
          position: { x: 550, y: 150 },
          data: {
            label: 'Comparison',
            subheaders: [
              {
                id: 'sub-1',
                label: 'Category A',
                operation: 'sum',
                entries: [
                  { id: 'entry-1', label: 'Item 1', operation: 'sum' },
                  { id: 'entry-2', label: 'Item 2', operation: 'sum' },
                ],
              },
            ],
          },
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  },
  {
    id: 'simple-ocr',
    name: 'Simple OCR Extract',
    description: 'Extract a single value from a document and display it. The simplest workflow to learn the basics.',
    tags: ['simple', 'ocr', 'beginner'],
    canvas: {
      version: '1.0.0',
      metadata: {
        id: 'template-simple-ocr',
        name: 'Simple OCR Extract',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      nodes: [
        {
          id: 'node-1',
          type: 'extractor',
          position: { x: 100, y: 150 },
          data: {
            label: 'Document',
            fileType: 'pdf',
            fileName: undefined,
            fileUrl: undefined,
            regions: [],
            currentPage: 1,
            totalPages: 1,
          },
        },
        {
          id: 'node-2',
          type: 'label',
          position: { x: 550, y: 150 },
          data: {
            label: 'Extracted Value',
            format: 'string',
            value: undefined,
            fontSize: 'medium',
            alignment: 'center',
          },
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  },
];
