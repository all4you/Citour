import React, { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getPracticeDetails, getWords } from '../services/api';
import TokenPagination from '../components/TokenPagination';

export default function PracticeDetailList() {
    const { id: recordId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const actionRef = useRef();
    const hasFetched = useRef(false);

    // 从路由 state 获取记录信息
    const recordInfo = location.state?.recordInfo;

    // 分页状态
    const [currentPageToken, setCurrentPageToken] = useState('');
    const [nextPageToken, setNextPageToken] = useState('');
    const [tokenMap, setTokenMap] = useState({ 1: '' });
    const [hasMore, setHasMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // 单词映射
    const [wordMap, setWordMap] = useState({});

    // 加载单词信息
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const loadWords = async () => {
            if (recordInfo?.book_id) {
                try {
                    const wordsData = await getWords(recordInfo.book_id, { pageSize: 500 });
                    const map = {};
                    (wordsData.data || []).forEach(w => {
                        map[w.id] = w;
                    });
                    setWordMap(map);
                } catch (err) {
                    console.error('Failed to load words:', err);
                }
            }
        };
        loadWords();
    }, [recordInfo?.book_id]);

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 60,
        },
        {
            title: '单词',
            dataIndex: 'word_id',
            key: 'word_id',
            width: 120,
            render: (wordId) => wordMap[wordId]?.spelling || wordId,
        },
        {
            title: '释义',
            dataIndex: 'word_id',
            key: 'meaning',
            width: 150,
            ellipsis: true,
            render: (wordId) => wordMap[wordId]?.meaning || '-',
        },
        {
            title: '拼写次数',
            dataIndex: 'spell_count',
            key: 'spell_count',
            width: 90,
        },
        {
            title: '正确次数',
            dataIndex: 'correct_count',
            key: 'correct_count',
            width: 90,
        },
        {
            title: '错误次数',
            dataIndex: 'wrong_count',
            key: 'wrong_count',
            width: 90,
        },
        {
            title: '提示次数',
            dataIndex: 'hint_count',
            key: 'hint_count',
            width: 90,
        },
        {
            title: '正确率',
            dataIndex: 'accuracy',
            key: 'accuracy',
            width: 90,
            render: (val) => `${val}%`,
        },
    ];

    const handleNextPage = () => {
        if (hasMore && nextPageToken) {
            const newPage = currentPage + 1;
            setTokenMap({ ...tokenMap, [newPage]: nextPageToken });
            setCurrentPageToken(nextPageToken);
            setCurrentPage(newPage);
            actionRef.current?.reload();
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            const prevPage = currentPage - 1;
            const prevToken = tokenMap[prevPage] || '';
            setCurrentPageToken(prevToken);
            setCurrentPage(prevPage);
            actionRef.current?.reload();
        }
    };

    return (
        <PageContainer
            title={`打卡明细 - 记录 #${recordId}`}
            extra={[
                <Button
                    key="back"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/tenant/practice-records')}
                >
                    返回打卡记录
                </Button>
            ]}
        >
            <ProTable
                columns={columns}
                actionRef={actionRef}
                cardBordered
                request={async () => {
                    const data = await getPracticeDetails(recordId, {
                        pageSize: 20,
                        pageToken: currentPageToken
                    });

                    setNextPageToken(data.pageToken || '');
                    setHasMore(data.hasMore || false);

                    return {
                        data: data.data || [],
                        success: true
                    };
                }}
                rowKey="id"
                search={false}
                pagination={false}
            />
            <TokenPagination
                canGoPrev={currentPage > 1}
                canGoNext={hasMore}
                onPrev={handlePrevPage}
                onNext={handleNextPage}
                currentPage={currentPage}
                pageSize={20}
            />
        </PageContainer>
    );
}
