import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import statsApi from '../api/statsApi';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { FaUsers, FaUserCheck, FaUserLock, FaBuilding, FaUserShield } from 'react-icons/fa';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const Home = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await statsApi.getDashboardStats();
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const isAdmin = user?.roles?.some(r => r.role_code === 'ADMIN');

  // Format data for charts
  const roleData = stats?.roles?.map(r => ({ name: r.role_name, value: r.total })) || [];
  const deptData = stats?.departments?.map(d => ({ name: d.department_name, 'Số nhân viên': d.total_users })) || [];

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 100px)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', overflowX: 'hidden' }}>
      {/* Decorative Background Elements */}
      <div style={{ position: 'absolute', top: '-10%', right: '10%', width: '400px', height: '400px', background: '#f8fafc', borderRadius: '50%', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '300px', height: '300px', background: '#f8fafc', borderRadius: '50%', zIndex: 0 }}></div>

      {/* Welcome Banner (Top Strip) */}
      <div style={{ position: 'relative', zIndex: 1, height: '140px', flexShrink: 0, background: 'linear-gradient(to right, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.5)), url("/login-bg.png")', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '24px', padding: '0 40px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'white' }}>
          <h1 className="g-page-title">
            Chào mừng trở lại, {user?.full_name ? user.full_name.split(' ').pop() : ''}! 👋
          </h1>
          <p className="g-page-subtitle">
            Chúc bạn một ngày làm việc hiệu quả. {isAdmin && "Dưới đây là tổng quan hệ thống."}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right', color: 'white' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{user?.full_name}</h3>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{user?.job_title}</span>
            </div>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: '800', border: '2px solid white' }}>
              {user?.full_name?.charAt(0) || 'U'}
            </div>
        </div>
      </div>

      {!isAdmin ? (
         <div style={{ position: 'relative', zIndex: 1, background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}>
           <h2>Hồ sơ của bạn</h2>
           <p>Mã nhân viên: <strong>{user?.employee_code}</strong></p>
           <p>Phòng ban: <strong>{user?.department?.department_name}</strong></p>
           <Link to="/profile/edit" className="g-btn-primary">Cập nhật hồ sơ</Link>
         </div>
      ) : (
        /* ADMIN DASHBOARD */
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'min-content' }}>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải dữ liệu...</div>
          ) : (
            <>
              {/* Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                
                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid #4f46e5' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(79,70,229,0.1)', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                    <FaUsers />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Tổng NV</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{stats?.users?.total || 0}</div>
                  </div>
                </div>

                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                    <FaUserCheck />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>TK Hoạt động</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{stats?.users?.active || 0}</div>
                  </div>
                </div>

                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                    <FaUserLock />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>TK Bị khóa</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{stats?.users?.locked || 0}</div>
                  </div>
                </div>

                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                    <FaBuilding />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Phòng ban</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{stats?.totals?.departments || 0}</div>
                  </div>
                </div>

                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                    <FaUserShield />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Vai trò</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{stats?.totals?.roles || 0}</div>
                  </div>
                </div>

              </div>

              {/* Charts */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', minHeight: '400px' }}>
                
                {/* Bar Chart: Users by Department */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#334155' }}>Nhân viên theo phòng ban</h3>
                  <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer>
                      <BarChart data={deptData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{fill: 'rgba(79,70,229,0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Legend />
                        <Bar dataKey="Số nhân viên" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Chart: Users by Role */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#334155' }}>Tỷ lệ vai trò</h3>
                  <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={roleData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {roleData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
