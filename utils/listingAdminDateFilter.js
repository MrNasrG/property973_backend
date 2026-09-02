const { Op, where, fn, col } = require('sequelize');

function isValidDateString(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function isValidMonthString(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value.trim());
}

function lastDayOfMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function resolveDateRange({ month, dateFrom, dateTo }) {
    const monthValue = String(month || '').trim();
    const fromValue = String(dateFrom || '').trim();
    const toValue = String(dateTo || '').trim();

    if (monthValue) {
        if (!isValidMonthString(monthValue)) {
            return { dateFrom: fromValue, dateTo: toValue, month: monthValue, clause: null, error: 'Invalid month selected.' };
        }
        const [year, monthNum] = monthValue.split('-').map(Number);
        const lastDay = lastDayOfMonth(year, monthNum);
        const resolvedFrom = `${monthValue}-01`;
        const resolvedTo = `${monthValue}-${String(lastDay).padStart(2, '0')}`;
        return {
            month: monthValue,
            dateFrom: resolvedFrom,
            dateTo: resolvedTo,
            clause: buildDateClause(resolvedFrom, resolvedTo),
            error: null
        };
    }

    if (!fromValue && !toValue) {
        return { month: '', dateFrom: '', dateTo: '', clause: null, error: null };
    }

    if (!fromValue || !toValue) {
        return {
            month: '',
            dateFrom: fromValue,
            dateTo: toValue,
            clause: null,
            error: 'Select both From and To dates, or choose a month.'
        };
    }

    if (!isValidDateString(fromValue) || !isValidDateString(toValue)) {
        return {
            month: '',
            dateFrom: fromValue,
            dateTo: toValue,
            clause: null,
            error: 'Invalid date selected.'
        };
    }

    if (fromValue > toValue) {
        return {
            month: '',
            dateFrom: fromValue,
            dateTo: toValue,
            clause: null,
            error: 'Start date must be on or before end date.'
        };
    }

    return {
        month: '',
        dateFrom: fromValue,
        dateTo: toValue,
        clause: buildDateClause(fromValue, toValue),
        error: null
    };
}

function buildDateClause(dateFrom, dateTo) {
    return where(fn('DATE', col('PropertyListing.created_at')), {
        [Op.between]: [dateFrom, dateTo]
    });
}

module.exports = {
    resolveDateRange,
    buildDateClause,
    isValidDateString,
    isValidMonthString
};
