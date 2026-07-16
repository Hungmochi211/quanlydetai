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
