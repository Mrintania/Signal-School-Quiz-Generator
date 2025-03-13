import React, { createContext, useState, useContext, useEffect } from 'react';

// สร้าง context
const LanguageContext = createContext();

// สร้าง provider component
export const LanguageProvider = ({ children }) => {
  // ตรวจสอบว่ามีภาษาที่บันทึกไว้ใน localStorage หรือไม่
  // ถ้าไม่มี ให้ใช้ภาษาอังกฤษเป็นค่าเริ่มต้น
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage || 'en';
  });

  // บันทึกภาษาที่เลือกลงใน localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // ฟังก์ชันสำหรับเปลี่ยนภาษา
  const toggleLanguage = () => {
    setLanguage(prevLanguage => prevLanguage === 'en' ? 'th' : 'en');
  };

  // ค่าที่จะส่งไปยัง consumers
  const value = {
    language,
    setLanguage,
    toggleLanguage,
    isEnglish: language === 'en',
    isThai: language === 'th'
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

// Custom hook สำหรับใช้ language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
};

export default LanguageContext;