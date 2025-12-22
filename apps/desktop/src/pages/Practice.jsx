import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import { getTaskDetails, submitPracticeResult, updateTaskProgress } from '../services/api';
import { playAudio, stopAudio, unlockAudio, isAudioUnlocked } from '../services/audio';
import styles from '../styles/practice.module.css';

export default function Practice() {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [user] = useState(() => JSON.parse(localStorage.getItem('citour_student') || '{}'));

    const [loading, setLoading] = useState(true);
    const [words, setWords] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [letterInputs, setLetterInputs] = useState([]); // 字母数组
    const [showResult, setShowResult] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [usedHint, setUsedHint] = useState(false);
    const [stats, setStats] = useState({ correct: 0, wrong: 0, hint: 0 });
    const [completed, setCompleted] = useState(false);
    const [failedWords, setFailedWords] = useState([]); // 失败单词池
    const [currentRound, setCurrentRound] = useState(1); // 当前轮次
    const [startTime, setStartTime] = useState(null); // 开始时间
    const [elapsedTime, setElapsedTime] = useState(0); // 总用时（秒）
    const [currentTime, setCurrentTime] = useState(0); // 当前实时耗时（秒）

    const inputRefs = useRef([]); // 多个输入框的引用
    const hasFetched = useRef(false);
    const totalWordsCount = useRef(0); // 原始单词总数（用于统计）
    const [audioReady, setAudioReady] = useState(false); // 音频是否已授权
    const [audioLoading, setAudioLoading] = useState(false); // 音频是否正在加载

    // 移除本地播放逻辑，改用统一的 audio service

    // 播放音效
    const playSound = useCallback((type) => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'correct') {
            oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
        } else {
            oscillator.frequency.setValueAtTime(311.13, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(261.63, audioCtx.currentTime + 0.15);
        }

        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }, []);

    // 处理音频授权 - 在用户点击事件中直接播放
    const handleEnableAudio = async () => {
        setAudioReady(true);

        // 加载任务
        if (!hasFetched.current) {
            hasFetched.current = true;
            const firstWord = await loadTask();
            // 在同一个点击事件中播放第一个单词（满足浏览器 autoplay 策略）
            if (firstWord) {
                playAudio(firstWord);
            }
        }
    };

    // 如果已经解锁（比如从其他页面解锁过），直接加载
    useEffect(() => {
        if (isAudioUnlocked()) {
            setAudioReady(true);
            if (!hasFetched.current) {
                hasFetched.current = true;
                loadTask();
            }
        }
    }, []);

    const loadTask = async () => {
        try {
            setLoading(true);
            const res = await getTaskDetails(taskId);
            const task = res.data;

            // 新任务结构：直接使用 words 数组
            const allWords = task.words || [];
            setWords(allWords);
            totalWordsCount.current = allWords.length; // 保存原始单词总数

            // 记录开始时间
            setStartTime(Date.now());

            // 返回第一个单词用于播放
            return allWords.length > 0 ? allWords[0].spelling : null;
        } catch (err) {
            console.error('Failed to load task:', err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const currentWord = words[currentIndex];
    const wordLength = currentWord?.spelling?.length || 0;

    // 判断字符是否需要用户输入
    const isInputtable = (char) => {
        if (!char) return false;
        // 字母、撇号 (') 和 连字符 (-) 需要输入
        return /[a-zA-Z1-9'-]/.test(char);
    };

    // 实时更新计时器
    useEffect(() => {
        if (!startTime || completed) return;

        const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setCurrentTime(elapsed);
        }, 1000);

        return () => clearInterval(timer);
    }, [startTime, completed]);

    // 初始化字母输入数组（当单词变化时）
    useEffect(() => {
        if (currentWord?.spelling) {
            // 创建字母输入数组（首字母不需要输入，从索引1开始）
            const spelling = currentWord.spelling;
            const initialInputs = [];

            for (let i = 1; i < spelling.length; i++) {
                const char = spelling[i];
                if (isInputtable(char)) {
                    initialInputs.push(''); // 需要输入的部分初始化为空串
                } else {
                    initialInputs.push(char); // 标点符号/空格自动填充
                }
            }

            setLetterInputs(initialInputs);

            // 聚焦第一个可输入的框
            setTimeout(() => {
                const firstInputtableIndex = initialInputs.findIndex((char, idx) => isInputtable(spelling[idx + 1]));
                if (firstInputtableIndex !== -1) {
                    inputRefs.current[firstInputtableIndex]?.focus();
                }
            }, 100);
        }
    }, [currentWord?.spelling, currentIndex]);

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (showResult) return;

        // 拼接用户输入：首字母 + 已经包含自动填充字符的 letterInputs
        const userAnswer = currentWord.spelling[0] + letterInputs.join('');
        const correct = userAnswer.toLowerCase() === currentWord.spelling.toLowerCase();

        // 直接翻转显示结果
        setIsCorrect(correct);
        setShowResult(true);
        playSound(correct ? 'correct' : 'wrong');

        // 先更新统计（确保 UI 立即响应）
        if (correct) {
            setStats(prev => ({
                ...prev,
                correct: prev.correct + 1,
                hint: prev.hint + (usedHint ? 1 : 0)
            }));
        } else {
            setStats(prev => ({
                ...prev,
                wrong: prev.wrong + 1,
                hint: prev.hint + (usedHint ? 1 : 0)
            }));
            // 将失败单词加入失败池（用于下一轮）
            setFailedWords(prev => [...prev, currentWord]);
        }

        // 提交结果到后端（不阻塞 UI）
        try {
            await submitPracticeResult({
                user_id: user.id,
                word_id: currentWord.id,
                book_id: currentWord.book_id,
                is_correct: correct,
                used_hint: usedHint,
                user_input: userAnswer,
                task_id: taskId
            });
        } catch (err) {
            console.error('Failed to submit:', err);
        }
    };

    const handleNext = useCallback(() => {
        if (currentIndex + 1 >= words.length) {
            // 本轮结束，检查是否有失败单词需要重新打卡
            if (failedWords.length > 0) {
                // 开始新一轮：将失败池作为新的单词列表
                setWords(failedWords);
                setFailedWords([]);
                setCurrentIndex(0);
                setCurrentRound(prev => prev + 1);
                setShowResult(false);
                setShowHint(false);
                setIsCorrect(false);
                setUsedHint(false);

                // 播放第一个失败单词
                setTimeout(() => {
                    playAudio(failedWords[0].spelling);
                }, 100);
            } else {
                // 所有单词都成功，完成练习
                finishPractice();
            }
            return;
        }

        setCurrentIndex(prev => prev + 1);
        // letterInputs 会在 useEffect 中自动初始化
        setShowResult(false);
        setShowHint(false);
        setIsCorrect(false);
        setUsedHint(false);

        // 播放下一个单词
        setTimeout(() => {
            playAudio(words[currentIndex + 1]?.spelling);
        }, 100);
    }, [currentIndex, words, failedWords, playAudio]);

    // 处理单个字母输入
    const handleLetterChange = (index, value) => {
        // 获取实际的拼写字符，决定允许输入的范围
        const targetChar = currentWord.spelling[index + 1];

        let letter = '';
        if (targetChar === "'" || targetChar === "-") {
            // 如果目标是撇号或连字符，允许输入这些符号
            letter = value.slice(-1);
            if (!["'", "-", ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].includes(letter)) {
                letter = '';
            }
        } else {
            // 默认只允许字母
            letter = value.replace(/[^a-zA-Z]/g, '').slice(-1);
        }

        const newInputs = [...letterInputs];
        newInputs[index] = letter;
        setLetterInputs(newInputs);

        // 如果输入了字母，自动跳到下一个可输入框
        if (letter) {
            let nextIndex = index + 1;
            // 跳过所有非输入框（自动填充的标点/空格）
            while (nextIndex < letterInputs.length && !isInputtable(currentWord.spelling[nextIndex + 1])) {
                nextIndex++;
            }
            if (nextIndex < letterInputs.length) {
                inputRefs.current[nextIndex]?.focus();
            }
        }
    };

    // 处理键盘事件（支持退格跳转和回车下一个）
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !letterInputs[index] && index > 0) {
            let prevIndex = index - 1;
            // 跳过所有非输入框
            while (prevIndex >= 0 && !isInputtable(currentWord.spelling[prevIndex + 1])) {
                prevIndex--;
            }
            if (prevIndex >= 0) {
                inputRefs.current[prevIndex]?.focus();
            }
        }
    };

    // 全局回车键处理（用于结果页面）
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // 完成后不再响应回车键
            if (e.key === 'Enter' && showResult && !completed) {
                e.preventDefault();
                handleNext();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [showResult, handleNext, completed]);

    // 显示提示（翻转卡片）
    const handleHint = () => {
        if (!showResult && !showHint) {
            setUsedHint(true);
            setShowHint(true);
            // 更新提示次数统计
            setStats(prev => ({
                ...prev,
                hint: prev.hint + 1
            }));
        }
    };

    // 从提示页面继续打卡
    const handleContinue = () => {
        setShowHint(false);
        // 增加延迟确保卡片翻转动画完成后再聚焦
        setTimeout(() => {
            // 寻找第一个可输入框重新聚焦
            const firstInputtableIndex = letterInputs.findIndex((char, idx) => isInputtable(currentWord.spelling[idx + 1]));
            if (firstInputtableIndex !== -1) {
                inputRefs.current[firstInputtableIndex]?.focus();
            } else {
                inputRefs.current[0]?.focus();
            }
        }, 350);
    };

    const finishPractice = async () => {
        setCompleted(true);

        // 计算总用时
        if (startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setElapsedTime(elapsed);
        }

        // 更新任务状态和统计
        await updateTaskProgress(taskId, {
            correct_count: stats.correct,
            wrong_count: stats.wrong,
            hint_count: stats.hint,
            status: 'completed'
        });
    };

    // 如果音频未授权，显示授权弹窗
    if (!audioReady) {
        return (
            <div className={`${styles.practicePage} ${styles.loading}`}>
                <div className={styles.audioUnlockCard}>
                    <div className={styles.audioIcon}>🔊</div>
                    <h2>开启发音</h2>
                    <p>为了获得最佳学习体验，请点击下方按钮启用发音功能</p>
                    <button
                        className="btn btn-primary btn-large"
                        onClick={handleEnableAudio}
                    >
                        点击启用发音
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={`${styles.practicePage} ${styles.loading}`}>
                <div className={styles.loadingSpinner}>📚</div>
                <p>加载中...</p>
            </div>
        );
    }

    if (completed) {
        // 总尝试次数 = 正确次数 + 错误次数
        const totalAttempts = stats.correct + stats.wrong;
        // 正确率 = 正确次数 / 总尝试次数
        const accuracy = totalAttempts > 0 ? Math.round((stats.correct / totalAttempts) * 100) : 0;

        // 格式化用时
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        const timeText = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;

        return (
            <div className={styles.practicePage}>
                <div className={styles.completionCard}>
                    <div className={styles.celebration}>🎉</div>
                    <h2>太棒了！</h2>
                    <p>你完成了今天的学习任务</p>

                    <div className={styles.resultStats}>
                        <div className={styles.resultStat}>
                            <span className={styles.label}>总计</span>
                            <span className={styles.value}>{totalWordsCount.current}</span>
                        </div>
                        <div className={`${styles.resultStat} ${styles.correct}`}>
                            <span className={styles.label}>正确</span>
                            <span className={styles.value}>{stats.correct}</span>
                        </div>
                        <div className={`${styles.resultStat} ${styles.wrong}`}>
                            <span className={styles.label}>错误</span>
                            <span className={styles.value}>{stats.wrong}</span>
                        </div>
                        <div className={styles.resultStat}>
                            <span className={styles.label}>正确率</span>
                            <span className={styles.value}>{accuracy}%</span>
                        </div>
                        <div className={`${styles.resultStat} ${styles.time}`}>
                            <span className={styles.label}>用时</span>
                            <span className={styles.value}>{timeText}</span>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary btn-large"
                        onClick={() => navigate('/home')}
                    >
                        返回首页
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.practicePage}>
            {/* 主容器：包含进度条和卡片，保持同宽居中 */}
            <div className={styles.practiceContainer}>
                {/* 头部区域 - 简化版 */}
                <div className={styles.practiceHeaderSimple}>
                    <button className={styles.backBtn} onClick={() => navigate('/home')}>
                        ←
                    </button>
                    <div className={styles.headerTitle}>
                        <h2>单词练习</h2>
                        {currentRound > 1 && <span className={styles.roundHint}>第{currentRound}轮复习 🔄</span>}
                    </div>
                </div>

                {/* Word Card */}
                <div
                    className={styles.wordCard}
                    key={currentIndex}
                >
                    {showHint ? (
                        /* 提示卡片 - 显示单词详情 */
                        <div className={styles.cardHint}>
                            <div className={styles.hintHeader}>正确答案</div>

                            <div className={styles.hintSpelling}>
                                <span className={styles.spellingText}>{currentWord?.spelling}</span>
                                <button
                                    className={`${styles.audioBtnSmall} ${audioLoading ? styles.audioBtnLoading : ''}`}
                                    onClick={() => {
                                        if (audioLoading) return;
                                        setAudioLoading(true);
                                        playAudio(currentWord?.spelling, 2, {
                                            onPlaying: () => setAudioLoading(false),
                                            onEnded: () => setAudioLoading(false),
                                            onError: () => setAudioLoading(false)
                                        });
                                    }}
                                    disabled={audioLoading}
                                >
                                    {audioLoading ? '⏳' : '🔊'}
                                </button>
                            </div>

                            <div className={styles.hintMeaning}>{currentWord?.meaning}</div>

                            {currentWord?.phonics_data && (
                                <div className={`${styles.hintInfo} ${styles.phonics}`}>
                                    <span className={styles.infoIcon}>📖</span>
                                    <span>自然拼读: {currentWord.phonics_data}</span>
                                </div>
                            )}

                            {currentWord?.sentence && (
                                <div className={`${styles.hintInfo} ${styles.sentence}`}>
                                    <span className={styles.infoIcon}>📝</span>
                                    <span>{currentWord.sentence}</span>
                                </div>
                            )}

                            {currentWord?.root_info && (
                                <div className={`${styles.hintInfo} ${styles.etymology}`}>
                                    <span className={styles.infoIcon}>🌱</span>
                                    <span>词根: {currentWord.root_info}</span>
                                </div>
                            )}

                            <button
                                className={`btn ${styles.btnContinue} ${styles.btnLarge}`}
                                onClick={handleContinue}
                            >
                                ↻ 继续打卡
                            </button>
                        </div>
                    ) : !showResult ? (
                        <div className={styles.cardFront}>
                            {/* 徽章组 */}
                            <div className={styles.statsBadges}>
                                <div className={`${styles.badge} ${styles.badgeTime}`}>
                                    <div className={styles.badgeLabel}>耗时</div>
                                    <div className={styles.badgeValue}>{Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}</div>
                                </div>
                                <div className={`${styles.badge} ${styles.badgeCorrect}`}>
                                    <div className={styles.badgeLabel}>正确</div>
                                    <div className={styles.badgeValue}>{stats.correct}</div>
                                </div>
                                <div className={`${styles.badge} ${styles.badgeWrong}`}>
                                    <div className={styles.badgeLabel}>错误</div>
                                    <div className={styles.badgeValue}>{stats.wrong}</div>
                                </div>
                                <div className={`${styles.badge} ${styles.badgeCount}`}>
                                    <div className={styles.badgeLabel}>进度</div>
                                    <div className={styles.badgeValue}>{currentIndex + 1}/{words.length}</div>
                                </div>
                            </div>

                            {/* 进度条行 */}
                            <div className={styles.progressBarRow}>
                                <div className={styles.practiceProgressBarContainer}>
                                    <div
                                        className={styles.progressBarFill}
                                        style={{ width: `${Math.round(((currentIndex + 1) / words.length) * 100)}%` }}
                                    />
                                </div>
                                <div className={styles.progressPercent}>{Math.round(((currentIndex + 1) / words.length) * 100)}%</div>
                            </div>

                            {/* 分隔线 */}
                            <div className={styles.statsDivider}></div>

                            <div className={styles.meaning}>{currentWord?.meaning}</div>

                            <button
                                className={`${styles.audioBtn} ${audioLoading ? styles.audioBtnLoading : ''}`}
                                onClick={() => {
                                    if (audioLoading) return;
                                    setAudioLoading(true);
                                    playAudio(currentWord?.spelling, 2, {
                                        onPlaying: () => setAudioLoading(false),
                                        onEnded: () => setAudioLoading(false),
                                        onError: () => setAudioLoading(false)
                                    });
                                }}
                                disabled={audioLoading}
                            >
                                <span className={audioLoading ? styles.audioIconLoading : ''}>
                                    {audioLoading ? '⏳' : '🔊'}
                                </span>
                                <span>{audioLoading ? '加载中...' : '听发音'}</span>
                            </button>

                            <form onSubmit={handleSubmit} className={styles.inputSection}>
                                <div className={styles.letterBoxes}>
                                    {/* 首字母固定显示 */}
                                    <div className={`${styles.letterBox} ${styles.firstLetter}`}>
                                        {currentWord?.spelling[0]}
                                    </div>
                                    {/* 剩余字母输入框 */}
                                    {letterInputs.map((letter, index) => {
                                        const charInWord = currentWord.spelling[index + 1];
                                        const inputtable = isInputtable(charInWord);

                                        if (inputtable) {
                                            return (
                                                <input
                                                    key={index}
                                                    ref={el => inputRefs.current[index] = el}
                                                    type="text"
                                                    className={`${styles.letterBox} ${styles.letterInput}`}
                                                    value={letter}
                                                    onChange={(e) => handleLetterChange(index, e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                                    maxLength={1}
                                                />
                                            );
                                        } else {
                                            return (
                                                <div
                                                    key={index}
                                                    className={`${styles.letterBox} ${styles.nonInputBox} ${charInWord === ' ' ? styles.spaceBox : styles.punctuationBox}`}
                                                >
                                                    {charInWord}
                                                </div>
                                            );
                                        }
                                    })}
                                </div>

                                <div className={styles.actionButtons}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleHint}
                                    >
                                        💡 提示
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                    >
                                        检查 ✓
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className={styles.cardBack}>
                            <div className={`${styles.resultIcon} ${isCorrect ? styles.correct : styles.wrong}`}>
                                {isCorrect ? '✓' : '✗'}
                            </div>

                            <div className={styles.wordSpelling}>{currentWord?.spelling}</div>
                            <div className={styles.wordMeaning}>{currentWord?.meaning}</div>

                            {currentWord?.phonics_data && (
                                <div className={`${styles.hintInfo} ${styles.phonics}`}>
                                    <span className={styles.infoIcon}>📖</span>
                                    <span>自然拼读: {currentWord.phonics_data}</span>
                                </div>
                            )}

                            {currentWord?.sentence && (
                                <div className={`${styles.hintInfo} ${styles.sentence}`}>
                                    <span className={styles.infoIcon}>📝</span>
                                    <span>{currentWord.sentence}</span>
                                </div>
                            )}

                            {currentWord?.root_info && (
                                <div className={`${styles.hintInfo} ${styles.etymology}`}>
                                    <span className={styles.infoIcon}>🌱</span>
                                    <span>词根: {currentWord.root_info}</span>
                                </div>
                            )}

                            {!isCorrect && (
                                <div className={styles.userAnswer}>
                                    你的答案: <span className={styles.wrongText}>{currentWord?.spelling[0]}{letterInputs.join('')}</span>
                                </div>
                            )}

                            <button
                                className="btn btn-success btn-large"
                                onClick={handleNext}
                            >
                                {currentIndex + 1 >= words.length ? '完成 🎉' : '下一个 →'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
