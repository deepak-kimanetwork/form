import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendNotificationEmail = async (to, formTitle, answers, subjectOverride = null) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP credentials not configured. Skipping email notification.');
        return;
    }

    const isReceipt = subjectOverride && subjectOverride.includes('Receipt');
    const subject = subjectOverride || `New Response: ${formTitle}`;

    const answerHtml = Object.entries(answers)
        .map(([q, a]) => `
            <div style="margin-bottom: 15px; padding: 15px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
                <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">${q}</p>
                <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 500;">${a}</p>
            </div>
        `)
        .join('');

    const mailOptions = {
        from: `"AI Form Builder" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 8px;">
                    ${isReceipt ? 'Your Form Receipt' : 'New Form Submission'}
                </h1>
                <p style="font-size: 16px; color: #6b7280; margin-bottom: 32px;">
                    ${isReceipt 
                        ? `Thank you for completing <strong>"${formTitle}"</strong>. Here is a copy of your responses:`
                        : `Somebody just completed your form <strong>"${formTitle}"</strong>. Here are their answers:`}
                </p>
                
                <div style="margin-bottom: 32px;">
                    ${answerHtml}
                </div>

                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 32px;" />
                
                <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                    Sent by AI Form Builder.
                </p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ ${isReceipt ? 'Receipt' : 'Notification'} email sent to ${to}`);
    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
};
