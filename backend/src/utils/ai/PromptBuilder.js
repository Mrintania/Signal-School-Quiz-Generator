// backend/src/utils/ai/PromptBuilder.js
import logger from '../logger.js';

/**
 * Prompt Builder
 * สร้าง AI prompts สำหรับการสร้างข้อสอบ
 */
export class PromptBuilder {
    constructor() {
        this.templates = {
            th: {
                systemPrompt: 'คุณเป็นผู้เชี่ยวชาญด้านการศึกษาและการสร้างข้อสอบ โปรดสร้างข้อสอบที่มีคุณภาพและเหมาะสมสำหรับผู้เรียน',
                questionTypes: {
                    multiple_choice: 'คำถามแบบเลือกตอบ 4 ตัวเลือก',
                    true_false: 'คำถามแบบถูก/ผิด',
                    essay: 'คำถามแบบเรียงความ',
                    short_answer: 'คำถามแบบตอบสั้น'
                },
                difficulties: {
                    easy: 'ระดับง่าย - เหมาะสำหรับผู้เริ่มต้น',
                    medium: 'ระดับปานกลาง - เหมาะสำหรับผู้ที่มีความรู้พื้นฐาน',
                    hard: 'ระดับยาก - เหมาะสำหรับผู้ที่มีความรู้ลึก'
                }
            },
            en: {
                systemPrompt: 'You are an expert educator and quiz creator. Please create high-quality quizzes appropriate for learners.',
                questionTypes: {
                    multiple_choice: 'Multiple choice questions with 4 options',
                    true_false: 'True/false questions',
                    essay: 'Essay questions',
                    short_answer: 'Short answer questions'
                },
                difficulties: {
                    easy: 'Easy level - suitable for beginners',
                    medium: 'Medium level - suitable for those with basic knowledge',
                    hard: 'Hard level - suitable for those with deep knowledge'
                }
            }
        };
    }

    /**
     * Build main quiz generation prompt
     * @param {Object} params - Generation parameters
     * @returns {string} Generated prompt
     */
    async buildQuizPrompt(params) {
        try {
            const {
                content,
                questionType = 'multiple_choice',
                numberOfQuestions = 5,
                difficulty = 'medium',
                language = 'th',
                category = '',
                instructions = '',
                context = ''
            } = params;

            const template = this.templates[language] || this.templates.th;

            const prompt = `${template.systemPrompt}

${this.buildContextSection(content, context, language)}

${this.buildRequirementsSection({
                questionType,
                numberOfQuestions,
                difficulty,
                category,
                instructions,
                language,
                template
            })}

${this.buildFormatSection(questionType, language)}

${this.buildExampleSection(questionType, language)}

${this.buildValidationRules(language)}`;

            logger.debug('Quiz prompt built', {
                contentLength: content ? content.length : 0,
                questionType,
                numberOfQuestions,
                difficulty,
                language
            });

            return prompt;

        } catch (error) {
            logger.error('Error building quiz prompt:', error);
            throw new Error(`Failed to build prompt: ${error.message}`);
        }
    }

    /**
     * Build regeneration prompt for existing questions
     * @param {Object} quiz - Existing quiz
     * @param {Array} questions - Questions to regenerate
     * @param {Object} params - Regeneration parameters
     * @returns {string} Regeneration prompt
     */
    async buildRegenerationPrompt(quiz, questions, params) {
        try {
            const { questionType, userId, reason = 'improvement', language = 'th' } = params;
            const template = this.templates[language] || this.templates.th;

            const prompt = `${template.systemPrompt}

คำสั่ง: สร้างคำถามใหม่เพื่อแทนที่คำถามเดิมในข้อสอบ

ข้อมูลข้อสอบ:
ชื่อข้อสอบ: ${quiz.title}
หัวข้อ: ${quiz.description || 'ไม่ระบุ'}

คำถามที่ต้องการสร้างใหม่:
${JSON.stringify(questions, null, 2)}

เหตุผลในการสร้างใหม่: ${reason}

ข้อกำหนด:
- สร้างคำถามใหม่จำนวน ${questions.length} ข้อ
- ประเภทคำถาม: ${template.questionTypes[questionType] || questionType}
- คำถามใหม่ต้องมีความยากระดับเดียวกับคำถามเดิม
- คำถามใหม่ต้องเกี่ยวข้องกับหัวข้อเดียวกัน
- หลีกเลี่ยงการทำซ้ำเนื้อหาคำถามเดิม

${this.buildFormatSection(questionType, language)}

โปรดส่งคืนเฉพาะคำถามใหม่ในรูปแบบ JSON array ตามตัวอย่าง`;

            return prompt;

        } catch (error) {
            logger.error('Error building regeneration prompt:', error);
            throw new Error(`Failed to build regeneration prompt: ${error.message}`);
        }
    }

