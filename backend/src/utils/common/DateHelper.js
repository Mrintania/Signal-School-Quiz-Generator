// backend/src/utils/common/DateHelper.js
/**
 * Date Helper Utility
 * จัดการการประมวลผลและการจัดรูปแบบวันที่
 * รองรับภาษาไทยและการคำนวณวันที่ต่างๆ
 */
export class DateHelper {
    constructor() {
        // Thai locale settings
        this.thaiLocale = 'th-TH';
        this.thaiOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        // Thai months
        this.thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];

        // Thai days
        this.thaiDays = [
            'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'
        ];
    }

    /**
     * Get current date and time
     */
    now() {
        return new Date();
    }

    /**
     * Get current timestamp
     */
    timestamp() {
        return Date.now();
    }

    /**
     * Format date in Thai format
     */
    formatThai(date, options = {}) {
        try {
            const {
                includeBuddhistYear = true,
                includeTime = false,
                shortFormat = false
            } = options;

            const d = new Date(date);
            if (isNaN(d.getTime())) {
                return 'วันที่ไม่ถูกต้อง';
            }

            const day = d.getDate();
            const month = shortFormat ?
                this.thaiMonths[d.getMonth()].substring(0, 3) :
                this.thaiMonths[d.getMonth()];
            const year = includeBuddhistYear ? d.getFullYear() + 543 : d.getFullYear();

            let formatted = `${day} ${month} ${year}`;

            if (includeTime) {
                const hours = d.getHours().toString().padStart(2, '0');
                const minutes = d.getMinutes().toString().padStart(2, '0');
                formatted += ` เวลา ${hours}:${minutes} น.`;
            }

            return formatted;

        } catch (error) {
            return 'วันที่ไม่ถูกต้อง';
        }
    }

    /**
     * Format date in international format
     */
    formatInternational(date, format = 'YYYY-MM-DD') {
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) {
                return 'Invalid Date';
            }

            const year = d.getFullYear();
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            const hours = d.getHours().toString().padStart(2, '0');
            const minutes = d.getMinutes().toString().padStart(2, '0');
            const seconds = d.getSeconds().toString().padStart(2, '0');

            return format
                .replace('YYYY', year)
                .replace('MM', month)
                .replace('DD', day)
                .replace('HH', hours)
                .replace('mm', minutes)
                .replace('ss', seconds);

        } catch (error) {
            return 'Invalid Date';
        }
    }

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    formatRelative(date, baseDate = new Date()) {
        try {
            const d = new Date(date);
            const base = new Date(baseDate);

            if (isNaN(d.getTime()) || isNaN(base.getTime())) {
                return 'วันที่ไม่ถูกต้อง';
            }

            const diffMs = base.getTime() - d.getTime();
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHour = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHour / 24);
            const diffWeek = Math.floor(diffDay / 7);
            const diffMonth = Math.floor(diffDay / 30);
            const diffYear = Math.floor(diffDay / 365);

            if (diffMs < 0) {
                // Future date
                const absDiffSec = Math.abs(diffSec);
                const absDiffMin = Math.abs(diffMin);
                const absDiffHour = Math.abs(diffHour);
                const absDiffDay = Math.abs(diffDay);

                if (absDiffSec < 60) return 'ในอีกสักครู่';
                if (absDiffMin < 60) return `ในอีก ${absDiffMin} นาที`;
                if (absDiffHour < 24) return `ในอีก ${absDiffHour} ชั่วโมง`;
                if (absDiffDay < 30) return `ในอีก ${absDiffDay} วัน`;

                return this.formatThai(d);
            }

            // Past date
            if (diffSec < 60) return 'เมื่อสักครู่';
            if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
            if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`;
            if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
            if (diffWeek < 4) return `${diffWeek} สัปดาห์ที่แล้ว`;
            if (diffMonth < 12) return `${diffMonth} เดือนที่แล้ว`;
            if (diffYear > 0) return `${diffYear} ปีที่แล้ว`;

            return this.formatThai(d);

        } catch (error) {
            return 'วันที่ไม่ถูกต้อง';
        }
    }

    /**
     * Add time to date
     */
    addTime(date, amount, unit) {
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) {
                throw new Error('Invalid date');
            }

            switch (unit) {
                case 'seconds':
                    d.setSeconds(d.getSeconds() + amount);
                    break;
                case 'minutes':
                    d.setMinutes(d.getMinutes() + amount);
                    break;
                case 'hours':
                    d.setHours(d.getHours() + amount);
                    break;
                case 'days':
                    d.setDate(d.getDate() + amount);
                    break;
                case 'weeks':
                    d.setDate(d.getDate() + (amount * 7));
                    break;
                case 'months':
                    d.setMonth(d.getMonth() + amount);
                    break;
                case 'years':
                    d.setFullYear(d.getFullYear() + amount);
                    break;
                default:
                    throw new Error('Invalid time unit');
            }

            return d;

        } catch (error) {
            throw new Error(`Failed to add time: ${error.message}`);
        }
    }

    /**
     * Get start of day
     */
    startOfDay(date = new Date()) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * Get end of day
     */
    endOfDay(date = new Date()) {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    /**
     * Get start of week (Monday)
     */
    startOfWeek(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        d.setDate(diff);
        return this.startOfDay(d);
    }

    /**
     * Get end of week (Sunday)
     */
    endOfWeek(date = new Date()) {
        const d = this.startOfWeek(date);
        d.setDate(d.getDate() + 6);
        return this.endOfDay(d);
    }

    /**
     * Get start of month
     */
    startOfMonth(date = new Date()) {
        const d = new Date(date);
        d.setDate(1);
        return this.startOfDay(d);
    }

    /**
     * Get end of month
     */
    endOfMonth(date = new Date()) {
        const d = new Date(date);
        d.setMonth(d.getMonth() + 1, 0);
        return this.endOfDay(d);
    }

    /**
     * Check if date is today
     */
    isToday(date) {
        const d = new Date(date);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    }

    /**
     * Check if date is yesterday
     */
    isYesterday(date) {
        const d = new Date(date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return d.toDateString() === yesterday.toDateString();
    }

    /**
     * Check if date is tomorrow
     */
    isTomorrow(date) {
        const d = new Date(date);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return d.toDateString() === tomorrow.toDateString();
    }

    /**
     * Check if date is in current week
     */
    isThisWeek(date) {
        const d = new Date(date);
        const startWeek = this.startOfWeek();
        const endWeek = this.endOfWeek();
        return d >= startWeek && d <= endWeek;
    }

    /**
     * Check if date is in current month
     */
    isThisMonth(date) {
        const d = new Date(date);
        const startMonth = this.startOfMonth();
        const endMonth = this.endOfMonth();
        return d >= startMonth && d <= endMonth;
    }

    /**
     * Calculate difference between two dates
     */
    diff(date1, date2, unit = 'milliseconds') {
        const d1 = new Date(date1);
        const d2 = new Date(date2);

        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
            throw new Error('Invalid date(s)');
        }

        const diffMs = Math.abs(d2.getTime() - d1.getTime());

        switch (unit) {
            case 'milliseconds':
                return diffMs;
            case 'seconds':
                return Math.floor(diffMs / 1000);
            case 'minutes':
                return Math.floor(diffMs / (1000 * 60));
            case 'hours':
                return Math.floor(diffMs / (1000 * 60 * 60));
            case 'days':
                return Math.floor(diffMs / (1000 * 60 * 60 * 24));
            case 'weeks':
                return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
            case 'months':
                return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
            case 'years':
                return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
            default:
                throw new Error('Invalid unit');
        }
    }

    /**
     * Parse various date formats
     */
    parse(dateString) {
        try {
            // Try ISO format first
            let date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date;
            }

            // Try Thai Buddhist year format (e.g., "25/12/2567")
            const buddhist = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (buddhist) {
                const [, day, month, year] = buddhist;
                const gregorianYear = parseInt(year) > 2400 ? parseInt(year) - 543 : parseInt(year);
                date = new Date(gregorianYear, parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }

            throw new Error('Unable to parse date');

        } catch (error) {
            throw new Error(`Date parsing failed: ${error.message}`);
        }
    }

    /**
     * Get time zones
     */
    getTimezone() {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    /**
     * Convert to timezone
     */
    toTimezone(date, timezone = 'Asia/Bangkok') {
        try {
            const d = new Date(date);
            return new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).format(d);

        } catch (error) {
            throw new Error(`Timezone conversion failed: ${error.message}`);
        }
    }
}

// ================================================================

// backend/src/utils/common/StringHelper.js
/**
 * String Helper Utility
 * จัดการการประมวลผลข้อความและการจัดรูปแบบ
 * รองรับภาษาไทยและการประมวลผลข้อความขั้นสูง
 */
export class StringHelper {
    constructor() {
        // Thai character ranges
        this.thaiCharRange = /[\u0E00-\u0E7F]/;
        this.thaiVowels = /[\u0E30-\u0E4F]/;
        this.thaiConsonants = /[\u0E01-\u0E2E]/;

        // Common patterns
        this.emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        this.phonePattern = /^(\+66|0)[0-9]{8,9}$/;
        this.urlPattern = /^https?:\/\/.+/;
    }

    /**
     * Capitalize first letter
     */
    capitalize(str) {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Title case (capitalize each word)
     */
    titleCase(str) {
        if (!str || typeof str !== 'string') return '';
        return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Camel case
     */
    camelCase(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
                return index === 0 ? word.toLowerCase() : word.toUpperCase();
            })
            .replace(/\s+/g, '');
    }

    /**
     * Pascal case
     */
    pascalCase(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .replace(/(?:^\w|[A-Z]|\b\w)/g, word => word.toUpperCase())
            .replace(/\s+/g, '');
    }

    /**
     * Snake case
     */
    snakeCase(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .replace(/\W+/g, ' ')
            .split(/ |\B(?=[A-Z])/)
            .map(word => word.toLowerCase())
            .join('_');
    }

    /**
     * Kebab case
     */
    kebabCase(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .replace(/\W+/g, ' ')
            .split(/ |\B(?=[A-Z])/)
            .map(word => word.toLowerCase())
            .join('-');
    }

    /**
     * Remove extra whitespace
     */
    normalizeWhitespace(str) {
        if (!str || typeof str !== 'string') return '';
        return str.replace(/\s+/g, ' ').trim();
    }

    /**
     * Truncate string with ellipsis
     */
    truncate(str, length = 100, suffix = '...') {
        if (!str || typeof str !== 'string') return '';
        if (str.length <= length) return str;

        const truncated = str.substring(0, length - suffix.length);
        const lastSpaceIndex = truncated.lastIndexOf(' ');

        // Try to break at word boundary
        if (lastSpaceIndex > length * 0.75) {
            return truncated.substring(0, lastSpaceIndex) + suffix;
        }

        return truncated + suffix;
    }

    /**
     * Extract words from string
     */
    extractWords(str) {
        if (!str || typeof str !== 'string') return [];

        // Handle Thai text differently
        if (this.containsThai(str)) {
            // Simple Thai word extraction (not perfect but functional)
            return str.match(/[\u0E00-\u0E7F]+/g) || [];
        }

        return str.match(/\b\w+\b/g) || [];
    }

    /**
     * Count words
     */
    wordCount(str) {
        return this.extractWords(str).length;
    }

    /**
     * Count characters (excluding whitespace)
     */
    charCount(str, includeSpaces = false) {
        if (!str || typeof str !== 'string') return 0;
        return includeSpaces ? str.length : str.replace(/\s/g, '').length;
    }

    /**
     * Check if string contains Thai characters
     */
    containsThai(str) {
        if (!str || typeof str !== 'string') return false;
        return this.thaiCharRange.test(str);
    }

    /**
     * Remove Thai tone marks
     */
    removeToneMarks(str) {
        if (!str || typeof str !== 'string') return '';
        // Remove Thai tone marks and some diacritics
        return str.replace(/[\u0E48-\u0E4B]/g, '');
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        return this.emailPattern.test(email.toLowerCase());
    }

    /**
     * Validate Thai phone number
     */
    isValidThaiPhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        const cleaned = phone.replace(/\s|-/g, '');
        return this.phonePattern.test(cleaned);
    }

    /**
     * Validate URL
     */
    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;
        return this.urlPattern.test(url);
    }

    /**
     * Format phone number (Thai format)
     */
    formatThaiPhone(phone) {
        if (!phone || typeof phone !== 'string') return '';

        const cleaned = phone.replace(/\D/g, '');

        // Remove country code if present
        let number = cleaned;
        if (number.startsWith('66') && number.length === 11) {
            number = '0' + number.substring(2);
        }

        if (number.length === 10 && number.startsWith('0')) {
            return `${number.substring(0, 3)}-${number.substring(3, 6)}-${number.substring(6)}`;
        }

        return phone;
    }

    /**
     * Generate slug from string
     */
    generateSlug(str) {
        if (!str || typeof str !== 'string') return '';

        return str
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .trim('-'); // Remove leading/trailing hyphens
    }

    /**
     * Escape HTML characters
     */
    escapeHtml(str) {
        if (!str || typeof str !== 'string') return '';

        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };

        return str.replace(/[&<>"'/]/g, char => htmlEscapes[char]);
    }

    /**
     * Unescape HTML characters
     */
    unescapeHtml(str) {
        if (!str || typeof str !== 'string') return '';

        const htmlUnescapes = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#x27;': "'",
            '&#x2F;': '/'
        };

        return str.replace(/&(?:amp|lt|gt|quot|#x27|#x2F);/g, entity => htmlUnescapes[entity] || entity);
    }

    /**
     * Remove HTML tags
     */
    stripHtml(str) {
        if (!str || typeof str !== 'string') return '';
        return str.replace(/<[^>]*>/g, '');
    }

    /**
     * Highlight search terms in text
     */
    highlight(text, searchTerm, className = 'highlight') {
        if (!text || !searchTerm || typeof text !== 'string') return text;

        const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
        return text.replace(regex, `<span class="${className}">$1</span>`);
    }

    /**
     * Escape regex special characters
     */
    escapeRegex(str) {
        if (!str || typeof str !== 'string') return '';
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Calculate string similarity (simple implementation)
     */
    similarity(str1, str2) {
        if (!str1 || !str2 || typeof str1 !== 'string' || typeof str2 !== 'string') {
            return 0;
        }

        if (str1 === str2) return 1;

        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1;

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Generate random string
     */
    generateRandom(length = 10, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }

    /**
     * Generate UUID v4
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Mask sensitive information
     */
    mask(str, visibleChars = 3, maskChar = '*') {
        if (!str || typeof str !== 'string') return '';
        if (str.length <= visibleChars * 2) return maskChar.repeat(str.length);

        const start = str.substring(0, visibleChars);
        const end = str.substring(str.length - visibleChars);
        const middle = maskChar.repeat(str.length - (visibleChars * 2));

        return start + middle + end;
    }

    /**
     * Extract mentions (@username)
     */
    extractMentions(str) {
        if (!str || typeof str !== 'string') return [];
        const mentions = str.match(/@[a-zA-Z0-9_]+/g) || [];
        return mentions.map(mention => mention.substring(1));
    }

    /**
     * Extract hashtags (#hashtag)
     */
    extractHashtags(str) {
        if (!str || typeof str !== 'string') return [];
        const hashtags = str.match(/#[a-zA-Z0-9_\u0E00-\u0E7F]+/g) || [];
        return hashtags.map(hashtag => hashtag.substring(1));
    }

    /**
     * Extract URLs from text
     */
    extractUrls(str) {
        if (!str || typeof str !== 'string') return [];
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return str.match(urlRegex) || [];
    }
}

// Create singleton instances
export const dateHelper = new DateHelper();
export const stringHelper = new StringHelper();

// Export default instances
export default { DateHelper, StringHelper, dateHelper, stringHelper };