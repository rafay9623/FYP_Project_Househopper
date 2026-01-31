/**
 * Email Service - Sends verification emails
 * Supports: SendGrid, AWS SES, Nodemailer (SMTP)
 */

/**
 * Send verification email
 * Automatically uses the configured email service
 */
export async function sendVerificationEmail(email, verificationToken, firstName = '') {
  try {
    // Generate verification link
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?token=${verificationToken}`
    
    // Try SendGrid first (if configured)
    if (process.env.SENDGRID_API_KEY) {
      return await sendViaSendGrid(email, verificationLink, firstName)
    }
    
    // Try AWS SES (if configured)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      return await sendViaAWS(email, verificationLink, firstName)
    }
    
    // Try Nodemailer/SMTP (if configured)
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      return await sendViaSMTP(email, verificationLink, firstName)
    }
    
    // Fallback: Return link for manual testing (development)
    console.log('⚠️  No email service configured. Email not sent.')
    console.log(`📧 Verification email should be sent to: ${email}`)
    console.log(`🔗 Verification link: ${verificationLink}`)
    
    return {
      success: true,
      verificationLink,
      email,
      message: 'Email service not configured. Link returned for testing.',
      sent: false
    }
  } catch (error) {
    console.error('❌ Send verification email error:', error.message)
    throw error
  }
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(email, verificationLink, firstName = '') {
  try {
    // Dynamic import to avoid errors if package not installed
    const sgMail = await import('@sendgrid/mail').catch(() => null)
    
    if (!sgMail) {
      throw new Error('SendGrid package not installed. Run: npm install @sendgrid/mail')
    }
    
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
    
    const fromEmail = process.env.FROM_EMAIL || 'noreply@househoppers.com'
    const greeting = firstName ? `Hi ${firstName},` : 'Hello,'
    
    const msg = {
      to: email,
      from: {
        email: fromEmail,
        name: 'HouseHoppers'
      },
      subject: 'Verify Your HouseHoppers Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HouseHoppers</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #111827; margin-top: 0;">Verify Your Email Address</h2>
            <p>${greeting}</p>
            <p>Thank you for signing up for HouseHoppers! To complete your account setup, please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Verify Email Address</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f9fafb; padding: 10px; border-radius: 5px;">${verificationLink}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This verification link will expire in 24 hours.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't create an account with HouseHoppers, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">© ${new Date().getFullYear()} HouseHoppers. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Verify Your HouseHoppers Account
        
        ${greeting}
        
        Thank you for signing up for HouseHoppers! To complete your account setup, please verify your email address by clicking the link below:
        
        ${verificationLink}
        
        This verification link will expire in 24 hours.
        
        If you didn't create an account with HouseHoppers, please ignore this email.
        
        © ${new Date().getFullYear()} HouseHoppers. All rights reserved.
      `
    }
    
    await sgMail.default.send(msg)
    
    console.log(`✅ Verification email sent via SendGrid to: ${email}`)
    
    return {
      success: true,
      email,
      sent: true,
      service: 'SendGrid'
    }
  } catch (error) {
    console.error('❌ SendGrid error:', error.message)
    if (error.response) {
      console.error('SendGrid response:', error.response.body)
    }
    throw error
  }
}

/**
 * Send email via AWS SES
 */
async function sendViaAWS(email, verificationLink, firstName = '') {
  try {
    const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses').catch(() => {
      throw new Error('AWS SES package not installed. Run: npm install @aws-sdk/client-ses')
    })
    
    const sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    })
    
    const fromEmail = process.env.FROM_EMAIL || 'noreply@househoppers.com'
    const greeting = firstName ? `Hi ${firstName},` : 'Hello,'
    
    const params = {
      Source: fromEmail,
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: 'Verify Your HouseHoppers Account',
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: `
              <!DOCTYPE html>
              <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Verify Your Email Address</h2>
                <p>${greeting}</p>
                <p>Thank you for signing up! Please verify your email by clicking the link below:</p>
                <p><a href="${verificationLink}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
                <p>Or copy this link: ${verificationLink}</p>
                <p>This link expires in 24 hours.</p>
              </body>
              </html>
            `,
            Charset: 'UTF-8'
          },
          Text: {
            Data: `Verify Your Account\n\n${greeting}\n\nPlease verify your email: ${verificationLink}\n\nThis link expires in 24 hours.`,
            Charset: 'UTF-8'
          }
        }
      }
    }
    
    const command = new SendEmailCommand(params)
    await sesClient.send(command)
    
    console.log(`✅ Verification email sent via AWS SES to: ${email}`)
    
    return {
      success: true,
      email,
      sent: true,
      service: 'AWS SES'
    }
  } catch (error) {
    console.error('❌ AWS SES error:', error.message)
    throw error
  }
}

/**
 * Send email via SMTP (Nodemailer)
 */
async function sendViaSMTP(email, verificationLink, firstName = '') {
  try {
    const nodemailer = await import('nodemailer').catch(() => {
      throw new Error('Nodemailer package not installed. Run: npm install nodemailer')
    })
    
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
    
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER
    const greeting = firstName ? `Hi ${firstName},` : 'Hello,'
    
    const mailOptions = {
      from: `HouseHoppers <${fromEmail}>`,
      to: email,
      subject: 'Verify Your HouseHoppers Account',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Verify Your Email Address</h2>
          <p>${greeting}</p>
          <p>Thank you for signing up! Please verify your email by clicking the link below:</p>
          <p><a href="${verificationLink}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
          <p>Or copy this link: ${verificationLink}</p>
          <p>This link expires in 24 hours.</p>
        </body>
        </html>
      `,
      text: `Verify Your Account\n\n${greeting}\n\nPlease verify your email: ${verificationLink}\n\nThis link expires in 24 hours.`
    }
    
    await transporter.sendMail(mailOptions)
    
    console.log(`✅ Verification email sent via SMTP to: ${email}`)
    
    return {
      success: true,
      email,
      sent: true,
      service: 'SMTP'
    }
  } catch (error) {
    console.error('❌ SMTP error:', error.message)
    throw error
  }
}

/**
 * Generate email verification link (for when user is created)
 */
export async function generateEmailVerificationLink(email) {
  const { getAuth } = await import('../Configs/firebase_config.js')
  const auth = getAuth()
  
  try {
    // This requires the user to exist in Firebase Auth first
    const userRecord = await auth.getUserByEmail(email)
    const actionCodeSettings = {
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email`,
      handleCodeInApp: false,
    }
    
    const link = await auth.generateEmailVerificationLink(email, actionCodeSettings)
    return {
      success: true,
      link
    }
  } catch (error) {
    console.error('❌ Generate email verification link error:', error.message)
    throw error
  }
}
