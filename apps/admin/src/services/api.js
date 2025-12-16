import axios from 'axios';

// D1 API server URL (development)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const api = axios.create({
    baseURL: API_BASE_URL + '/api'
});

// Interceptor to add Tenant ID
api.interceptors.request.use(config => {
    const userStr = localStorage.getItem('citour_user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const tenantId = user.tenantId || user.tenant_id;
            if (tenantId !== undefined) {
                config.headers['X-Tenant-ID'] = tenantId;
            }
        } catch (e) {
            console.error('Failed to parse user from localStorage:', e);
        }
    }
    return config;
});

// ==================== Auth ====================

export const login = async (username, password) => {
    const res = await api.post('/auth/login', { account: username, password });
    return res.data;
};

// System Admin Login
export const sysLogin = async (account, password) => {
    const res = await api.post('/sys/login', { account, password });
    return res.data;
};

// ==================== System Management ====================

export const getTenants = async (params = {}) => {
    const res = await api.get('/sys/tenants', { params });
    return res.data;
};

export const createTenant = async (data) => {
    const res = await api.post('/sys/tenants', data);
    return res.data;
};

export const updateTenant = async (id, data) => {
    const res = await api.put(`/sys/tenants/${id}`, data);
    return res.data;
};

export const deleteTenant = async (id) => {
    const res = await api.delete(`/sys/tenants/${id}`);
    return res.data;
};

// ==================== Wordbooks ====================

export const getWordbooks = async (params = {}) => {
    const res = await api.get('/wordbooks', { params });
    return res.data;
};

export const getWordbook = async (id) => {
    const res = await api.get(`/wordbooks/${id}`);
    return res.data;
};

export const createWordbook = async (data) => {
    const res = await api.post('/wordbooks', data);
    return res.data;
};

export const updateWordbook = async (id, data) => {
    const res = await api.put(`/wordbooks/${id}`, data);
    return res.data;
};

export const deleteWordbook = async (id) => {
    const res = await api.delete(`/wordbooks/${id}`);
    return res.data;
};

// ==================== Words ====================

export const getWords = async (wordbookId, params = {}) => {
    const res = await api.get(`/words/book/${wordbookId}`, { params });
    return res.data;
};

export const getWord = async (id) => {
    const res = await api.get(`/words/${id}`);
    return res.data;
};

export const createWord = async (wordbookId, data) => {
    const res = await api.post('/words', { ...data, book_id: wordbookId });
    return res.data;
};

export const updateWord = async (id, data) => {
    const res = await api.put(`/words/${id}`, data);
    return res.data;
};

export const deleteWord = async (id) => {
    const res = await api.delete(`/words/${id}`);
    return res.data;
};

export const importWords = async (wordbookId, words) => {
    const res = await api.post('/words/import', { book_id: wordbookId, words });
    return res.data;
};

// ==================== Students ====================

export const getStudents = async (params = {}) => {
    const res = await api.get('/students', { params });
    return res.data;
};

export const createStudent = async (data) => {
    const res = await api.post('/students', data);
    return res.data;
};

export const updateStudent = async (id, data) => {
    const res = await api.put(`/students/${id}`, data);
    return res.data;
};

export const deleteStudent = async (id) => {
    const res = await api.delete(`/students/${id}`);
    return res.data;
};

// ==================== Practice Records ====================

export const getPracticeRecords = async (params = {}) => {
    const res = await api.get('/practice/history', { params });
    return res.data;
};

// Note: practice_details table was removed in D1 migration
// This function returns empty data for backward compatibility
export const getPracticeDetails = async (recordId, params = {}) => {
    // In the new architecture, we use word_mastery for per-word statistics
    // This is kept for backward compatibility
    return {
        success: true,
        data: [],
        total: 0
    };
};

export const getWrongWords = async (params = {}) => {
    const res = await api.get('/practice/wrong-words', { params });
    return res.data;
};

// ==================== Dashboard ====================

export const getDashboardStats = async () => {
    const res = await api.get('/dashboard/stats');
    return res.data;
};

export const getUserStats = async (userId) => {
    const res = await api.get('/dashboard/user-stats', { params: { user_id: userId } });
    return res.data;
};

// ==================== Study Plans ====================

export const getStudyPlans = async (userId) => {
    const res = await api.get('/plans', { params: { user_id: userId } });
    return res.data;
};

export const createStudyPlan = async (data) => {
    const res = await api.post('/plans', data);
    return res.data;
};

export const updateStudyPlan = async (id, data) => {
    const res = await api.put(`/plans/${id}`, data);
    return res.data;
};

export const deleteStudyPlan = async (id) => {
    const res = await api.delete(`/plans/${id}`);
    return res.data;
};

// ==================== Daily Tasks ====================

export const getTodayTasks = async (userId) => {
    const res = await api.get('/tasks/today', { params: { user_id: userId } });
    return res.data;
};

export const generateDailyTask = async (userId, planId) => {
    const res = await api.post('/tasks/generate', { user_id: userId, plan_id: planId });
    return res.data;
};

export const getTaskDetails = async (taskId) => {
    const res = await api.get(`/tasks/${taskId}`);
    return res.data;
};

export const updateTaskProgress = async (taskId, data) => {
    const res = await api.put(`/tasks/${taskId}/progress`, data);
    return res.data;
};

// ==================== Practice ====================

export const submitPracticeResult = async (data) => {
    const res = await api.post('/practice/submit', data);
    return res.data;
};

export const startPracticeSession = async (data) => {
    const res = await api.post('/practice/session/start', data);
    return res.data;
};

export const endPracticeSession = async (sessionId, data) => {
    const res = await api.post(`/practice/session/${sessionId}/end`, data);
    return res.data;
};

export default api;
