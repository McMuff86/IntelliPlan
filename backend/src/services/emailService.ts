import nodemailer from 'nodemailer';

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'IntelliPlan <no-reply@intelliplan.local>';
const SMTP_REPLY_TO = process.env.SMTP_REPLY_TO;

let cachedTransporter: nodemailer.Transporter | null | undefined;

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter !== undefined) {
    return cachedTransporter;
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return cachedTransporter;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    return false;
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      replyTo: SMTP_REPLY_TO,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
}

export async function sendVerificationEmail(params: {
  to: string;
  name?: string;
  verificationLink: string;
}): Promise<boolean> {
  const name = params.name || 'there';
  const subject = 'Verify your IntelliPlan email';
  const text = [
    `Hi ${name},`,
    '',
    'Please verify your email to finish setting up your IntelliPlan account:',
    params.verificationLink,
    '',
    'This link expires in 24 hours.',
    'If you did not create this account, you can ignore this email.',
  ].join('\n');

  const html = [
    `<p>Hi ${name},</p>`,
    '<p>Please verify your email to finish setting up your IntelliPlan account:</p>',
    `<p><a href="${params.verificationLink}">Verify email</a></p>`,
    '<p>This link expires in 24 hours.</p>',
    '<p>If you did not create this account, you can ignore this email.</p>',
  ].join('');

  return sendEmail({ to: params.to, subject, text, html });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name?: string;
  resetLink: string;
}): Promise<boolean> {
  const name = params.name || 'there';
  const subject = 'Reset your IntelliPlan password';
  const text = [
    `Hi ${name},`,
    '',
    'You requested to reset your IntelliPlan password.',
    'Use this link to set a new password:',
    params.resetLink,
    '',
    'This link expires in 1 hour.',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = [
    `<p>Hi ${name},</p>`,
    '<p>You requested to reset your IntelliPlan password.</p>',
    '<p>Use this link to set a new password:</p>',
    `<p><a href="${params.resetLink}">Reset password</a></p>`,
    '<p>This link expires in 1 hour.</p>',
    '<p>If you did not request this, you can ignore this email.</p>',
  ].join('');

  return sendEmail({ to: params.to, subject, text, html });
}