    /**
     * Build improvement prompt
     * @param {Array} questions - Questions to improve
     * @param {Object} params - Improvement parameters
     * @returns {string} Improvement prompt
     */
    async buildImprovementPrompt(questions, params) {
        try {
            const {
                improvementType = 'clarity',
                language = 'th',
                specificIssues = []
            } = params;

            const template = this.templates[language] || this.templates.th;

            const improvementTypes = {
                th: {
                    clarity: 'ปรับปรุงความชัดเจนของคำถาม',
                    difficulty: 'ปรับระดับความยากของคำถาม',
                    grammar: 'แก้ไขไวยากรณ์และการใช้ภาษา',
                    options: 'ปรับปรุงตัวเลือกคำตอบ',
                    comprehensiveness: 'เพิ่มความครอบคลุมของเนื้อหา'
                },
                en: {
                    clarity: 'Improve question clarity',
                    difficulty: 'Adjust question difficulty',
                    grammar: 'Fix grammar and language usage',
                    options: 'Improve answer options',
                    comprehensiveness: 'Increase content comprehensiveness'
                }
            };

            const typeInstructions = improvementTypes[language] || improvementTypes.th;

            const prompt = `${template.systemPrompt}

คำสั่ง: ${typeInstructions[improvementType]}

คำถามที่ต้องการปรับปรุง:
${JSON.stringify(questions, null, 2)}

${specificIssues.length > 0 ? `
ปัญหาเฉพาะที่พบ:
${specificIssues.map(issue => `- ${issue}`).join('\n')}
` : ''}

หลักเกณฑ์การปรับปรุง:
- รักษาความหมายและเจตนาของคำถามเดิม
- ปรับปรุงให้ชัดเจนและเข้าใจง่ายขึ้น
- ตรวจสอบความถูกต้องของไวยากรณ์
- ตรวจสอบความสมเหตุสมผลของตัวเลือกคำตอบ

โปรดส่งคืนคำถามที่ปรับปรุงแล้วในรูปแบบ JSON เดิม`;

            return prompt;

        } catch (error) {
            logger.error('Error building improvement prompt:', error);
            throw new Error(`Failed to build improvement prompt: ${error.message}`);
        }
    }

    /**
     * Build context section
     * @param {string} content - Main content
     * @param {string} context - Additional context
     * @param {string} language - Language code
     * @returns {string} Context section
     */
    buildContextSection(content, context, language) {
        const labels = {
            th: {
                content: 'เนื้อหาสำหรับการสร้างข้อสอบ:',
                context: 'บริบทเพิ่มเติม:'
            },
            en: {
                content: 'Content for quiz generation:',
                context: 'Additional context:'
            }
        };

        const label = labels[language] || labels.th;

        let section = `${label.content}
${content || 'ไม่ระบุเนื้อหา'}`;

        if (context) {
            section += `\n\n${label.context}
${context}`;
        }

        return section;
    }

    /**
     * Build requirements section
     * @param {Object} params - Parameters
     * @returns {string} Requirements section
     */
    buildRequirementsSection(params) {
        const { questionType, numberOfQuestions, difficulty, category, instructions, language, template } = params;

        const labels = {
            th: {
                requirements: 'ข้อกำหนด:',
                questions: 'จำนวนคำถาม:',
                type: 'ประเภทคำถาม:',
                difficulty: 'ระดับความยาก:',
                category: 'หมวดหมู่:',
                instructions: 'คำแนะนำเพิ่มเติม:'
            },
            en: {
                requirements: 'Requirements:',
                questions: 'Number of questions:',
                type: 'Question type:',
                difficulty: 'Difficulty level:',
                category: 'Category:',
                instructions: 'Additional instructions:'
            }
        };

        const label = labels[language] || labels.th;

        let section = `${label.requirements}
- ${label.questions} ${numberOfQuestions} ข้อ
- ${label.type} ${template.questionTypes[questionType]}
- ${label.difficulty} ${template.difficulties[difficulty]}`;

        if (category) {
            section += `\n- ${label.category} ${category}`;
        }

        if (instructions) {
            section += `\n- ${label.instructions} ${instructions}`;
        }

        return section;
    }

