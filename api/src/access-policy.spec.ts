import { resolveAccessPolicy, ROOM_ACCESS_POLICIES } from '@gandogames/shared/dto';

describe('resolveAccessPolicy', () => {
	it('passes through each valid policy unchanged', () => {
		for (const policy of ROOM_ACCESS_POLICIES) {
			expect(resolveAccessPolicy(policy)).toBe(policy);
		}
	});

	it('defaults unknown / malformed values to public', () => {
		expect(resolveAccessPolicy('hacker')).toBe('public');
		expect(resolveAccessPolicy(undefined)).toBe('public');
		expect(resolveAccessPolicy(null)).toBe('public');
		expect(resolveAccessPolicy(42)).toBe('public');
		expect(resolveAccessPolicy({})).toBe('public');
	});
});
