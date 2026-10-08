const profileService = require('../services/companyProfileService');
const { sendSuccess } = require('../utils/response');

const getProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getCompanyProfile();
    return sendSuccess(res, 'Lấy thông tin công ty thành công.', profile);
  } catch (error) { next(error); }
};

const updateProfile = async (req, res, next) => {
  try {
    const data = {
      name: req.body.name,
      description: req.body.description,
      website: req.body.website
    };
    
    // If files are uploaded, get their paths
    if (req.files) {
      if (req.files.logo && req.files.logo.length > 0) {
        data.logo_url = `/uploads/${req.files.logo[0].filename}`;
      }
      if (req.files.banner && req.files.banner.length > 0) {
        data.banner_url = `/uploads/${req.files.banner[0].filename}`;
      }
    }
    
    const result = await profileService.updateCompanyProfile(data, req.user.user_id, req.ip);
    return sendSuccess(res, 'Cập nhật thông tin công ty thành công.', result);
  } catch (error) { next(error); }
};

module.exports = {
  getProfile,
  updateProfile
};
