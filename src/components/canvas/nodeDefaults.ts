import type { DisplayNodeData, ExtractorNodeData, CalculationNodeData, SheetNodeData, LabelNodeData } from '../../types';
import { createImageView } from '../../types';

export const defaultExtractorData: ExtractorNodeData = {
  label: 'Extractor',
  fileType: 'pdf',
  fileName: undefined,
  fileUrl: undefined,
  regions: [],
  currentPage: 1,
  totalPages: 1,
};

export const defaultDisplayData: DisplayNodeData = {
  label: 'Display',
  fileType: 'image',
  fileUrl: undefined,
  fileId: undefined,
  fileName: undefined,
  view: createImageView(300, 200),
  totalPages: 1,
  viewports: [],
};

export const defaultCalculationData: CalculationNodeData = {
  label: 'Calculation',
  operation: 'sum',
  precision: 2,
  inputs: [],
  result: undefined,
  inputCache: {},
};

export const defaultSheetData: SheetNodeData = {
  label: 'Sheet',
  subheaders: [],
};

export const defaultLabelData: LabelNodeData = {
  label: 'Label',
  format: 'number',
  value: undefined,
  fontSize: 'medium',
  alignment: 'center',
};

export type NodeType = 'display' | 'extractor' | 'calculation' | 'sheet' | 'label';

export const nodeTypeConfig: Array<{
  type: NodeType;
  label: string;
  data: DisplayNodeData | ExtractorNodeData | CalculationNodeData | SheetNodeData | LabelNodeData;
  icon: string;
}> = [
  { type: 'extractor', label: 'Extractor', data: defaultExtractorData, icon: 'extractor' },
  { type: 'display', label: 'Display', data: defaultDisplayData, icon: 'display' },
  { type: 'calculation', label: 'Calculation', data: defaultCalculationData, icon: 'calculation' },
  { type: 'sheet', label: 'Sheet', data: defaultSheetData, icon: 'sheet' },
  { type: 'label', label: 'Label', data: defaultLabelData, icon: 'label' },
];
