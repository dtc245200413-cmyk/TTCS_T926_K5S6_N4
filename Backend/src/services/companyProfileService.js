const profileRepo = require('../repositories/companyProfileRepository');
const auditRepo = require('../repositories/auditRepository');

async function getCompanyProfile() {
  const profile = await profileRepo.getProfile();
  return profile || { name: '', description: '', logo_url: '', banner_url: '', website: '' };
}

async function updateCompanyProfile(data, userId, ipAddress) {
  // Get current profile
  const existing = await profileRepo.getProfile();
  
  // Merge data (keep old image URLs if no new ones are provided)
  const newData = {
    name: data.name || (existing ? existing.name : ''),
    description: data.description || (existing ? existing.description : ''),
    logo_url: data.logo_url || (existing ? existing.logo_url : ''),
    banner_url: data.banner_url || (existing ? existing.banner_url : ''),
    website: data.website || (existing ? existing.website : '')
  };
  
  const result = await profileRepo.upsertProfile(newData);
  
  // Audit
  await auditRepo.createLog({
    userId: userId,
    performedBy: userId,
    action: 'UPDATE_COMPANY_PROFILE',
    entityType: 'company_profile',
    entityId: String(result.id),
    description: 'Updated company profile settings',
    ipAddress
  });
  
  return result;
}

module.exports = {
  getCompanyProfile,
  updateCompanyProfile
};
