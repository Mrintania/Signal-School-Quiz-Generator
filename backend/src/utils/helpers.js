// src/utils/helpers.js
// ฟังก์ชันช่วยเหลือทั่วไปสำหรับระบบ Quiz Generator

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

/**
 * Async error handler wrapper
 * @param {Function} fn - ฟังก์ชัน async ที่ต้องการจัดการ error
 * @returns {Function} ฟังก์ชันที่จัดการ error แล้ว
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * สร้าง response object มาตรฐาน
 * @param {boolean} success - สถานะความสำเร็จ
 * @param {string} message - ข้อความ
 * @param {any} data - ข้อมูล
 * @param {any} meta - metadata เพิ่มเติม
 * @returns {Object} response object
 */
export const createResponse = (success = true, message = '', data = null, meta = null) => {
    const response = {
        success,
        message,
        timestamp: new Date().toISOString()
    };

    if (data !== null) {
        response.data = data;
    }

    if (meta !== null) {
        response.meta = meta;
    }

    return response;
};

/**
 * ตรวจสอบว่า ID เป็น ObjectId ที่ถูกต้องหรือไม่
 * @param {string} id - ID ที่ต้องการตรวจสอบ
 * @returns {boolean} true ถ้าเป็น ObjectId ที่ถูกต้อง
 */
export const validateObjectId = (id) => {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
};

/**
 * สร้าง JWT token
 * @param {Object} payload - ข้อมูลที่ต้องการเก็บใน token
 * @param {string} secret - secret key
 * @param {string} expiresIn - อายุของ token
 * @returns {string} JWT token
 */
export const generateToken = (payload, secret = process.env.JWT_SECRET, expiresIn = '7d') => {
    return jwt.sign(payload, secret, { expiresIn });
};

/**
 * แฮชรหัสผ่าน
 * @param {string} password - รหัสผ่านที่ต้องการแฮช
 * @param {number} saltRounds - จำนวนรอบการแฮช
 * @returns {Promise<string>} รหัสผ่านที่แฮชแล้ว
 */
export const hashPassword = async (password, saltRounds = 12) => {
    return await bcrypt.hash(password, saltRounds);
};

/**
 * เปรียบเทียบรหัสผ่าน
 * @param {string} password - รหัสผ่านที่ไม่ได้แฮช
 * @param {string} hashedPassword - รหัสผ่านที่แฮชแล้ว
 * @returns {Promise<boolean>} true ถ้ารหัสผ่านตรงกัน
 */
export const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

/**
 * ฟอร์แมตวันที่
 * @param {Date|string} date - วันที่ที่ต้องการฟอร์แมต
 * @param {string} format - รูปแบบที่ต้องการ
 * @returns {string} วันที่ที่ฟอร์แมตแล้ว
 */
export const formatDate = (date, format = 'DD/MM/YYYY HH:mm') => {
    return moment(date).format(format);
};

/**
 * คำนวณ pagination
 * @param {number} page - หน้าปัจจุบัน
 * @param {number} limit - จำนวนรายการต่อหน้า
 * @param {number} total - จำนวนรายการทั้งหมด
 * @returns {Object} ข้อมูล pagination
 */
export const calculatePagination = (page = 1, limit = 10, total = 0) => {
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    return {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
        offset
    };
};

/**
 * ทำความสะอาดข้อมูล input
 * @param {string} input - ข้อมูลที่ต้องการทำความสะอาด
 * @returns {string} ข้อมูลที่ทำความสะอาดแล้ว
 */
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;

    return input
        .trim()
        .replace(/[<>]/g, '') // ลบ HTML tags พื้นฐาน
        .replace(/javascript:/gi, '') // ลบ javascript: protocol
        .replace(/on\w+=/gi, ''); // ลบ event handlers
};

/**
 * สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
 * @param {string} originalName - ชื่อไฟล์เดิม
 * @param {string} prefix - คำนำหน้า
 * @returns {string} ชื่อไฟล์ใหม่
 */
export const generateFileName = (originalName, prefix = 'file') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();

    return `${prefix}_${timestamp}_${random}.${extension}`;
};

