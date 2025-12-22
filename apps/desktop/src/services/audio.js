/**
 * Audio service
 * 使用有道 API，支持回调通知加载状态
 */

let currentAudio = null;
let isUnlocked = false;

// 播放音频，支持回调
export const playAudio = (text, type = 2, callbacks = {}) => {
    if (!text) return;

    const { onLoadStart, onPlaying, onEnded, onError } = callbacks;

    // 停止当前播放
    stopAudio();

    // 触发加载开始回调
    if (onLoadStart) onLoadStart();

    // 使用有道词典 API
    const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=${type}`;
    const audio = new Audio(audioUrl);
    currentAudio = audio;
    audio.volume = 1;

    audio.onplaying = () => {
        if (onPlaying) onPlaying();
    };

    audio.onended = () => {
        currentAudio = null;
        if (onEnded) onEnded();
    };

    audio.onerror = (e) => {
        console.error('[Audio] Load failed:', e);
        currentAudio = null;
        if (onError) onError(e);
    };

    audio.play().catch((err) => {
        console.error('[Audio] Play failed:', err);
        if (onError) onError(err);
    });
};

export const stopAudio = () => {
    if (currentAudio) {
        currentAudio.onplaying = null;
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.pause();
        currentAudio.src = '';
        currentAudio = null;
    }
};

// 解锁音频
export const unlockAudio = () => {
    isUnlocked = true;
    return Promise.resolve(true);
};

export const isAudioUnlocked = () => isUnlocked;
