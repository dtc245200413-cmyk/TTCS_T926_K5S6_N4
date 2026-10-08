const db = require('./src/config/database');
const insertData = async () => {
  try {
    const connection = await db.pool.getConnection();
    await connection.query("DELETE FROM master_data WHERE category_group = 'WORK_TYPE'");
    
    const types = [
      { code: 'FULLTIME', name: 'Toàn thời gian (Full-time)', desc: 'Làm việc toàn thời gian theo quy định của công ty.' },
      { code: 'PARTTIME', name: 'Bán thời gian (Part-time)', desc: 'Làm việc bán thời gian hoặc theo ca.' },
      { code: 'INTERNSHIP', name: 'Thực tập sinh (Internship)', desc: 'Chương trình thực tập sinh có thời hạn.' },
      { code: 'CONTRACT', name: 'Hợp đồng / Dự án (Contract)', desc: 'Làm việc theo hợp đồng thời vụ hoặc theo dự án cụ thể.' },
      { code: 'REMOTE', name: 'Làm việc từ xa (Remote)', desc: 'Làm việc 100% từ xa không cần đến văn phòng.' },
      { code: 'HYBRID', name: 'Kết hợp (Hybrid)', desc: 'Làm việc linh hoạt kết hợp giữa từ xa và tại văn phòng.' }
    ];

    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      await connection.query(
        'INSERT INTO master_data (category_group, code, name, description, display_order, is_active, is_referenced) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['WORK_TYPE', t.code, t.name, t.desc, i + 1, true, false]
      );
    }
    
    connection.release();
    console.log('Thêm dữ liệu hình thức làm việc thành công!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
insertData();
