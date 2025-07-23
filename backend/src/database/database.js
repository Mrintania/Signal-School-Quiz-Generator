// src/database/database.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
let db = null;

export const initDatabase = async () => {
    try {
        // สร้างเส้นทางไปยังไฟล์ database
        const dbPath = path.join(__dirname, '../../data/signal_school_quiz.db');

        // เปิดการเชื่อมต่อฐานข้อมูล
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Enable foreign key constraints
        await db.exec('PRAGMA foreign_keys = ON');

        console.log('📊 Database connected successfully');

        // สร้างตารางทั้งหมด
        await createTables();

        // เพิ่มข้อมูลเริ่มต้น
        await seedInitialData();

        return db;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
};

const createTables = async () => {
    try {
        // Users table - ผู้ใช้งานระบบ
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                firstName TEXT NOT NULL,
                lastName TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'teacher',
                department TEXT,
                rank TEXT,
                isActive BOOLEAN DEFAULT true,
                lastLogin DATETIME,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Subjects table - วิชาที่สอน
        await db.exec(`
            CREATE TABLE IF NOT EXISTS subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT UNIQUE NOT NULL,
                description TEXT,
                department TEXT NOT NULL,
                level TEXT NOT NULL,
                isActive BOOLEAN DEFAULT true,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Quizzes table - ข้อสอบที่สร้าง
        await db.exec(`
            CREATE TABLE IF NOT EXISTS quizzes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                subject_id INTEGER NOT NULL,
                created_by INTEGER NOT NULL,
                difficulty_level TEXT NOT NULL DEFAULT 'medium',
                question_count INTEGER NOT NULL DEFAULT 10,
                time_limit INTEGER DEFAULT 60,
                quiz_data TEXT NOT NULL,
                status TEXT DEFAULT 'draft',
                tags TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

        // Quiz Sessions table - การทำข้อสอบ
        await db.exec(`
            CREATE TABLE IF NOT EXISTS quiz_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quiz_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                score INTEGER,
                total_questions INTEGER,
                answers TEXT,
                status TEXT DEFAULT 'in_progress',
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // User Sessions table - การจัดการ session
        await db.exec(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        console.log('✅ Database tables created successfully');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
};

const seedInitialData = async () => {
    try {
        // ตรวจสอบว่ามีข้อมูลผู้ใช้แล้วหรือไม่
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', ['babylony@signalschool.ac.th']);

        if (!existingUser) {
            // สร้างผู้ใช้เริ่มต้น
            const bcrypt = await import('bcryptjs');
            const hashedPassword = await bcrypt.hash('password1234', 12);

            await db.run(`
                INSERT INTO users (email, password, firstName, lastName, role, department, rank)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                'babylony@signalschool.ac.th',
                hashedPassword,
                'Babylony',
                'Signal Officer',
                'admin',
                'Signal Department',
                'Captain'
            ]);

            // สร้างข้อมูลวิชาเริ่มต้น
            const subjects = [
                { name: 'การสื่อสารดิจิทัล', code: 'SIGNAL101', description: 'พื้นฐานการสื่อสารดิจิทัล', department: 'Signal Department', level: 'beginner' },
                { name: 'เครือข่ายคอมพิวเตอร์', code: 'NET201', description: 'หลักการเครือข่ายคอมพิวเตอร์', department: 'Signal Department', level: 'intermediate' },
                { name: 'ระบบสื่อสารทหาร', code: 'MILCOM301', description: 'ระบบสื่อสารในกองทัพ', department: 'Signal Department', level: 'advanced' },
                { name: 'ปัญญาประดิษฐ์', code: 'AI401', description: 'หลักการปัญญาประดิษฐ์', department: 'Signal Department', level: 'advanced' },
                { name: 'การรักษาความปลอดภัยไซเบอร์', code: 'CYBER301', description: 'การป้องกันภัยคุกคามไซเบอร์', department: 'Signal Department', level: 'advanced' }
            ];

            for (const subject of subjects) {
                await db.run(`
                    INSERT INTO subjects (name, code, description, department, level)
                    VALUES (?, ?, ?, ?, ?)
                `, [subject.name, subject.code, subject.description, subject.department, subject.level]);
            }

            console.log('✅ Initial data seeded successfully');
            console.log('👤 Default user created: babylony@signalschool.ac.th / password1234');
        } else {
            console.log('✅ Database already contains user data');
        }
    } catch (error) {
        console.error('❌ Error seeding initial data:', error);
        throw error;
    }
};

export const getDatabase = () => {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
};

export const closeDatabase = async () => {
    if (db) {
        await db.close();
        console.log('📊 Database connection closed');
    }
};

export default { initDatabase, getDatabase, closeDatabase };