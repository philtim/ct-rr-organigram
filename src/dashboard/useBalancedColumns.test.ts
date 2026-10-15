import { describe, expect, it } from 'vitest';
import { balancedColumns } from './useBalancedColumns';

// 240px cards, 12px gap: five fit in 1256px, four in 1004px, three in 752px.
const at = (width: number, count: number) => balancedColumns(width, count, 240, 12);

describe('balancedColumns', () => {
    it('evens out the rows instead of leaving one card alone', () => {
        expect(at(1256, 6)).toBe(3); // 3 + 3, not 5 + 1
        expect(at(1256, 7)).toBe(4); // 4 + 3
        expect(at(1256, 8)).toBe(4); // 4 + 4
    });

    it('keeps everything in one row when it fits', () => {
        expect(at(1256, 5)).toBe(5);
        expect(at(1256, 2)).toBe(2);
        expect(at(1256, 1)).toBe(1);
    });

    it('narrows with the space available', () => {
        expect(at(1004, 6)).toBe(3); // 3 + 3
        expect(at(752, 5)).toBe(3); // 3 + 2
        expect(at(300, 4)).toBe(1);
    });

    it('never answers zero', () => {
        expect(at(1256, 0)).toBe(1);
        expect(at(0, 3)).toBe(1);
    });
});
