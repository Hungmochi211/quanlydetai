import * as nodemailer from 'nodemailer';

export async function sendMail(
  to: string,
  link: string,
  mailUser: string,
  mailPassword: string,
) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: mailUser,
      pass: mailPassword,
    },
  });

  await transporter.sendMail({
    from: mailUser,
    to,
    subject: 'Khôi phục mật khẩu',
    html: `
      <h3>Thay đổi mật khẩu</h3>
      <p>Bấm vào link bên dưới để đổi mật khẩu bạn có hạn trong 10 phút:</p>
      <a href="${link}">Đổi mật khẩu</a>
    `,
  });
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  mailUser: string,
  mailPassword: string,
) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: mailUser,
      pass: mailPassword,
    },
  });

  await transporter.sendMail({
    from: mailUser,
    to,
    subject: 'Mã xác thực đăng ký tài khoản - Quản lý Đề tài NCKH',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1890ff; text-align: center;">Xác thực tài khoản đăng ký</h2>
        <p>Xin chào,</p>
        <p>Bạn đang đăng ký tài khoản trên hệ thống Quản lý đề tài Nghiên cứu khoa học. Dưới đây là mã xác minh của bạn:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1890ff; background: #e6f7ff; padding: 12px 24px; border-radius: 6px; border: 1px dashed #91d5ff;">
            ${code}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">Mã xác minh này có hiệu lực trong vòng <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">Đây là email tự động, vui lòng không phản hồi email này.</p>
      </div>
    `,
  });
}
