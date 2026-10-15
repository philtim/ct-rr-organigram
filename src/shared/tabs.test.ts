import { describe, expect, it } from 'vitest';
import { adminUrl } from './tabs';

describe('adminUrl', () => {
    it("points at this extension, not the instance root the host page's base element points at", () => {
        expect(adminUrl('https://example.church.tools/ccm/rr-dashboard/')).toBe(
            'https://example.church.tools/ccm/rr-dashboard/?admin=1',
        );
    });

    it('drops the tab, keeps every other parameter and the hash', () => {
        expect(adminUrl('https://example.church.tools/ccm/rr-dashboard/?tab=beitraege&x=1#a')).toBe(
            'https://example.church.tools/ccm/rr-dashboard/?x=1&admin=1#a',
        );
    });
});