    /**
     * Build format section
     * @param {string} questionType - Question type
     * @param {string} language - Language code
     * @returns {string} Format section
     */
    buildFormatSection(questionType, language) {
        const formats = {
            th: {
                title: 'รูปแบบการตอบ:',
                json_note: 'โปรดส่งคืนข้อมูลในรูปแบบ JSON ที่ถูกต้องเท่านั้น:',
                multiple_choice: `{
  "title": "ชื่อข้อสอบ",
  "questions": [
    {
      "question": "ข้อความคำถาม",
      "type": "multiple_choice",
      "options": ["ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4"],
      "correctAnswer": 0,
      "explanation": "คำอธิบายคำตอบ (ถ้ามี)"
    }
  ]
}`,
                true_false: `{
  "title": "ชื่อข้อสอบ",
  "questions": [
    {
      "question": "ข้อความคำถาม",
      "type": "true_false",
      "correctAnswer": true,
      "explanation": "คำอธิบายคำตอบ (ถ้ามี)"
    }
  ]
}`,
                essay: `{
  "title": "ชื่อข้อสอบ",
  "questions": [
    {
      "question": "ข้อความคำถาม",
      "type": "essay",
      "rubric": "เกณฑ์การให้คะแนน",
      "keywords": ["คำสำคัญ1", "คำสำคัญ2"],
      "points": 10
    }
  ]
}`,
                short_answer: `{
  "title": "ชื่อข้อสอบ",
  "questions": [
    {
      "question": "ข้อความคำถาม",
      "type": "short_answer",
      "correctAnswers": ["คำตอบที่เป็นไปได้ 1", "คำตอบที่เป็นไปได้ 2"],
      "points": 5
    }
  ]
}`
            }
        };

        const format = formats[language] || formats.th;

        return `${format.title}
${format.json_note}

${format[questionType] || format.multiple_choice}`;
    }

    /**
     * Build example section
     * @param {string} questionType - Question type
     * @param {string} language - Language code
     * @returns {string} Example section
     */
    buildExampleSection(questionType, language) {
        const examples = {
            th: {
                title: 'ตัวอย่าง:',
                multiple_choice: `ตัวอย่างคำถามที่ดี:
- คำถามชัดเจน เฉพาะเจาะจง
- ตัวเลือกมีความเป็นไปได้ทั้งหมด
- มีเพียงหนึ่งคำตอบที่ถูกต้องที่สุด
- ตัวเลือกที่ผิดดูเหมือนจริง (plausible distractors)`,
                true_false: `ตัวอย่างคำถามที่ดี:
- ข้อความชัดเจน ไม่คลุมเครือ
- หลีกเลี่ยงคำที่สร้างความสับสน เช่น "เสมอ" "ไม่เคย"
- ตรวจสอบได้จากเนื้อหาที่กำหนด`,
                essay: `ตัวอย่างคำถามที่ดี:
- เปิดโอกาสให้แสดงความเข้าใจอย่างลึกซึ้ง
- มีขอบเขตที่ชัดเจน
- ระบุเกณฑ์การประเมินไว้ล่วงหน้า`,
                short_answer: `ตัวอย่างคำถามที่ดี:
- คำถามตรงไปตรงมา
- คำตอบสั้น กระชับ
- หลีกเลี่ยงความคลุมเครือ`
            }
        };

        const example = examples[language] || examples.th;

        return `${example.title}
${example[questionType] || example.multiple_choice}`;
    }

    /**
     * Build validation rules
     * @param {string} language - Language code
     * @returns {string} Validation rules
     */
    buildValidationRules(language) {
        const rules = {
            th: `กฎการตรวจสอบ:
1. ตรวจสอบให้แน่ใจว่า JSON ถูกต้องและสามารถ parse ได้
2. คำถามต้องเกี่ยวข้องกับเนื้อหาที่กำหนด
3. หลีกเลี่ยงคำถามที่ซ้ำกัน
4. ใช้ภาษาไทยที่ถูกต้อง หลีกเลี่ยงการผสมภาษา
5. คำตอบต้องถูกต้องและตรวจสอบได้
6. ตัวเลือกในคำถามแบบเลือกตอบต้องมีความเป็นไปได้
7. ไม่ใช้คำถามที่อาจทำให้เกิดความขัดแย้งหรือไม่เหมาะสม`,
            en: `Validation Rules:
1. Ensure JSON is valid and parseable
2. Questions must be relevant to the provided content
3. Avoid duplicate questions
4. Use proper language, avoid mixing languages
5. Answers must be correct and verifiable
6. Multiple choice options must be plausible
7. Avoid controversial or inappropriate questions`
        };

        return rules[language] || rules.th;
    }
}



