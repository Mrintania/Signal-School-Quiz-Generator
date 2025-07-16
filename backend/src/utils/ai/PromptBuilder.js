// backend/src/utils/ai/PromptBuilder.js
import logger from '../common/Logger.js';

/**
 * AI Prompt Builder
 * สร้าง prompt สำหรับ AI ในการสร้างข้อสอบและการประมวลผลต่างๆ
 * รองรับ Gemini AI และ AI models อื่นๆ
 */
export class PromptBuilder {
    constructor(config = {}) {
        this.config = {
            language: config.language || 'th',
            maxContentLength: config.maxContentLength || 30000,
            defaultQuestionCount: config.defaultQuestionCount || 10,
            ...config
        };

        // Template configurations
        this.templates = {
            systemPrompts: {
                quiz_generator: 'คุณเป็นผู้เชี่ยวชาญในการสร้างข้อสอบการศึกษา ที่มีประสบการณ์ในการออกแบบคำถามที่มีคุณภาพสูงสำหรับนักเรียนและนักศึกษา',
                content_analyzer: 'คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์เนื้อหาทางการศึกษา สามารถประเมินความยากและแยกแยะแนวคิดสำคัญได้',
                quiz_reviewer: 'คุณเป็นผู้เชี่ยวชาญในการตรวจสอบและปรับปรุงคุณภาพข้อสอบ'
            },
            questionTypes: {
                multiple_choice: 'คำถามปรนัยแบบเลือกตอบ (4 ตัวเลือก)',
                true_false: 'คำถามแบบถูก/ผิด',
                fill_in_blank: 'คำถามแบบเติมคำในช่องว่าง',
                essay: 'คำถามแบบอัตนัย',
                matching: 'คำถามแบบจับคู่'
            },
            difficulties: {
                easy: 'ง่าย (เหมาะสำหรับผู้เริ่มต้น)',
                medium: 'ปานกลาง (เหมาะสำหรับผู้มีความรู้พื้นฐาน)',
                hard: 'ยาก (เหมาะสำหรับผู้มีความรู้ขั้นสูง)',
                expert: 'ผู้เชี่ยวชาญ (เหมาะสำหรับผู้เชี่ยวชาญ)'
            }
        };
    }

