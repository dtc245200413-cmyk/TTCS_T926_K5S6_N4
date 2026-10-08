const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const { group } = req.query;
    let query = 'SELECT * FROM master_data WHERE 1=1';
    const params = [];
    if (group) {
      query += ' AND category_group = ?';
      params.push(group);
    }
    query += ' ORDER BY category_group, display_order ASC, name ASC';
    
    const [rows] = await db.pool.query(query, params);
    return sendSuccess(res, 'Success', rows);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { category_group, code, name, description, display_order, is_active } = req.body;
    
    // Check if code exists in the same group
    const [existing] = await db.pool.query(
      'SELECT id FROM master_data WHERE category_group = ? AND code = ?',
      [category_group, code]
    );
    
    if (existing.length > 0) {
      return sendError(res, 400, 'Mã (Code) đã tồn tại trong nhóm danh mục này');
    }
    
    const order = display_order || 0;
    const active = is_active !== undefined ? is_active : true;
    
    const [result] = await db.pool.query(
      'INSERT INTO master_data (category_group, code, name, description, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [category_group, code, name, description, order, active]
    );
    
    return sendSuccess(res, 'Thêm mới thành công', { id: result.insertId });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, display_order, is_active } = req.body;
    
    await db.pool.query(
      'UPDATE master_data SET name = ?, description = ?, display_order = ?, is_active = ? WHERE id = ?',
      [name, description, display_order, is_active, id]
    );
    
    return sendSuccess(res, 'Cập nhật thành công');
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Dummy check for references (since candidate/application tables aren't implemented yet)
    // If they were, we would do a query here. For now, we will just allow deletion or soft-delete.
    // The requirement says "Giá trị đang được tham chiếu thì không xoá được".
    // We will simulate this by checking a mock condition, or just delete it if not referenced.
    
    // Assuming no references currently, we just delete
    await db.pool.query('DELETE FROM master_data WHERE id = ?', [id]);
    
    return sendSuccess(res, 'Xóa thành công');
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return sendError(res, 400, 'Không thể xóa vì danh mục này đang được sử dụng (tham chiếu)');
    }
    next(error);
  }
};

exports.reorder = async (req, res, next) => {
  try {
    const { items } = req.body; // Array of { id, display_order }
    
    if (!Array.isArray(items)) {
      return sendError(res, 400, 'Invalid data format');
    }

    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const item of items) {
        await connection.query('UPDATE master_data SET display_order = ? WHERE id = ?', [item.display_order, item.id]);
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    
    return sendSuccess(res, 'Sắp xếp thành công');
  } catch (error) {
    next(error);
  }
};
