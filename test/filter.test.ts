import { describe, expect, it } from 'vitest';
import { matchValues } from '../skeleton/shell/filter.ts';

const values = [
  { id: 'paper-box', label: 'Paper box' },
  { id: 'glass', label: 'Glass' },
  { id: 'lamp', label: 'Fluorescent lamp' },
];
const keywords = { 'paper-box': ['pizza', 'cardboard'], glass: ['bottle', 'jar'], lamp: ['tube', 'bulb'] };

describe('matchValues', () => {
  it('returns every id, in order, for an empty or blank query', () => {
    expect(matchValues(values, keywords, '')).toEqual(['paper-box', 'glass', 'lamp']);
    expect(matchValues(values, keywords, '   ')).toEqual(['paper-box', 'glass', 'lamp']);
  });

  it('matches the label or a keyword, ignoring case and surrounding space', () => {
    expect(matchValues(values, keywords, ' PIZZA ')).toEqual(['paper-box']);
    expect(matchValues(values, keywords, 'fluo')).toEqual(['lamp']);
    expect(matchValues(values, keywords, 'jar')).toEqual(['glass']);
  });

  it('needs every typed word to match, in any order, and returns nothing when none do', () => {
    expect(matchValues(values, keywords, 'box pizza')).toEqual(['paper-box']);
    expect(matchValues(values, keywords, 'pizza glass')).toEqual([]);
    expect(matchValues(values, keywords, 'battery')).toEqual([]);
  });

  it('works for values that have no keywords', () => {
    expect(matchValues(values, {}, 'glass')).toEqual(['glass']);
  });
});
