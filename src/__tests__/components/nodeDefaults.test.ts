import { describe, it, expect } from 'vitest';
import {
  defaultExtractorData,
  defaultDisplayData,
  defaultCalculationData,
  defaultSheetData,
  defaultLabelData,
} from '../../components/canvas/nodeDefaults';

describe('nodeDefaults', () => {
  it('defaultExtractorData has required fields', () => {
    expect(defaultExtractorData.label).toBe('Extractor');
    expect(defaultExtractorData.regions).toEqual([]);
    expect(defaultExtractorData.currentPage).toBe(1);
    expect(defaultExtractorData.totalPages).toBe(1);
  });

  it('defaultDisplayData has required fields', () => {
    expect(defaultDisplayData.label).toBe('Display');
    expect(defaultDisplayData.view).toBeTruthy();
    expect(defaultDisplayData.viewports).toEqual([]);
  });

  it('defaultCalculationData has required fields', () => {
    expect(defaultCalculationData.label).toBe('Calculation');
    expect(defaultCalculationData.operation).toBe('sum');
    expect(defaultCalculationData.precision).toBe(2);
    expect(defaultCalculationData.inputs).toEqual([]);
  });

  it('defaultSheetData has required fields', () => {
    expect(defaultSheetData.label).toBe('Sheet');
    expect(defaultSheetData.subheaders).toEqual([]);
  });

  it('defaultLabelData has required fields', () => {
    expect(defaultLabelData.label).toBe('Label');
    expect(defaultLabelData.format).toBe('number');
    expect(defaultLabelData.fontSize).toBe('medium');
    expect(defaultLabelData.alignment).toBe('center');
  });
});
