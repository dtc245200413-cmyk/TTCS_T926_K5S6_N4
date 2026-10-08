const db = require('./src/config/database');
const insertData = async () => {
  try {
    const connection = await db.pool.getConnection();
    await connection.query("DELETE FROM master_data WHERE category_group = 'WORK_LOCATION'");
    
    const locations = [
      { code: 'HN', name: 'Hà Nội', desc: 'Tầng 12, Tòa nhà Enterprise Center, Cầu Giấy' },
      { code: 'HCM', name: 'TP. HCM', desc: 'Tầng 8, Tòa nhà Innovation Hub, Quận 1' },
      { code: 'DN', name: 'Đà Nẵng', desc: 'Tầng 5, Tòa nhà HighTech, Hải Châu' }
    ];

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      await connection.query(
        'INSERT INTO master_data (category_group, code, name, description, display_order, is_active, is_referenced) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['WORK_LOCATION', loc.code, loc.name, loc.desc, i + 1, true, false]
      );
    }
    
    connection.release();
    console.log('Thêm dữ liệu địa điểm thành công!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
insertData();
