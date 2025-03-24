const sampleTopics = [
    "คณิตศาสตร์: เลขยกกำลังและราก",
    "คณิตศาสตร์: สมการเชิงเส้นตัวแปรเดียว",
    "คณิตศาสตร์: อัตราส่วนและร้อยละ",
    "คณิตศาสตร์: เวกเตอร์และการประยุกต์",
    "คณิตศาสตร์: ความน่าจะเป็นและสถิติ",
    "คณิตศาสตร์: ตรีโกณมิติพื้นฐาน",
    "คณิตศาสตร์: เมทริกซ์และดีเทอร์มิแนนต์",
    "คณิตศาสตร์: ลำดับและอนุกรม",
    "คณิตศาสตร์: การแก้ระบบสมการเชิงเส้น",
    "คณิตศาสตร์: แคลคูลัสเบื้องต้น",

    "ฟิสิกส์: กฎของโอห์มและการไหลของกระแสไฟฟ้า",
    "ฟิสิกส์: คลื่นกลและเสียง",
    "ฟิสิกส์: ทฤษฎีสัมพัทธภาพพิเศษ",
    "ฟิสิกส์: การเคลื่อนที่แบบโปรเจกไทล์",
    "ฟิสิกส์: พลังงานกลและการอนุรักษ์พลังงาน",

    "ชีววิทยา: โครงสร้างของเซลล์พืชและสัตว์",
    "ชีววิทยา: การสังเคราะห์ด้วยแสงของพืช",
    "ชีววิทยา: ระบบย่อยอาหารของมนุษย์",
    "ชีววิทยา: วัฏจักรของน้ำในระบบนิเวศ",
    "ชีววิทยา: DNA และพันธุกรรม",

    "เคมี: สมดุลเคมีและปฏิกิริยาเคมี",
    "เคมี: กรด-เบส และ pH",
    "เคมี: ปฏิกิริยาออกซิเดชัน-รีดักชัน",
    "เคมี: พอลิเมอร์และการใช้งาน",
    "เคมี: กฎของแก๊สและพลศาสตร์ของของไหล",

    "สังคมศึกษา: ระบบนิเวศและสิ่งแวดล้อม",
    "สังคมศึกษา: ประชากรศาสตร์และการเปลี่ยนแปลงของประชากร",
    "สังคมศึกษา: วิกฤติการณ์เศรษฐกิจโลก",

    "ประวัติศาสตร์: สงครามโลกครั้งที่ 2",
    "ประวัติศาสตร์: การล่าอาณานิคมในเอเชีย",
    "ประวัติศาสตร์: อารยธรรมอียิปต์โบราณ",
    "ประวัติศาสตร์: ปฏิวัติอุตสาหกรรมในยุโรป",
    "ประวัติศาสตร์: สงครามเย็นและผลกระทบ",

    "ภาษาไทย: การวิเคราะห์บทกวีและโคลง",
    "ภาษาไทย: ประโยคซับซ้อนและโครงสร้างประโยค",
    "ภาษาไทย: ศิลปะการใช้ถ้อยคำในวรรณกรรม",

    "ภาษาอังกฤษ: Present Perfect Tense",
    "ภาษาอังกฤษ: การเขียน Essay และการใช้ Transition Words",
    "ภาษาอังกฤษ: การฟังและจับใจความสำคัญจากบทสนทนา",

    "วิทยาการคำนวณ: พื้นฐานอัลกอริทึมและโครงสร้างข้อมูล",
    "วิทยาการคำนวณ: การพัฒนาเว็บด้วย HTML และ CSS",
    "วิทยาการคำนวณ: การใช้งาน JavaScript เบื้องต้น",
    "วิทยาการคำนวณ: การใช้ Python ใน Data Science",
    "วิทยาการคำนวณ: การออกแบบ UX/UI สำหรับแอปพลิเคชัน",

    "ศิลปะ: เทคนิคสีน้ำและสีน้ำมัน",
    "ศิลปะ: ศิลปะเรอเนสซองส์และศิลปินสำคัญ",

    "ดนตรี: โน้ตดนตรีและการอ่านโน้ตพื้นฐาน",
    "ดนตรี: ประวัติและวิวัฒนาการของดนตรีแจ๊ส"
];

const handleIdeasClick = (setFormData, setActiveSource) => {
    // สุ่มเลือกหัวข้อหนึ่งจากรายการ
    const randomTopic = sampleTopics[Math.floor(Math.random() * sampleTopics.length)];

    // อัปเดต state และเปลี่ยนแท็บไปที่ Topic
    setFormData(prevData => ({
        ...prevData,
        topic: randomTopic
    }));

    setActiveSource('topic');
};

// export
export { sampleTopics, handleIdeasClick };