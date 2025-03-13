const translations = {
    // Common
    app: {
      name: "ระบบสร้างข้อสอบซิกแนลสคูล",
      teacherAssistant: "ผู้ช่วยอาจารย์",
      welcome: "ยินดีต้อนรับสู่",
      description: "สร้างข้อสอบแบบมืออาชีพในเวลาไม่กี่วินาที",
      poweredBy: "ขับเคลื่อนด้วย AI",
      poweredByDescription: "ระบบสร้างข้อสอบซิกแนลสคูลใช้ AI ขั้นสูงในการสร้างข้อสอบที่มีคุณภาพสูงสำหรับทุกวิชา"
    },
  
    // Navigation
    nav: {
      home: "หน้าหลัก",
      createNew: "สร้างใหม่",
      myLibrary: "คลังข้อสอบ",
      collapse: "ย่อ"
    },
  
    // Home Page
    home: {
      greeting: "สวัสดี พรสุพัฒน์! 👋",
      createNewTitle: "สร้างข้อสอบใหม่",
      createNewDescription: "สร้างข้อสอบใหม่โดยใช้ AI เพื่อสร้างคำถามตามหัวข้อของคุณ",
      getStarted: "เริ่มต้นใช้งาน",
      libraryTitle: "คลังข้อสอบของฉัน",
      libraryDescription: "เข้าถึงข้อสอบที่คุณเคยสร้างไว้และจัดการคอลเลกชันของคุณ",
      viewLibrary: "ดูคลังข้อสอบ"
    },
  
    // Create Quiz Page
    create: {
      title: "สร้างข้อสอบใหม่",
      topicLabel: "หัวข้อของคุณ",
      topicPlaceholder: "ระบุหัวข้อหรือวิชาที่ต้องการสร้างข้อสอบ",
      topicRequired: "กรุณาระบุหัวข้อ",
      typeLabel: "ประเภทข้อสอบ",
      multipleChoice: "ปรนัย",
      essay: "อัตนัย",
      questionCountLabel: "จำนวนข้อสอบ",
      studentLevelLabel: "ระดับผู้เรียน (ไม่บังคับ)",
      studentLevelPlaceholder: "เช่น มัธยมศึกษา, มหาวิทยาลัย, ผู้เริ่มต้น",
      instructionsLabel: "คำแนะนำเพิ่มเติม (ไม่บังคับ)",
      instructionsPlaceholder: "ระบุคำแนะนำหรือรายละเอียดเฉพาะเกี่ยวกับเนื้อหาข้อสอบ",
      generateButton: "สร้างข้อสอบ",
      generating: "กำลังสร้างข้อสอบ..."
    },
  
    // Quiz Result Page
    result: {
      generatedQuiz: "ข้อสอบที่สร้าง:",
      questions: "ข้อ",
      level: "ระดับ:",
      question: "ข้อที่",
      explanation: "คำอธิบาย:",
      saveQuiz: "บันทึกข้อสอบ",
      saving: "กำลังบันทึก...",
      generateMore: "สร้างข้อสอบเพิ่มอีก 10 ข้อ",
      generating: "กำลังสร้างข้อสอบเพิ่มเติม...",
      successMessage: "เพิ่มข้อสอบอีก 10 ข้อสำเร็จแล้ว! เลื่อนลงเพื่อดูข้อสอบใหม่",
      moreQuestionsInfo: "การสร้างข้อสอบเพิ่มเติมจะใช้หัวข้อและเงื่อนไขเดียวกับข้อสอบชุดแรก แต่จะพยายามสร้างข้อสอบไม่ซ้ำกับชุดแรก",
      saveModalTitle: "บันทึกข้อสอบ",
      saveModalLabel: "ชื่อชุดข้อสอบ",
      saveModalPlaceholder: "กรอกชื่อชุดข้อสอบของคุณ",
      saveModalRequired: "กรุณากรอกชื่อชุดข้อสอบ",
      cancel: "ยกเลิก",
      save: "บันทึก"
    },
  
    // Library Page
    library: {
      title: "คลังข้อสอบของฉัน",
      createNew: "สร้างข้อสอบใหม่",
      noQuizzes: "คุณยังไม่มีข้อสอบ",
      noQuizzesDescription: "สร้างข้อสอบแรกของคุณเพื่อเริ่มต้น",
      created: "สร้างเมื่อ:",
      view: "ดู",
      edit: "แก้ไขชื่อ",
      delete: "ลบ",
      deleting: "กำลังลบ...",
      deleteModalTitle: "ลบข้อสอบ",
      deleteModalMessage: "คุณแน่ใจหรือไม่ว่าต้องการลบข้อสอบนี้? การกระทำนี้ไม่สามารถย้อนกลับได้",
      renameModalTitle: "แก้ไขชื่อข้อสอบ",
      renameModalLabel: "ชื่อข้อสอบใหม่",
      renameModalPlaceholder: "กรอกชื่อข้อสอบใหม่",
      renameModalRequired: "กรุณากรอกชื่อข้อสอบใหม่",
      renaming: "กำลังบันทึก..."
    },
  
    // View Quiz Page
    view: {
      back: "กลับไปคลังข้อสอบ",
      print: "พิมพ์ข้อสอบ",
      topic: "หัวข้อ:",
      created: "สร้างเมื่อ:",
      questions: "จำนวนข้อ:",
      question: "ข้อที่",
      explanation: "คำอธิบาย:"
    },
  
    // Languages
    languages: {
      en: "English",
      th: "ไทย"
    }
  };
  
  export default translations;