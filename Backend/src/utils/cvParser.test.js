jest.mock('pdf-parse', () => jest.fn());

const pdfParse = require('pdf-parse');

const {
  parseCvBuffer,
  extractName,
  extractEmail,
  extractPhone
} = require('./cvParser');

describe('SCRUM-67 - CV Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('bóc tách đúng email', () => {
    const text = `
      Nguyễn Văn An
      Email: nguyenvanan@gmail.com
      Phone: 0987654321
    `;

    expect(extractEmail(text)).toBe(
      'nguyenvanan@gmail.com'
    );
  });

  test('bóc tách đúng số điện thoại Việt Nam', () => {
    const text = `
      Số điện thoại: 0987 654 321
    `;

    expect(extractPhone(text)).toBe('0987654321');
  });

  test('chuẩn hóa số điện thoại +84', () => {
    const text = `
      Mobile: +84 987 654 321
    `;

    expect(extractPhone(text)).toBe('0987654321');
  });

  test('bóc tách họ tên có nhãn Họ và tên', () => {
    const text = `
      Họ và tên: Nguyễn Văn An
      Email: nguyenvanan@gmail.com
    `;

    expect(extractName(text)).toBe('Nguyễn Văn An');
  });

  test('bóc tách họ tên tiếng Anh', () => {
    const text = `
      Full Name: Nguyen Van An
      Email: an@gmail.com
    `;

    expect(extractName(text)).toBe('Nguyen Van An');
  });

  test('parse CV trả về đầy đủ họ tên, email và điện thoại', async () => {
    pdfParse.mockResolvedValue({
      text: `
        Họ và tên: Nguyễn Văn An
        Email: nguyenvanan@gmail.com
        Số điện thoại: 0987654321
        Kinh nghiệm
        Backend Developer
      `
    });

    const result = await parseCvBuffer(
      Buffer.from('fake-pdf')
    );

    expect(result.full_name).toBe('Nguyễn Văn An');
    expect(result.email).toBe(
      'nguyenvanan@gmail.com'
    );
    expect(result.phone).toBe('0987654321');
    expect(result.missing_fields).toEqual([]);
  });

  test('CV thiếu số điện thoại phải báo missing_fields', async () => {
    pdfParse.mockResolvedValue({
      text: `
        Họ và tên: Trần Minh Anh
        Email: minhanh@gmail.com
      `
    });

    const result = await parseCvBuffer(
      Buffer.from('fake-pdf')
    );

    expect(result.full_name).toBe('Trần Minh Anh');
    expect(result.email).toBe('minhanh@gmail.com');
    expect(result.phone).toBe('');

    expect(result.missing_fields).toContain(
      'phone'
    );
  });

  test('PDF không có nội dung phải báo lỗi', async () => {
    pdfParse.mockResolvedValue({
      text: ''
    });

    await expect(
      parseCvBuffer(Buffer.from('fake-pdf'))
    ).rejects.toThrow(
      'Không đọc được nội dung văn bản trong CV PDF.'
    );
  });

  test('buffer rỗng phải báo lỗi', async () => {
    await expect(
      parseCvBuffer(Buffer.alloc(0))
    ).rejects.toThrow('Tệp CV không hợp lệ.');
  });
});