/**
 * แปลงไฟล์เป็น base64
 * @param {Buffer} fileBuffer - buffer ของไฟล์
 * @returns {string} ข้อมูล base64
 */
export const fileToBase64 = (fileBuffer) => {
    return fileBuffer.toString('base64');
};

/**
 * ตรวจสอบขนาดไฟล์
 * @param {number} fileSize - ขนาดไฟล์ (bytes)
 * @param {number} maxSize - ขนาดสูงสุดที่อนุญาต (bytes)
 * @returns {boolean} true ถ้าขนาดไฟล์ไม่เกินที่กำหนด
 */
export const isValidFileSize = (fileSize, maxSize = 10 * 1024 * 1024) => {
    return fileSize <= maxSize;
};

/**
 * แปลงข้อมูลเป็น JSON safely
 * @param {any} data - ข้อมูลที่ต้องการแปลง
 * @param {any} fallback - ค่าเริ่มต้นถ้าแปลงไม่ได้
 * @returns {any} ข้อมูลที่แปลงแล้ว
 */
export const safeJsonParse = (data, fallback = null) => {
    try {
        return JSON.parse(data);
    } catch (error) {
        return fallback;
    }
};

/**
 * สร้าง slug สำหรับ URL จากข้อความไทย-อังกฤษ
 * @param {string} text - ข้อความที่ต้องการแปลง
 * @returns {string} slug ที่สร้างแล้ว
 */
export const createSlug = (text) => {
    if (!text) return '';

    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\u0E00-\u0E7F]/g, '') // ลบตัวอักษรไทย
        .replace(/[^\w\s-]/g, '') // ลบ special characters
        .replace(/\s+/g, '-') // แปลงช่องว่างเป็น -
        .replace(/-+/g, '-') // ลบ - ซ้ำ
        .replace(/^-+|-+$/g, ''); // ลบ - ที่หัวและท้าย
};

/**
 * สุ่มสร้างรหัสผ่าน
 * @param {number} length - ความยาวของรหัสผ่าน
 * @param {boolean} includeSymbols - รวมสัญลักษณ์หรือไม่
 * @returns {string} รหัสผ่านที่สุ่มสร้าง
 */
export const generateRandomPassword = (length = 12, includeSymbols = true) => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let chars = lowercase + uppercase + numbers;
    if (includeSymbols) {
        chars += symbols;
    }

    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
};

/**
 * ตรวจสอบความแรงของรหัสผ่าน
 * @param {string} password - รหัสผ่านที่ต้องการตรวจสอบ
 * @returns {Object} ผลการตรวจสอบ
 */
export const checkPasswordStrength = (password) => {
    const checks = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        numbers: /\d/.test(password),
        symbols: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;

    let strength = 'อ่อนมาก';
    if (score >= 4) strength = 'แข็งแกร่ง';
    else if (score >= 3) strength = 'ปานกลาง';
    else if (score >= 2) strength = 'อ่อน';

    return {
        score,
        strength,
        checks,
        isValid: score >= 3
    };
};

/**
 * สร้าง UUID
 * @returns {string} UUID ที่สร้างแล้ว
 */
export const generateUUID = () => {
    return uuidv4();
};

/**
 * ล้างข้อมูล object จากค่า null, undefined และ empty string
 * @param {Object} obj - object ที่ต้องการล้าง
 * @returns {Object} object ที่ล้างแล้ว
 */
export const cleanObject = (obj) => {
    const cleaned = {};

    for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined && value !== '') {
            cleaned[key] = value;
        }
    }

    return cleaned;
};

// ส่งออกทั้งหมดเป็น default object
export default {
    asyncHandler,
    createResponse,
    validateObjectId,
    generateToken,
    hashPassword,
    comparePassword,
    formatDate,
    calculatePagination,
    sanitizeInput,
    generateFileName,
    fileToBase64,
    isValidFileSize,
    safeJsonParse,
    createSlug,
    generateRandomPassword,
    checkPasswordStrength,
    generateUUID,
    cleanObject
};