    /**
     * สร้าง prompt สำหรับการสร้างข้อสอบ
     */
    buildQuizGenerationPrompt(options) {
        try {
            const {
                content,
                questionType = 'multiple_choice',
                questionCount = this.config.defaultQuestionCount,
                difficulty = 'medium',
                subject = '',
                language = this.config.language,
                includeExplanations = false,
                customInstructions = ''
            } = options;

            // Validate inputs
            this.validatePromptInputs(options);

            // Truncate content if too long
            const truncatedContent = this.truncateContent(content);

            const prompt = `${this.templates.systemPrompts.quiz_generator}

**งานที่ต้องทำ:** สร้างข้อสอบจากเนื้อหาที่กำหนด

**เนื้อหาสำหรับสร้างข้อสอบ:**
${truncatedContent}

**ข้อกำหนดการสร้างข้อสอบ:**
- ประเภทคำถาม: ${this.templates.questionTypes[questionType]}
- จำนวนคำถาม: ${questionCount} ข้อ
- ระดับความยาก: ${this.templates.difficulties[difficulty]}
- วิชา/หัวข้อ: ${subject || 'ไม่ระบุ'}
- ภาษา: ${language === 'th' ? 'ภาษาไทย' : 'English'}
${includeExplanations ? '- รวมคำอธิบายเฉลย' : ''}
${customInstructions ? `- คำแนะนำเพิ่มเติม: ${customInstructions}` : ''}

**รูปแบบการตอบกลับ:**
กรุณาส่งคืนในรูปแบบ JSON ดังนี้:

\`\`\`json
{
  "title": "ชื่อข้อสอบที่เหมาะสม",
  "description": "คำอธิบายสั้นๆ เกี่ยวกับข้อสอบ",
  "category": "หมวดหมู่ของข้อสอบ",
  "questions": [
    {
      "question": "ข้อความคำถาม",
      "type": "${questionType}",
      "options": ["ตัวเลือกที่ 1", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3", "ตัวเลือกที่ 4"],
      "correct_answer": "คำตอบที่ถูกต้อง (ต้องเป็นหนึ่งในตัวเลือก)",
      "explanation": "${includeExplanations ? 'คำอธิบายเหตุผลของคำตอบ' : ''}",
      "points": 1,
      "difficulty": "${difficulty}"
    }
  ]
}
\`\`\`

**หลักเกณฑ์สำคัญ:**
${this.getQuestionTypeSpecificRules(questionType)}

**ข้อควรระวัง:**
- คำถามต้องมีความเกี่ยวข้องโดยตรงกับเนื้อหาที่ให้มา
- ตัวเลือกผิดต้องดูน่าเชื่อถือ (plausible distractors)
- คำตอบถูกต้องต้องชัดเจนและไม่กำกวม
- ใช้ภาษาที่เหมาะสมกับกลุ่มเป้าหมาย
- หลีกเลี่ยงคำถามที่เกินเลยไปจากเนื้อหา
- ตรวจสอบความถูกต้องของไวยากรณ์และการสะกดคำ

กรุณาสร้างข้อสอบที่มีคุณภาพสูงและเหมาะสมกับระดับความยากที่กำหนด`;

            logger.debug('Quiz generation prompt built:', {
                questionType,
                questionCount,
                difficulty,
                contentLength: content.length,
                includeExplanations
            });

            return prompt;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'buildQuizGenerationPrompt',
                questionType: options?.questionType,
                questionCount: options?.questionCount
            });
            throw error;
        }
    }

    /**
     * สร้าง prompt สำหรับการสร้างคำถามเพิ่มเติม
     */
    buildAdditionalQuestionsPrompt(options) {
        try {
            const {
                existingQuestions,
                questionType,
                questionCount,
                topic,
                difficulty = 'medium'
            } = options;

            const existingQuestionsText = existingQuestions
                .map((q, index) => `${index + 1}. ${q.question}`)
                .join('\n');

            const prompt = `${this.templates.systemPrompts.quiz_generator}

**งานที่ต้องทำ:** สร้างคำถามเพิ่มเติมสำหรับข้อสอบเรื่อง "${topic}"

**คำถามที่มีอยู่แล้ว:**
${existingQuestionsText}

**ข้อกำหนด:**
- สร้างคำถามเพิ่มเติม ${questionCount} ข้อ
- ประเภทคำถาม: ${this.templates.questionTypes[questionType]}
- ระดับความยาก: ${this.templates.difficulties[difficulty]}
- คำถามใหม่ต้องไม่ซ้ำกับที่มีอยู่
- ควรครอบคลุมแง่มุมอื่นๆ ของหัวข้อ

**รูปแบบการตอบกลับ:**
\`\`\`json
{
  "questions": [
    {
      "question": "ข้อความคำถาม",
      "type": "${questionType}",
      "options": ["ตัวเลือกที่ 1", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3", "ตัวเลือกที่ 4"],
      "correct_answer": "คำตอบที่ถูกต้อง",
      "explanation": "",
      "points": 1,
      "difficulty": "${difficulty}"
    }
  ]
}
\`\`\`

กรุณาสร้างคำถามที่หลากหลายและไม่ซ้ำกับที่มีอยู่`;

            return prompt;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'buildAdditionalQuestionsPrompt',
                questionCount: options?.questionCount,
                topic: options?.topic
            });
            throw error;
        }
    }

    /**
     * สร้าง prompt สำหรับการวิเคราะห์ความยาก
     */
    buildDifficultyAnalysisPrompt(content) {
        try {
            const truncatedContent = this.truncateContent(content);

            const prompt = `${this.templates.systemPrompts.content_analyzer}

**งานที่ต้องทำ:** วิเคราะห์ระดับความยากของเนื้อหาต่อไปนี้

**เนื้อหาที่ต้องวิเคราะห์:**
${truncatedContent}

**หลักเกณฑ์การประเมิน:**
- **ง่าย (easy):** เนื้อหาพื้นฐาน ใช้คำศัพท์ง่าย แนวคิดไม่ซับซ้อน
- **ปานกลาง (medium):** ต้องมีความรู้พื้นฐาน มีแนวคิดที่ค่อนข้างซับซ้อน
- **ยาก (hard):** ต้องมีความรู้ขั้นสูง แนวคิดซับซ้อน ต้องใช้การคิดวิเคราะห์
- **ผู้เชี่ยวชาญ (expert):** ต้องมีความเชี่ยวชาญเฉพาะด้าน แนวคิดขั้นสูงมาก

**รูปแบบการตอบกลับ:**
\`\`\`json
{
  "difficulty_level": "easy|medium|hard|expert",
  "difficulty_score": "คะแนนความยาก 1-10",
  "factors": [
    "ปัจจัยที่ทำให้เนื้อหานี้มีระดับความยากดังกล่าว"
  ],
  "vocabulary_complexity": "ระดับความซับซ้อนของคำศัพท์",
  "concept_complexity": "ระดับความซับซ้อนของแนวคิด",
  "prerequisites": [
    "ความรู้พื้นฐานที่จำเป็นต้องมี"
  ],
  "target_audience": "กลุ่มเป้าหมายที่เหมาะสม",
  "recommendations": [
    "คำแนะนำสำหรับการสอนหรือการเรียน"
  ]
}
\`\`\`

กรุณาวิเคราะห์อย่างละเอียดและให้เหตุผลที่ชัดเจน`;

            return prompt;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'buildDifficultyAnalysisPrompt',
                contentLength: content?.length || 0
            });
            throw error;
        }
    }

    /**
     * สร้าง prompt สำหรับการสกัดแนวคิดหลัก
     */
    buildConceptExtractionPrompt(content, maxConcepts = 10) {
        try {
            const truncatedContent = this.truncateContent(content);

            const prompt = `${this.templates.systemPrompts.content_analyzer}

**งานที่ต้องทำ:** สกัดแนวคิดหลักจากเนื้อหาต่อไปนี้

**เนื้อหา:**
${truncatedContent}

**ข้อกำหนด:**
- สกัดแนวคิดหลักสูงสุด ${maxConcepts} แนวคิด
- จัดเรียงตามความสำคัญ (สำคัญที่สุดก่อน)
- ระบุความสัมพันธ์ระหว่างแนวคิด

**รูปแบบการตอบกลับ:**
\`\`\`json
{
  "main_concepts": [
    {
      "name": "ชื่อแนวคิด",
      "description": "คำอธิบายสั้นๆ",
      "importance": "high|medium|low",
      "category": "หมวดหมู่ของแนวคิด",
      "keywords": ["คำสำคัญ", "ที่เกี่ยวข้อง"],
      "relationships": ["แนวคิดอื่นที่เกี่ยวข้อง"]
    }
  ],
  "concept_map": {
    "central_theme": "แนวคิดหลักที่เป็นศูนย์กลาง",
    "supporting_concepts": ["แนวคิดสนับสนุน"],
    "related_topics": ["หัวข้อที่เกี่ยวข้อง"]
  },
  "summary": "สรุปภาพรวมของเนื้อหา"
}
\`\`\`

กรุณาวิเคราะห์อย่างรอบด้านและครอบคลุม`;

            return prompt;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'buildConceptExtractionPrompt',
                maxConcepts
            });
            throw error;
        }
    }

    /**
     * สร้าง prompt สำหรับการตรวจสอบคุณภาพข้อสอบ
     */
    buildQuizQualityCheckPrompt(quiz) {
        try {
            const questionsText = quiz.questions
                .map((q, index) => {
                    let questionText = `${index + 1}. ${q.question}\n`;
                    if (q.options) {
                        q.options.forEach((option, optIndex) => {
                            const letter = String.fromCharCode(97 + optIndex);
                            questionText += `   ${letter}) ${option}\n`;
                        });
                    }
                    questionText += `   ✓ ${q.correct_answer}\n`;
                    if (q.explanation) {
                        questionText += `   อธิบาย: ${q.explanation}\n`;
                    }
                    return questionText;
                })
                .join('\n');

            const prompt = `${this.templates.systemPrompts.quiz_reviewer}

**งานที่ต้องทำ:** ตรวจสอบคุณภาพของข้อสอบต่อไปนี้

**ข้อสอบ:** ${quiz.title}
**หมวดหมู่:** ${quiz.category}
**ระดับความยาก:** ${quiz.difficultyLevel}

**คำถามทั้งหมด:**
${questionsText}

**หลักเกณฑ์การตรวจสอบ:**
1. ความถูกต้องของคำตอบ
2. คุณภาพของตัวเลือกผิด (distractors)
3. ความชัดเจนของคำถาม
4. ระดับความยากที่เหมาะสม
5. การใช้ภาษาที่ถูกต้อง
6. ความสอดคล้องกับวัตถุประสงค์

**รูปแบบการตอบกลับ:**
\`\`\`json
{
  "overall_quality": "excellent|good|fair|poor",
  "quality_score": "คะแนนรวม 1-10",
  "question_analysis": [
    {
      "question_number": 1,
      "quality": "excellent|good|fair|poor",
      "issues": ["ปัญหาที่พบ"],
      "suggestions": ["ข้อเสนอแนะสำหรับการปรับปรุง"]
    }
  ],
  "overall_feedback": {
    "strengths": ["จุดแข็งของข้อสอบ"],
    "weaknesses": ["จุดที่ควรปรับปรุง"],
    "recommendations": ["คำแนะนำสำหรับการปรับปรุง"]
  },
  "difficulty_assessment": {
    "is_appropriate": true,
    "actual_difficulty": "easy|medium|hard|expert",
    "comments": "ความเห็นเกี่ยวกับระดับความยาก"
  }
}
\`\`\`

กรุณาตรวจสอบอย่างละเอียดและให้ข้อเสนะแนะที่เป็นประโยชน์`;

            return prompt;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'buildQuizQualityCheckPrompt',
                quizTitle: quiz?.title
            });
            throw error;
        }
    }

    /**
     * สร้าง prompt สำหรับการสรุปเนื้อหา
     */
    buildSummaryPrompt(content, options = {}) {
        try {
            const {
                maxLength = 200,
                format = 'paragraph',
                includeKeyPoints = true,
                language = this.config.language
            } = options;

            const truncatedContent = this.truncateContent(content);

            const prompt = `${this.templates.systemPrompts.content_analyzer}

**งานที่ต้องทำ:** สรุปเนื้อหาต่อไปนี้

**เนื้อหา:**
${truncatedContent}

**ข้อกำหนด:**
- ความยาวสรุป: ไม่เกิน ${maxLength} คำ
- รูปแบบ: ${format === 'bullet' ? 'จุดสำคัญ' : 'ย่อหน้า'}
- ภาษา: ${language === 'th' ? 'ภาษาไทย' : 'English'}
${includeKeyPoints ? '- รวมจุดสำคัญหลัก' : ''}

**รูปแบบการตอบกลับ:**
\`\`\`json
{
  "summary": "ข้อความสรุป",
  "key_points": ["จุดสำคัญ 1", "จุดสำคัญ 2", "จุดสำคัญ 3"],
  "main_topics": ["หัวข้อหลัก 1", "หัวข้อหลัก 2"],
  "word_count": "จำนวนคำในสรุป",
  "complexity_level": "easy|medium|hard"
}
\`\`\`

กรุณาสรุปอย่างกระชับและครอบคลุมจุดสำคัญ`;

            return prompt;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'buildSummaryPrompt',
                maxLength: options?.maxLength
            });
            throw error;
        }
    }

    /**
     * Private helper methods
     */

    /**
     * ตรวจสอบความถูกต้องของ input
     */
    validatePromptInputs(options) {
        const { content, questionType, questionCount } = options;

        if (!content || typeof content !== 'string') {
            throw new Error('Content is required and must be a string');
        }

        if (content.trim().length < 50) {
            throw new Error('Content must be at least 50 characters long');
        }

        if (!Object.keys(this.templates.questionTypes).includes(questionType)) {
            throw new Error(`Invalid question type: ${questionType}`);
        }

        if (questionCount < 1 || questionCount > 100) {
            throw new Error('Question count must be between 1 and 100');
        }
    }

    /**
     * ตัดเนื้อหาที่ยาวเกินไป
     */
    truncateContent(content) {
        if (!content || typeof content !== 'string') {
            return '';
        }

        if (content.length <= this.config.maxContentLength) {
            return content;
        }

        // ตัดที่ตำแหน่งที่เหมาะสม (หลังจุด หรือบรรทัดใหม่)
        const truncated = content.substring(0, this.config.maxContentLength);
        const lastSentenceEnd = Math.max(
            truncated.lastIndexOf('.'),
            truncated.lastIndexOf('!'),
            truncated.lastIndexOf('?'),
            truncated.lastIndexOf('\n')
        );

        if (lastSentenceEnd > this.config.maxContentLength * 0.8) {
            return truncated.substring(0, lastSentenceEnd + 1);
        }

        return truncated + '...';
    }

    /**
     * ได้กฎเฉพาะสำหรับแต่ละประเภทคำถาม
     */
    getQuestionTypeSpecificRules(questionType) {
        const rules = {
            multiple_choice: `
- ให้ตัวเลือก 4 ตัว (A, B, C, D)
- ตัวเลือกผิดต้องดูน่าเชื่อถือและเป็นไปได้
- คำตอบถูกต้องเพียงหนึ่งเดียว
- หลีกเลี่ยงการใช้ "ทั้งหมดที่กล่าวมา" หรือ "ไม่มีข้อใดถูก" หากไม่จำเป็น`,

            true_false: `
- คำถามต้องชัดเจน ไม่กำกวม
- หลีกเลี่ยงคำศัพท์สัมพัทธ์ เช่น "บางครั้ง", "มักจะ"
- ไม่ควรมีคำที่แสดงความเด็ดขาด เช่น "เสมอ", "ไม่เคย" หากไม่ถูกต้อง`,

            fill_in_blank: `
- ช่องว่างควรอยู่ในตำแหน่งสำคัญ
- คำตอบต้องเป็นคำหรือวลีเฉพาะเจาะจง
- หลีกเลี่ยงการให้เบาะแสมากเกินไปในโจทย์`,

            essay: `
- คำถามต้องกระตุ้นให้คิดวิเคราะห์
- ระบุขอบเขตการตอบชัดเจน
- ควรมีเกณฑ์การประเมินแนบมาด้วย`,

            matching: `
- รายการทั้งสองฝั่งต้องมีความสัมพันธ์ชัดเจน
- จำนวนรายการแต่ละฝั่งอาจไม่เท่ากัน
- หลีกเลี่ยงการจับคู่ที่ชัดเจนเกินไป`
        };

        return rules[questionType] || '';
    }

    /**
     * สร้าง prompt สำหรับการแปลข้อสอบ
     */
    buildTranslationPrompt(quiz, targetLanguage) {
        try {
            const questionsText = JSON.stringify(quiz.questions, null, 2);

            const prompt = `คุณเป็นผู้เชี่ยวชาญในการแปลเนื้อหาการศึกษา

**งานที่ต้องทำ:** แปลข้อสอบต่อไปนี้เป็น${targetLanguage === 'en' ? 'ภาษาอังกฤษ' : 'ภาษาไทย'}

**ข้อสอบ:** ${quiz.title}

**คำถาม:**
${questionsText}

**ข้อกำหนด:**
- แปลให้ความหมายตรงต่อต้นฉบับ
- คงความยากง่ายเดิมไว้
- ใช้คำศัพท์ที่เหมาะสมกับกลุ่มเป้าหมาย
- คงรูปแบบ JSON เดิมไว้

**รูปแบบการตอบกลับ:**
\`\`\`json
{
  "title": "ชื่อข้อสอบที่แปลแล้ว",
  "description": "คำอธิบายที่แปลแล้ว",
  "questions": [
    // คำถามที่แปลแล้วในรูปแบบเดิม
  ]
}
\`\`\`

กรุณาแปลอย่างถูกต้องและเหมาะสม`;

            return prompt;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'buildTranslationPrompt',
                targetLanguage
            });
            throw error;
        }
    }

    /**
     * สร้าง prompt สำหรับการปรับระดับความยาก
     */
    buildDifficultyAdjustmentPrompt(quiz, newDifficulty) {
        try {
            const questionsText = JSON.stringify(quiz.questions, null, 2);

            const prompt = `${this.templates.systemPrompts.quiz_generator}

**งานที่ต้องทำ:** ปรับระดับความยากของข้อสอบ

**ข้อสอบปัจจุบัน:** ${quiz.title}
**ระดับความยากปัจจุบัน:** ${this.templates.difficulties[quiz.difficultyLevel]}
**ระดับความยากใหม่:** ${this.templates.difficulties[newDifficulty]}

**คำถามปัจจุบัน:**
${questionsText}

**ข้อกำหนดการปรับ:**
- คงเนื้อหาหลักเดิมไว้
- ปรับระดับความยากให้เหมาะสม
- อาจเปลี่ยนรูปแบบคำถาม หรือเพิ่ม/ลดความซับซ้อน
- ตัวเลือกผิดต้องเหมาะสมกับระดับใหม่

**รูปแบบการตอบกลับ:**
\`\`\`json
{
  "questions": [
    // คำถามที่ปรับระดับความยากแล้ว
  ],
  "changes_made": [
    "รายการการเปลี่ยนแปลงที่ทำ"
  ]
}
\`\`\`

กรุณาปรับระดับความยากอย่างเหมาะสม`;

            return prompt;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'buildDifficultyAdjustmentPrompt',
                newDifficulty
            });
            throw error;
        }
    }
}

export default PromptBuilder;