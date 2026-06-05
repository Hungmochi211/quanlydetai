import * as nodemailer from 'nodemailer';

export async function sendMail(to: string, link: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'hungdztv165@gmail.com',
      pass: 'aakn tkgw bczg uakx',
    },
  });

  await transporter.sendMail({
    from: 'hungdztv165@gmail.com',
    to,
    subject: 'Khôi phục mật khẩu',
    html: `
      <h3>Thay đổi mật khẩu</h3>
      <p>Bấm vào link bên dưới để đổi mật khẩu bạn có hạn trong 10 phút:</p>
      <a href="${link}">Đổi mật khẩu</a>
    `,
  });
}
