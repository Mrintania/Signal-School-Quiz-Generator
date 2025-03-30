import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ตั้งค่า dotenv
dotenv.config();

// ได้ __dirname ในบริบทของ ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createAdmin() {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'quiz_generator'
    });

    // ข้อมูลผู้ดูแลระบบ
    const admin = {
      first_name: 'Pornsupat',
      last_name: 'Vutisuwan',
      email: 'babylony@signalschool.ac.th',
      password: 'password1234',
      role: 'admin',
      status: 'active',
      email_verified: true
    };

    // เข้ารหัสรหัสผ่าน
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(admin.password, saltRounds);

    // สร้างคำสั่ง SQL
    const sql = `
      INSERT INTO users 
      (first_name, last_name, email, password_hash, role, status, email_verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    // ทำการ insert
    const [result] = await connection.execute(sql, [
      admin.first_name,
      admin.last_name,
      admin.email,
      passwordHash,
      admin.role,
      admin.status,
      admin.email_verified
    ]);

    const userId = result.insertId;
    console.log(`Admin user created with ID: ${userId}`);

    // สร้าง user_settings สำหรับ admin
    await connection.execute(
      'INSERT INTO user_settings (user_id) VALUES (?)',
      [userId]
    );

    // สร้าง user_quotas สำหรับ admin
    await connection.execute(
      'INSERT INTO user_quotas (user_id) VALUES (?)',
      [userId]
    );

    console.log('Admin user settings and quotas created');
    await connection.end();

  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdmin();