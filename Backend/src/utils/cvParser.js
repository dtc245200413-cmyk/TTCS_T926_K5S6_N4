const pdfParse = require('pdf-parse');

function cleanLine(value = '') {
  return String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function extractEmail(text) {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match ? match[0].trim() : '';
}

function normalizePhone(rawPhone) {
  if (!rawPhone) return '';

  let value = rawPhone.replace(/[^\d+]/g, '');

  if (value.startsWith('+84')) {
    value = `0${value.slice(3)}`;
  } else if (value.startsWith('84')) {
    value = `0${value.slice(2)}`;
  }

  return value.replace(/\D/g, '');
}

function extractPhone(text) {
  const matches =
    text.match(/(?:\+?84|0)(?:[\s.\-()]?\d){8,10}/g) || [];

  for (const match of matches) {
    const phone = normalizePhone(match);

    if (/^0\d{8,10}$/.test(phone)) {
      return phone;
    }
  }

  return '';
}

function isPossibleName(value) {
  const name = cleanLine(value);

  if (!name) return false;
  if (name.length < 4 || name.length > 80) return false;

  const words = name.split(/\s+/);

  if (words.length < 2 || words.length > 7) {
    return false;
  }

  if (!/^[\p{L}\s'.-]+$/u.test(name)) {
    return false;
  }

  const excludedKeywords = [
    'curriculum vitae',
    'resume',
    'profile',
    'email',
    'phone',
    'telephone',
    'mobile',
    'điện thoại',
    'số điện thoại',
    'contact',
    'address',
    'địa chỉ',
    'github',
    'linkedin',
    'objective',
    'mục tiêu',
    'experience',
    'kinh nghiệm',
    'education',
    'học vấn',
    'kỹ năng',
    'skills'
  ];

  const lower = name.toLowerCase();

  return !excludedKeywords.some((keyword) =>
    lower.includes(keyword)
  );
}

function extractName(text) {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  /*
   * Trường hợp CV có dạng:
   * Họ và tên: Nguyễn Văn A
   * Full Name: Nguyen Van A
   */
  const inlinePatterns = [
    /^(?:họ\s*(?:và\s*)?tên|họ\s*tên)\s*[:\-]\s*(.+)$/i,
    /^full\s*name\s*[:\-]\s*(.+)$/i,
    /^name\s*[:\-]\s*(.+)$/i
  ];

  for (const line of lines) {
    for (const pattern of inlinePatterns) {
      const match = line.match(pattern);

      if (match && isPossibleName(match[1])) {
        return cleanLine(match[1]);
      }
    }
  }

  /*
   * Trường hợp:
   * Họ và tên
   * Nguyễn Văn A
   */
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (
      /^(?:họ\s*(?:và\s*)?tên|họ\s*tên|full\s*name|name)\s*:?\s*$/i.test(
        lines[index]
      ) &&
      isPossibleName(lines[index + 1])
    ) {
      return cleanLine(lines[index + 1]);
    }
  }

  /*
   * Nếu CV không có nhãn "Họ tên",
   * thử tìm một dòng giống tên người ở phần đầu CV.
   */
  const firstLines = lines.slice(0, 20);

  for (const line of firstLines) {
    if (isPossibleName(line)) {
      return cleanLine(line);
    }
  }

  return '';
}

async function parseCvBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Tệp CV không hợp lệ.');
  }

  const pdfData = await pdfParse(buffer);
  const text = pdfData?.text || '';

  if (!text.trim()) {
    throw new Error(
      'Không đọc được nội dung văn bản trong CV PDF.'
    );
  }

  const result = {
    full_name: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text)
  };

  const missingFields = [];

  if (!result.full_name) missingFields.push('full_name');
  if (!result.email) missingFields.push('email');
  if (!result.phone) missingFields.push('phone');

  return {
    ...result,
    missing_fields: missingFields
  };
}

module.exports = {
  parseCvBuffer,
  extractName,
  extractEmail,
  extractPhone
};