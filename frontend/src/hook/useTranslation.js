import { useLanguage } from '../context/LanguageContext';
import enTranslations from '../translations/en';
import thTranslations from '../translations/th';

export const useTranslation = () => {
  const { language } = useLanguage();

  // เลือกไฟล์แปลตามภาษาปัจจุบัน
  const translations = language === 'en' ? enTranslations : thTranslations;

  // ฟังก์ชันสำหรับแปลข้อความ
  const t = (key) => {
    // แยก key ด้วยจุด (เช่น 'home.welcome' => ['home', 'welcome'])
    const keys = key.split('.');
    
    // ค้นหาข้อความแปลในโครงสร้าง nested object
    let translation = translations;
    for (const k of keys) {
      translation = translation[k];
      // หากไม่พบการแปล ให้ส่งคืน key
      if (translation === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    return translation;
  };

  return { t };
};