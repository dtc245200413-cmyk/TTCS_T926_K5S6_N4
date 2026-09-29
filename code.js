import axios from 'axios';

// =========================================================================
// 1. CẤU HÌNH CƠ BẢN VÀ QUẢN LÝ TOKEN
// =========================================================================
const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const getToken = () => localStorage.getItem(TOKEN_KEY);
const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
const saveTokens = (access, refresh) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};
const clearTokens = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// =========================================================================
// 2. YÊU CẦU 1: AUTO-RENEW KHI CÓ HOẠT ĐỘNG (TRACKING DOM EVENTS)
// =========================================================================
let isRenewing = false;
let lastActivityTime = Date.now();
const RENEW_COOLDOWN = 5 * 60 * 1000; // Cứ mỗi 5 phút hoạt động mới gọi API gia hạn 1 lần để tránh spam

async function renewTokenBackground() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return;

    try {
        const response = await axios.post('/api/Auth/RefreshToken', { refreshToken });
        if (response.status === 200) {
            saveTokens(response.data.accessToken, response.data.refreshToken);
        }
    } catch (error) {
        console.error("Gia hạn ngầm thất bại:", error);
        // Không bắt buộc phải đá ra login ở đây, để dành cho interceptor xử lý khi API chính thức fail
    }
}

function onUserActivity() {
    const now = Date.now();
    lastActivityTime = now;

    // Nếu người dùng đang thao tác và đã qua thời gian chờ (cooldown) thì gia hạn ngầm
    if (!isRenewing) {
        isRenewing = true;
        
        // Dùng setTimeout/debounce để không chặn luồng UI
        setTimeout(async () => {
            await renewTokenBackground();
            isRenewing = false;
        }, 1000); // Delay nhẹ 1s
        
        // Reset cooldown
        setTimeout(() => {
            isRenewing = false; 
        }, RENEW_COOLDOWN);
    }
}

// Gắn bộ lắng nghe hoạt động lên toàn trang
['mousemove', 'keydown', 'scroll', 'click'].forEach(event => {
    window.addEventListener(event, onUserActivity, { passive: true });
});

// =========================================================================
// 3. YÊU CẦU 2 & 3: XỬ LÝ LỖI VÀ ĐẨY RA ĐĂNG NHẬP (AXIOS INTERCEPTOR)
// =========================================================================
const apiClient = axios.create({
    baseURL: '/', // Chỉnh sửa lại BaseURL của bạn
    headers: { 'Content-Type': 'application/json' }
});

// Gắn Token vào mọi request
apiClient.interceptors.request.use(config => {
    const token = getToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// Bắt lỗi từ API trả về
apiClient.interceptors.response.use(
    response => response, // Request thành công
    async error => {
        const originalRequest = error.config;

        // Xử lý lỗi 401 (Hết hạn Token)
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = getRefreshToken();
                if (!refreshToken) throw new Error("No refresh token available");

                // Thử gia hạn một lần cuối trước khi báo lỗi
                const res = await axios.post('/api/Auth/RefreshToken', { refreshToken });

                if (res.status === 200) {
                    saveTokens(res.data.accessToken, res.data.refreshToken);
                    originalRequest.headers['Authorization'] = `Bearer ${res.data.accessToken}`;
                    // Gửi lại request vừa bị lỗi 401
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // ĐÁP ỨNG YÊU CẦU 3: Cánh ra đăng nhập khi hết hạn cả token và refresh token
                handleSessionExpired();
                return Promise.reject(refreshError);
            }
        }

        // ĐÁP ỨNG YÊU CẦU 2: Xử lý báo lỗi (có thể dùng UI Toast / Alert thay vì console.error)
        if (error.response) {
            const errorMessage = error.response.data.message || "Đã xảy ra lỗi trong quá trình xử lý.";
            console.error("Hệ thống báo lỗi:", errorMessage);
            alert(`Lỗi: ${errorMessage}`);
        } else if (error.request) {
            alert("Không thể kết nối tới máy chủ.");
        }

        return Promise.reject(error);
    }
);

// Hàm tiện ích để xóa phiên và chuyển hướng
function handleSessionExpired() {
    clearTokens();
    alert("Phiên làm việc của bạn đã hết hạn do không có hoạt động. Vui lòng đăng nhập lại.");
    // Giữ lại URL hiện tại để sau khi login xong có thể quay lại đúng trang cũ
    const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/Account/Login?returnUrl=${currentUrl}`;
}

export default apiClient;