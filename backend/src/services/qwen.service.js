const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

class QwenService {
  constructor() {
    this.apiKey = process.env.QWEN_API_KEY;
    const baseUrl = process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    // 确保URL以 /chat/completions 结尾（OpenAI兼容模式的完整端点）
    if (baseUrl.endsWith('/chat/completions')) {
      this.apiUrl = baseUrl;
    } else if (baseUrl.endsWith('/v1')) {
      this.apiUrl = `${baseUrl}/chat/completions`;
    } else {
      this.apiUrl = baseUrl;
    }
    console.log('Qwen API URL:', this.apiUrl);
  }

  /**
   * Call Qwen API for text generation (OpenAI compatible mode)
   * @param {string} prompt - The prompt to send
   * @param {object} options - Additional options
   * @returns {Promise<string>} - Generated text
   */
  async generateText(prompt, options = {}) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: options.model || 'qwen-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2000,
          top_p: options.topP || 0.9,
          ...options.parameters
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // OpenAI compatible response format
      return response.data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('Qwen API Error:', error.response?.data || error.message);
      throw new Error(`Qwen API call failed: ${error.message}`);
    }
  }

  /**
   * Parse resume content and extract structured information
   * @param {string} resumeText - Raw resume text
   * @returns {Promise<object>} - Parsed resume data
   */
  async parseResume(resumeText) {
    const prompt = `请分析以下简历内容，提取关键信息并以JSON格式返回。返回格式如下：
{
  "name": "姓名",
  "email": "邮箱",
  "phone": "电话",
  "skills": ["技能1", "技能2"],
  "experience": [
    {
      "company": "公司名",
      "position": "职位",
      "duration": "时长",
      "description": "工作描述"
    }
  ],
  "education": [
    {
      "school": "学校名",
      "degree": "学位",
      "major": "专业",
      "year": "毕业年份"
    }
  ],
  "summary": "简历摘要"
}

简历内容：
${resumeText}

请只返回JSON格式的数据，不要包含其他文字。`;

    const result = await this.generateText(prompt, { temperature: 0.3 });
    
    try {
      // Try to parse JSON from the response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse resume JSON:', parseError);
      return {
        name: '',
        email: '',
        phone: '',
        skills: [],
        experience: [],
        education: [],
        summary: result
      };
    }
  }

  /**
   * Generate interview questions based on resume and JD
   * @param {object} resumeData - Parsed resume data
   * @param {string} jdContent - Job description content
   * @returns {Promise<object>} - Generated questions
   */
  async generateInterviewQuestions(resumeData, jdContent) {
    const prompt = `你是一位专业的HR面试官。请根据以下简历和职位描述，生成面试问题。

简历信息：
姓名：${resumeData.name || '未知'}
技能：${JSON.stringify(resumeData.skills || [])}
工作经历：${JSON.stringify(resumeData.experience || [])}
教育背景：${JSON.stringify(resumeData.education || [])}

职位描述：
${jdContent}

请生成8-10个面试问题，涵盖以下类别：
1. 技术能力相关问题（3-4个）
2. 项目经验相关问题（2-3个）
3. 软技能和沟通能力问题（2个）
4. 职业发展和动机问题（1-2个）

请以JSON格式返回问题，格式如下：
{
  "questions": [
    {
      "category": "技术能力",
      "question": "问题内容",
      "purpose": "问题目的",
      "expected_keywords": ["关键词1", "关键词2"]
    }
  ]
}

请只返回JSON格式的数据，不要包含其他文字。`;

    const result = await this.generateText(prompt, { temperature: 0.7, maxTokens: 3000 });
    
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse questions JSON:', parseError);
      return { questions: [] };
    }
  }

  /**
   * Analyze interview transcript and generate report
   * @param {string} transcript - Interview transcript
   * @param {object} questions - Interview questions
   * @param {object} resumeData - Resume data
   * @param {string} jdContent - Job description
   * @returns {Promise<object>} - Analysis report
   */
  async analyzeInterview(transcript, questions, resumeData, jdContent) {
    const prompt = `你是一位专业的HR面试评估专家。请分析以下面试记录并生成评估报告。

候选人信息：
姓名：${resumeData.name || '未知'}
应聘职位JD：${jdContent}

面试问题：
${JSON.stringify(questions, null, 2)}

面试记录：
${transcript}

请生成详细的面试评估报告，以JSON格式返回：
{
  "overall_score": 7.5,
  "technical_score": 8.0,
  "communication_score": 7.0,
  "problem_solving_score": 7.5,
  "cultural_fit_score": 8.0,
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["不足1", "不足2"],
  "question_analysis": [
    {
      "question": "问题",
      "answer_summary": "回答摘要",
      "score": 8,
      "comment": "评价"
    }
  ],
  "recommendation": "recommend",
  "recommendation_reason": "推荐理由详细说明",
  "summary": "面试总结"
}

recommendation可选值：highly_recommend, recommend, neutral, not_recommend, strongly_not_recommend

请只返回JSON格式的数据，不要包含其他文字。`;

    const result = await this.generateText(prompt, { temperature: 0.5, maxTokens: 4000 });
    
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse analysis JSON:', parseError);
      return {
        overall_score: 0,
        recommendation: 'neutral',
        recommendation_reason: '分析失败，请手动评估',
        summary: 'AI分析失败'
      };
    }
  }

  /**
   * Generate AI interviewer response for real-time conversation
   * @param {string} candidateResponse - Candidate's response
   * @param {object} context - Interview context
   * @returns {Promise<string>} - AI response
   */
  async generateInterviewerResponse(candidateResponse, context) {
    const { currentQuestion, questionIndex, totalQuestions, resumeData } = context;
    
    const prompt = `你是一位友好的AI面试官，正在进行一场面试。

候选人姓名：${resumeData.name || '候选人'}
当前是第 ${questionIndex + 1} 个问题，共 ${totalQuestions} 个问题。

当前问题：${currentQuestion.question}

候选人回答：${candidateResponse}

请根据候选人的回答，给出适当的回应：
1. 如果回答不完整，礼貌地追问
2. 如果回答很好，给予肯定并进入下一题
3. 保持专业和友好的语气
4. 回复要简洁，不超过100字

你的回复：`;

    return await this.generateText(prompt, { temperature: 0.6, maxTokens: 200 });
  }

  /**
   * Evaluate interview from transcript
   * @param {string} transcript - Interview transcript text
   * @param {Array} questions - Interview questions
   * @param {string} jdContent - Job description
   * @returns {Promise<object>} - Evaluation result
   */
  async evaluateInterview(transcript, questions, jdContent) {
    const prompt = `你是一位资深的HR面试评估专家。请根据以下面试记录，对候选人进行全面评估。

职位描述：
${jdContent}

面试问题：
${JSON.stringify(questions || [], null, 2)}

面试记录（按时间顺序）：
${transcript}

请对面试进行全面分析并返回JSON格式的评估结果：

{
  "meeting_minutes": "完整的会议纪要，包括：1.面试概述 2.每个问题的回答要点 3.关键表现记录",
  "fluency_score": 8.5,
  "fluency_comment": "回答流畅度评价，包括语言表达、逻辑性、连贯性等",
  "professionalism_score": 8.0,
  "professionalism_comment": "专业度评价，包括专业知识掌握程度、技术深度、行业理解等",
  "communication_score": 7.5,
  "communication_comment": "沟通能力评价，包括表达清晰度、理解能力、互动表现等",
  "technical_depth_score": 8.0,
  "technical_depth_comment": "技术深度评价，包括问题解决能力、架构设计能力、代码质量意识等",
  "strengths": ["优势1", "优势2", "优势3"],
  "weaknesses": ["不足1", "不足2"],
  "overall_comment": "总体评语，综合评价候选人的表现和匹配度",
  "recommendation": "recommend"
}

评分标准（1-10分）：
- fluency_score: 回答流畅度 - 语言表达是否流畅、逻辑是否清晰
- professionalism_score: 专业度 - 专业知识和技能掌握程度
- communication_score: 沟通能力 - 表达清晰、理解准确、互动良好
- technical_depth_score: 技术深度 - 对技术的理解深度和广度

recommendation可选值：
- highly_recommend: 强烈推荐
- recommend: 推荐
- neutral: 待定
- not_recommend: 不推荐
- strongly_not_recommend: 强烈不推荐

请只返回JSON格式的数据，不要包含其他文字。`;

    const result = await this.generateText(prompt, { temperature: 0.4, maxTokens: 4000 });
    
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse evaluation JSON:', parseError);
      // Return default evaluation on failure
      return {
        meeting_minutes: '会议纪要生成失败',
        fluency_score: 5,
        fluency_comment: '评估失败',
        professionalism_score: 5,
        professionalism_comment: '评估失败',
        communication_score: 5,
        communication_comment: '评估失败',
        technical_depth_score: 5,
        technical_depth_comment: '评估失败',
        strengths: [],
        weaknesses: [],
        overall_comment: 'AI评估失败，请人工评估',
        recommendation: 'neutral'
      };
    }
  }
}

module.exports = new QwenService();