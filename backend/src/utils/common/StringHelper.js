// src/utils/common/StringHelper.js

/**
 * ฟังก์ชันช่วยเหลือสำหรับการจัดการ String
 * สำหรับโรงเรียนทหารสื่อสาร กรมการทหารสื่อสาร
 */

/**
 * แปลงข้อความเป็นรูปแบบ Title Case
 * @param {string} str - ข้อความที่ต้องการแปลง
 * @returns {string} ข้อความในรูปแบบ Title Case
 */
export const toTitleCase = (str) => {
    if (!str || typeof str !== 'string') return '';

    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * แปลงข้อความเป็นรูปแบบ Slug สำหรับ URL
 * @param {string} str - ข้อความที่ต้องการแปลง
 * @returns {string} ข้อความในรูปแบบ slug
 */
export const toSlug = (str) => {
    if (!str || typeof str !== 'string') return '';

    return str
        .toLowerCase()
        .replace(/[\u0E00-\u0E7F]/g, (match) => {
            // แปลงตัวอักษรไทยเป็น romanized
            const thaiToRoman = {
                'ก': 'k', 'ข': 'kh', 'ค': 'kh', 'ง': 'ng',
                'จ': 'ch', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's',
                'ญ': 'y', 'ด': 'd', 'ต': 't', 'ถ': 'th',
                'ท': 'th', 'ธ': 'th', 'น': 'n', 'บ': 'b',
                'ป': 'p', 'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph',
                'ฟ': 'f', 'ภ': 'ph', 'ม': 'm', 'ย': 'y',
                'ร': 'r', 'ล': 'l', 'ว': 'w', 'ศ': 's',
                'ษ': 's', 'ส': 's', 'ห': 'h', 'ฬ': 'l',
                'อ': 'o', 'ฮ': 'h'
            };
            return thaiToRoman[match] || match;
        })
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
};

/**
 * ตรวจสอบว่าข้อความเป็นอีเมลหรือไม่
 * @param {string} email - อีเมลที่ต้องการตรวจสอบ
 * @returns {boolean} true ถ้าเป็นอีเมลที่ถูกต้อง
 */
export const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * ตัดข้อความให้มีความยาวที่กำหนด
 * @param {string} str - ข้อความที่ต้องการตัด
 * @param {number} length - ความยาวที่ต้องการ
 * @param {string} suffix - ข้อความที่ต่อท้าย (default: '...')
 * @returns {string} ข้อความที่ถูกตัด
 */
export const truncate = (str, length = 100, suffix = '...') => {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= length) return str;

    return str.substring(0, length).trim() + suffix;
};

/**
 * ลบ HTML tags ออกจากข้อความ
 * @param {string} str - ข้อความที่มี HTML tags
 * @returns {string} ข้อความที่ไม่มี HTML tags
 */
export const stripHtml = (str) => {
    if (!str || typeof str !== 'string') return '';

    return str.replace(/<[^>]*>/g, '');
};

/**
 * แปลงข้อความให้เป็น camelCase
 * @param {string} str - ข้อความที่ต้องการแปลง
 * @returns {string} ข้อความในรูปแบบ camelCase
 */
export const toCamelCase = (str) => {
    if (!str || typeof str !== 'string') return '';

    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, '');
};

/**
 * แปลงข้อความให้เป็น kebab-case
 * @param {string} str - ข้อความที่ต้องการแปลง
 * @returns {string} ข้อความในรูปแบบ kebab-case
 */
export const toKebabCase = (str) => {
    if (!str || typeof str !== 'string') return '';

    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/\s+/g, '-')
        .toLowerCase();
};

/**
 * ลบช่องว่างส่วนเกินออกจากข้อความ
 * @param {string} str - ข้อความที่ต้องการปรับแต่ง
 * @returns {string} ข้อความที่ถูกปรับแต่งแล้ว
 */
export const cleanWhitespace = (str) => {
    if (!str || typeof str !== 'string') return '';

    return str
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * สุ่มสร้าง ID ที่ไม่ซ้ำกัน
 * @param {number} length - ความยาวของ ID (default: 8)
 * @returns {string} ID ที่สุ่มสร้าง
 */
export const generateRandomId = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
};

/**
 * แปลงข้อความเป็นตัวเลข
 * @param {string} str - ข้อความที่ต้องการแปลง
 * @param {number} defaultValue - ค่าเริ่มต้นถ้าแปลงไม่ได้
 * @returns {number} ตัวเลขที่แปลงได้
 */
export const toNumber = (str, defaultValue = 0) => {
    if (typeof str === 'number') return str;
    if (!str || typeof str !== 'string') return defaultValue;

    const num = parseFloat(str);
    return isNaN(num) ? defaultValue : num;
};

/**
 * ตรวจสอบว่าข้อความว่างเปล่าหรือไม่
 * @param {string} str - ข้อความที่ต้องการตรวจสอบ
 * @returns {boolean} true ถ้าข้อความว่างเปล่า
 */
export const isEmpty = (str) => {
    return !str || str.trim().length === 0;
};

/**
 * ฟอร์แมตตัวเลขให้มีจุลภาค
 * @param {number|string} num - ตัวเลขที่ต้องการฟอร์แมต
 * @returns {string} ตัวเลขที่ฟอร์แมตแล้ว
 */
export const formatNumber = (num) => {
    if (!num && num !== 0) return '0';

    return Number(num).toLocaleString('th-TH');
};

/**
 * แปลงข้อความเป็นรูปแบบ sentence case
 * @param {string} str - ข้อความที่ต้องการแปลง
 * @returns {string} ข้อความในรูปแบบ sentence case
 */
export const toSentenceCase = (str) => {
    if (!str || typeof str !== 'string') return '';

    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * สร้างข้อความสำหรับแสดงเวลาที่ผ่านมา
 * @param {Date|string} date - วันที่ที่ต้องการเปรียบเทียบ
 * @returns {string} ข้อความเวลาที่ผ่านมา
 */
export const timeAgo = (date) => {
    if (!date) return '';

    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return 'เมื่อสักครู่';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} เดือนที่แล้ว`;

    return `${Math.floor(diffInSeconds / 31536000)} ปีที่แล้ว`;
};

// ส่งออกทั้งหมดเป็น default object
export default {
    toTitleCase,
    toSlug,
    isValidEmail,
    truncate,
    stripHtml,
    toCamelCase,
    toKebabCase,
    cleanWhitespace,
    generateRandomId,
    toNumber,
    isEmpty,
    formatNumber,
    toSentenceCase,
    timeAgo
};