// utils/pdfProcessor.js
const pdf = require('pdf-parse');
const fs = require('fs');

class PDFProcessor {
  static async extractTextFromPDF(pdfPath) {
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdf(dataBuffer);
      
      return {
        text: data.text,
        pages: data.numpages,
        info: data.info
      };
    } catch (error) {
      throw new Error('Failed to extract text from PDF: ' + error.message);
    }
  }

  static async generateQuizFromText(text, settings) {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
      Based on the following text content, create ${settings.questionCount} quiz questions:
      
      CONTENT:
      ${text}
      
      REQUIREMENTS:
      - Language: ${settings.language}
      - Difficulty: ${settings.difficulty}
      - Question Type: ${settings.questionType}
      - Focus on key concepts and important information
      
      Return JSON format with questions array.
    `;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  }
}

module.exports = PDFProcessor;