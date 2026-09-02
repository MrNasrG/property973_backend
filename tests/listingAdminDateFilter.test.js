const { resolveDateRange } = require('../utils/listingAdminDateFilter');

describe('listingAdminDateFilter', () => {
    test('resolves full month range from month input', () => {
        const result = resolveDateRange({ month: '2026-05', dateFrom: '', dateTo: '' });
        expect(result.error).toBeNull();
        expect(result.dateFrom).toBe('2026-05-01');
        expect(result.dateTo).toBe('2026-05-31');
        expect(result.clause).toBeTruthy();
    });

    test('requires both from and to when month is not set', () => {
        const result = resolveDateRange({ month: '', dateFrom: '2026-05-01', dateTo: '' });
        expect(result.clause).toBeNull();
        expect(result.error).toMatch(/both From and To/i);
        expect(result.dateFrom).toBe('2026-05-01');
    });

    test('rejects start date after end date', () => {
        const result = resolveDateRange({
            month: '',
            dateFrom: '2026-06-01',
            dateTo: '2026-05-01'
        });
        expect(result.clause).toBeNull();
        expect(result.error).toMatch(/Start date/i);
    });

    test('builds between clause for custom date range', () => {
        const result = resolveDateRange({
            month: '',
            dateFrom: '2026-05-01',
            dateTo: '2026-05-31'
        });
        expect(result.error).toBeNull();
        expect(result.clause).toBeTruthy();
    });
});
