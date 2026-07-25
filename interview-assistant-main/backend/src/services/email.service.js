const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.163.com',
      port: process.env.EMAIL_PORT || 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Send interview invitation email
   * @param {object} options - Email options
   * @returns {Promise<object>} - Send result
   */
  async sendInterviewInvitation(options) {
    const {
      to,
      candidateName,
      position,
      companyName,
      interviewTime,
      duration,
      meetingUrl,
      meetingId
    } = options;

    const mailOptions = {
      from: `"面试助手" <${process.env.EMAIL_USER}>`,
      to,
      subject: `面试邀请 - ${position}职位`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 面试邀请</h1>
            </div>
            <div class="content">
              <p>尊敬的 <strong>${candidateName}</strong> 您好！</p>
              <p>感谢您对 <strong>${companyName || '我们公司'}</strong> 的 <strong>${position}</strong> 职位的关注。经过初步筛选，我们诚挚地邀请您参加面试。</p>
              
              <div class="info-box">
                <h3>📅 面试安排</h3>
                <p><strong>面试时间：</strong>${interviewTime}</p>
                <p><strong>面试时长：</strong>约 ${duration} 分钟</p>
                <p><strong>面试形式：</strong>AI视频面试（腾讯会议）</p>
              </div>
              
              <div class="info-box">
                <h3>🔗 会议信息</h3>
                <p><strong>会议号：</strong>${meetingId}</p>
                <p style="text-align: center; margin-top: 15px;">
                  <a href="${meetingUrl}" class="button">点击加入会议</a>
                </p>
              </div>
              
              <div class="info-box">
                <h3>📝 温馨提示</h3>
                <ul>
                  <li>请提前5分钟进入会议室，检查摄像头和麦克风</li>
                  <li>面试将由AI面试官进行，请保持放松</li>
                  <li>面试全程约${duration}分钟，请确保时间充足</li>
                  <li>如有问题，请回复此邮件联系我们</li>
                </ul>
              </div>
              
              <p>期待与您的交流！</p>
              <p>祝好！<br>HR团队</p>
            </div>
            <div class="footer">
              <p>此邮件由系统自动发送，请勿直接回复</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send interview result notification
   * @param {object} options - Email options
   * @returns {Promise<object>} - Send result
   */
  async sendInterviewResult(options) {
    const {
      to,
      candidateName,
      position,
      result,
      reportUrl
    } = options;

    const resultText = {
      'highly_recommend': '强烈推荐',
      'recommend': '推荐',
      'neutral': '待定',
      'not_recommend': '不推荐',
      'strongly_not_recommend': '强烈不推荐'
    };

    const mailOptions = {
      from: `"面试助手" <${process.env.EMAIL_USER}>`,
      to,
      subject: `面试结果通知 - ${position}职位`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .result-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; }
            .score { font-size: 48px; font-weight: bold; color: #11998e; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 面试结果通知</h1>
            </div>
            <div class="content">
              <p>尊敬的 <strong>${candidateName}</strong> 您好！</p>
              <p>感谢您参加 <strong>${position}</strong> 职位的面试。面试结果如下：</p>
              
              <div class="result-box">
                <p>综合评分</p>
                <div class="score">${result.overall_score || '-'}</div>
                <p>评估结果：<strong>${resultText[result.recommendation] || '待定'}</strong></p>
              </div>
              
              <div class="result-box">
                <h3>评估详情</h3>
                <p><strong>技术能力：</strong>${result.technical_score || '-'} / 10</p>
                <p><strong>沟通能力：</strong>${result.communication_score || '-'} / 10</p>
                <p><strong>问题解决：</strong>${result.problem_solving_score || '-'} / 10</p>
                <p><strong>文化匹配：</strong>${result.cultural_fit_score || '-'} / 10</p>
              </div>
              
              ${reportUrl ? `<p style="text-align: center;"><a href="${reportUrl}" style="display: inline-block; padding: 12px 30px; background: #11998e; color: white; text-decoration: none; border-radius: 5px;">查看详细报告</a></p>` : ''}
              
              <p>如有疑问，请随时联系我们。</p>
              <p>祝好！<br>HR团队</p>
            </div>
            <div class="footer">
              <p>此邮件由系统自动发送，请勿直接回复</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Result email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send result email:', error);
      throw new Error(`Failed to send result email: ${error.message}`);
    }
  }

  /**
   * Verify email configuration
   * @returns {Promise<boolean>} - Whether configuration is valid
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email server is ready to send messages');
      return true;
    } catch (error) {
      console.error('Email configuration error:', error);
      return false;
    }
  }
}

module.exports = new EmailService();