import Quiz from '../models/quiz.js';

class ExportController {
  // ฟังก์ชันสำหรับ export ข้อสอบในรูปแบบ GIFT format สำหรับ Moodle
  static async exportQuizToGift(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: 'Quiz ID is required' 
        });
      }
      
      // ดึงข้อมูลข้อสอบ
      const quiz = await Quiz.getQuizById(id);
      
      if (!quiz) {
        return res.status(404).json({ 
          success: false, 
          message: 'Quiz not found' 
        });
      }
      
      // สร้างเนื้อหาในรูปแบบ GIFT format สำหรับ Moodle
      let giftContent = "";
      
      // เพิ่มรายละเอียดข้อสอบเป็นความเห็น
      giftContent += `// ${quiz.title}\n`;
      giftContent += `// Topic: ${quiz.topic}\n`;
      if (quiz.student_level) {
        giftContent += `// Level: ${quiz.student_level}\n`;
      }
      giftContent += `// Created: ${new Date(quiz.created_at).toLocaleString()}\n\n`;
      
      // เพิ่มคำถามแต่ละข้อ
      quiz.questions.forEach((question, index) => {
        // เพิ่มหมายเลขข้อและคำถาม
        giftContent += `::Question ${index + 1}::[html]${escapeGiftSpecialChars(question.questionText)}\n`;
        
        if (quiz.question_type === 'Multiple Choice') {
          // สำหรับข้อสอบแบบปรนัย
          giftContent += "{\n";
          
          // เพิ่มตัวเลือกในแต่ละข้อ
          question.options.forEach(option => {
            if (option.isCorrect) {
              // ตัวเลือกที่ถูกต้อง
              giftContent += `  =${escapeGiftSpecialChars(option.text)}\n`;
            } else {
              // ตัวเลือกที่ไม่ถูกต้อง
              giftContent += `  ~${escapeGiftSpecialChars(option.text)}\n`;
            }
          });
          
          // เพิ่มคำอธิบาย (ถ้ามี)
          if (question.explanation) {
            giftContent += `  ####${escapeGiftSpecialChars(question.explanation)}\n`;
          }
          
          giftContent += "}\n\n";
        } else {
          // สำหรับข้อสอบแบบอัตนัย
          giftContent += "{\n";
          giftContent += "  // คำตอบอัตนัยไม่มีเฉลยที่แน่นอน ทาง Moodle ต้องตรวจเอง\n";
          
          // เพิ่มคำแนะนำสำหรับการตรวจ
          if (question.explanation) {
            giftContent += `  ####${escapeGiftSpecialChars(question.explanation)}\n`;
          }
          
          giftContent += "}\n\n";
        }
      });
      
      // ตั้งค่า headers สำหรับ download เป็นไฟล์ .txt
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(quiz.title)}_moodle.txt"`);
      
      // ส่งข้อมูลกลับไป
      return res.status(200).send(giftContent);
      
    } catch (error) {
      console.error('Error exporting quiz:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
  
  // ฟังก์ชันสำหรับ export ข้อสอบในรูปแบบ Plain Text ทั่วไป
  static async exportQuizToPlainText(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: 'Quiz ID is required' 
        });
      }
      
      // ดึงข้อมูลข้อสอบ
      const quiz = await Quiz.getQuizById(id);
      
      if (!quiz) {
        return res.status(404).json({ 
          success: false, 
          message: 'Quiz not found' 
        });
      }
      
      // สร้างเนื้อหาในรูปแบบข้อความธรรมดา
      let textContent = "";
      
      // เพิ่มหัวข้อและรายละเอียด
      textContent += `${quiz.title}\n`;
      textContent += `หัวข้อ: ${quiz.topic}\n`;
      if (quiz.student_level) {
        textContent += `ระดับ: ${quiz.student_level}\n`;
      }
      textContent += `วันที่สร้าง: ${new Date(quiz.created_at).toLocaleString()}\n`;
      textContent += `ประเภทข้อสอบ: ${quiz.question_type === 'Multiple Choice' ? 'ปรนัย' : 'อัตนัย'}\n`;
      textContent += `จำนวนข้อ: ${quiz.questions.length}\n\n`;
      
      // เพิ่มคำถามแต่ละข้อ
      quiz.questions.forEach((question, index) => {
        textContent += `ข้อที่ ${index + 1}: ${question.questionText}\n\n`;
        
        if (quiz.question_type === 'Multiple Choice') {
          // สำหรับข้อสอบแบบปรนัย
          question.options.forEach((option, optIndex) => {
            const optionLabel = String.fromCharCode(65 + optIndex); // A, B, C, D, ...
            textContent += `   ${optionLabel}. ${option.text}\n`;
          });
          
          // หาตัวเลือกที่ถูกต้อง
          const correctOption = question.options.findIndex(option => option.isCorrect);
          const correctLabel = String.fromCharCode(65 + correctOption);
          
          textContent += `\nเฉลย: ${correctLabel}\n`;
          
          // เพิ่มคำอธิบาย (ถ้ามี)
          if (question.explanation) {
            textContent += `คำอธิบาย: ${question.explanation}\n`;
          }
        } else {
          // สำหรับข้อสอบแบบอัตนัย
          textContent += "แนวทางคำตอบ/การให้คะแนน:\n";
          
          if (question.explanation) {
            textContent += `${question.explanation}\n`;
          }
        }
        
        textContent += "\n--------------------\n\n";
      });
      
      // ตั้งค่า headers สำหรับ download เป็นไฟล์ .txt
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(quiz.title)}.txt"`);
      
      // ส่งข้อมูลกลับไป
      return res.status(200).send(textContent);
      
    } catch (error) {
      console.error('Error exporting quiz:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
}

// ฟังก์ชันช่วยสำหรับหลีกเลี่ยงอักขระพิเศษใน GIFT format
function escapeGiftSpecialChars(text) {
  if (!text) return '';
  
  // อักขระพิเศษใน GIFT format: ~ = # { } :
  return text
    .replace(/~/g, '\\~')
    .replace(/=/g, '\\=')
    .replace(/#/g, '\\#')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/:/g, '\\:');
}

export default ExportController;