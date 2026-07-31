import { readFileSync } from 'fs';
import { join } from 'path';
import * as sql from 'mssql';

type DocumentRow = {
  MaTL: number;
  TenFile: string;
};

function readEnvFile() {
  const content = readFileSync(join(process.cwd(), '.env'), 'utf8');
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

function isMojibake(fileName: string) {
  return /Ã.|Ä.|Â.|áº|á»|â€/.test(fileName);
}

function restoreUtf8FileName(fileName: string) {
  const knownBrokenFragments: Record<string, string> = {
    'báº£n': 'bản',
    'káº¿t': 'kết',
    'Ä?á»?ng': 'đồng',
    'h?\u00a0nh': 'hành',
    'ph?²ng': 'phòng',
    'chá»?ng': 'chống',
    'tu?½': 'túy',
  };

  let restoredKnownName = fileName;
  for (const [broken, correct] of Object.entries(knownBrokenFragments)) {
    restoredKnownName = restoredKnownName.split(broken).join(correct);
  }
  if (restoredKnownName !== fileName) {
    return restoredKnownName;
  }

  const restored = Buffer.from(fileName, 'latin1').toString('utf8');
  return restored.includes('\uFFFD') ? fileName : restored;
}

async function main() {
  const env = readEnvFile();
  const apply = process.argv.includes('--apply');
  const pool = await sql.connect({
    server: env.DB_HOST,
    port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    options: {
      encrypt: env.DB_ENCRYPT === 'true',
      trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    },
  });

  try {
    const result = await pool.request().query<DocumentRow>(`
      SELECT MaTL, TenFile
      FROM dbo.TaiLieu
    `);

    const documents = result.recordset
      .map((document) => ({
        ...document,
        restoredName: isMojibake(document.TenFile)
          ? restoreUtf8FileName(document.TenFile)
          : document.TenFile,
      }))
      .filter((document) => document.restoredName !== document.TenFile);

    if (!documents.length) {
      console.log('Không tìm thấy tên tài liệu bị lỗi mã hóa.');
      return;
    }

    for (const document of documents) {
      console.log(`#${document.MaTL}: ${document.TenFile} -> ${document.restoredName}`);
    }

    if (!apply) {
      console.log('\nĐây là chế độ xem trước. Chạy lại với --apply để cập nhật database.');
      return;
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      for (const document of documents) {
        await new sql.Request(transaction)
          .input('MaTL', sql.Int, document.MaTL)
          .input('TenFile', sql.NVarChar(255), document.restoredName)
          .query('UPDATE dbo.TaiLieu SET TenFile = @TenFile WHERE MaTL = @MaTL');
      }
      await transaction.commit();
      console.log(`Đã sửa ${documents.length} tên tài liệu.`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error('Không thể sửa tên tài liệu:', error);
  process.exit(1);
});
