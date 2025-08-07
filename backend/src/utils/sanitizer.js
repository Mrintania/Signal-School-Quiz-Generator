import DOMPurify from 'isomorphic-dompurify';

export const sanitizeAll = (data) => {
    if (typeof data === 'string') {
        return DOMPurify.sanitize(data);
    }

    if (Array.isArray(data)) {
        return data.map(item => sanitizeAll(item));
    }

    if (data && typeof data === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = sanitizeAll(value);
        }
        return sanitized;
    }

    return data;
};