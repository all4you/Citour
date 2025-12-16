import axios from 'axios';

// 使用 VITE_API_URL 环境变量 (生产环境)，否则回退到 /api (开发环境走代理)
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL,
    timeout: 10000
});

// 请求拦截器
api.interceptors.request.use(config => {
    const userStr = localStorage.getItem('citour_student');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.tenantId) {
                config.headers['X-Tenant-ID'] = user.tenantId;
            }
        } catch (e) {
            console.error('Failed to parse user:', e);
        }
    }
    return config;
});

// ==================== 认证 ====================

export const studentLogin = async (tenantId, account, password) => {
    const res = await api.post('/auth/student/login', { tenantId, account, password });
    return res.data;
};

// ==================== 单词本 ====================

export const getWordbooks = async (params = {}) => {
    const res = await api.get('/wordbooks', { params: { ...params, status: 'online' } });
    return res.data;
};

export const getWordbook = async (id) => {
    const res = await api.get(`/wordbooks/${id}`);
    return res.data;
};

// ==================== 单词 ====================

export const getWords = async (wordbookId, params = {}) => {
    const res = await api.get(`/words/book/${wordbookId}`, { params });
    return res.data;
};

// ==================== 学习计划 ====================

// 获取所有单词本及学习状态
export const getBooksWithProgress = async (userId) => {
    const res = await api.get('/plans', { params: { user_id: userId } });
    return res.data;
};

// 获取当前学习中的单词本
export const getCurrentLearningBook = async (userId) => {
    const res = await api.get('/plans/current', { params: { user_id: userId } });
    return res.data;
};

// 获取单词本学习统计
export const getBookStats = async (userId, bookId) => {
    const res = await api.get(`/plans/${bookId}/stats`, { params: { user_id: userId } });
    return res.data;
};

// 开始学习单词本
export const startLearningBook = async (userId, bookId) => {
    const res = await api.put(`/plans/${bookId}/start`, { user_id: userId });
    return res.data;
};

// 暂停学习单词本
export const pauseLearningBook = async (userId, bookId) => {
    const res = await api.put(`/plans/${bookId}/pause`, { user_id: userId });
    return res.data;
};

// 标记单词本学习完成
export const completeLearningBook = async (userId, bookId) => {
    const res = await api.put(`/plans/${bookId}/complete`, { user_id: userId });
    return res.data;
};

// ==================== 学习任务 ====================

// 创建学习任务
export const generateLearningTask = async (userId, bookId) => {
    const res = await api.post('/tasks/generate', { user_id: userId, book_id: bookId });
    return res.data;
};

// 获取任务详情
export const getTaskDetails = async (taskId) => {
    const res = await api.get(`/tasks/${taskId}`);
    return res.data;
};

// 更新任务进度
export const updateTaskProgress = async (taskId, data) => {
    const res = await api.put(`/tasks/${taskId}/update`, data);
    return res.data;
};

// ==================== 练习 ====================

// 提交单词练习结果
export const submitPracticeResult = async (data) => {
    const res = await api.post('/practice/submit', data);
    return res.data;
};

// ==================== 统计 ====================

export const getUserStats = async (userId) => {
    const res = await api.get('/dashboard/user-stats', { params: { user_id: userId } });
    return res.data;
};

export const getCalendarStats = async (userId, year, month) => {
    const res = await api.get('/calendar', { params: { user_id: userId, year, month } });
    return res.data;
};

// ==================== 错词本 ====================

export const getWrongWords = async (userId, params = {}) => {
    const res = await api.get('/practice/wrong-words', { params: { user_id: userId, ...params } });
    return res.data;
};

export default api;
