const { pool } = require('../config/database');

async function getProfile() {
  const [rows] = await pool.query('SELECT * FROM company_profile LIMIT 1');
  return rows[0] || null;
}

async function upsertProfile(data) {
  const existing = await getProfile();
  if (existing) {
    const sql = `UPDATE company_profile SET name = ?, description = ?, logo_url = ?, banner_url = ?, website = ? WHERE id = ?`;
    await pool.execute(sql, [data.name, data.description, data.logo_url, data.banner_url, data.website, existing.id]);
  } else {
    const sql = `INSERT INTO company_profile (name, description, logo_url, banner_url, website) VALUES (?, ?, ?, ?, ?)`;
    await pool.execute(sql, [data.name, data.description, data.logo_url, data.banner_url, data.website]);
  }
  return await getProfile();
}

module.exports = {
  getProfile,
  upsertProfile
};
