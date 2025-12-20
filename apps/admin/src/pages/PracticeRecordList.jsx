import React, { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import { getPracticeRecords, getWordbooks, getStudents } from '../services/api';

export default function PracticeRecordList() {
    const actionRef = useRef();
    const navigate = useNavigate();
    const hasFetched = useRef(false);

    // 筛选选项
    const [students, setStudents] = useState([]);
    const [wordbooks, setWordbooks] = useState([]);

    // 加载筛选选项
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const loadOptions = async () => {
            try {
                const [studentsData, wordbooksData] = await Promise.all([
                    getStudents({ pageSize: 500 }),
                    getWordbooks({ pageSize: 500 })
                ]);
                setStudents(studentsData.data || []);
                setWordbooks(wordbooksData.data || []);
            } catch (err) {
                console.error('Failed to load filter options:', err);
            }
        };
        loadOptions();
    }, []);

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 60,
            search: false,
        },
        {
            title: '学生',
            dataIndex: 'user_id',
            key: 'user_id',
            width: 100,
            valueType: 'select',
            fieldProps: {
                options: students.map(s => ({ label: s.name, value: s.id })),
                showSearch: true,
            },
            render: (_, record) => {
                const student = students.find(s => s.id === record.user_id);
                return student?.name || record.user_id;
            },
        },
        {
            title: '单词本',
            dataIndex: 'book_id',
            key: 'book_id',
            width: 120,
            valueType: 'select',
            fieldProps: {
                options: wordbooks.map(w => ({ label: w.name, value: w.id })),
                showSearch: true,
            },
            render: (_, record) => {
                const wordbook = wordbooks.find(w => w.id === record.book_id);
                return wordbook?.name || record.book_name || record.book_id;
            },
        },
        {
            title: '类型',
            dataIndex: 'session_type',
            key: 'session_type',
            width: 80,
            search: false,
            valueEnum: {
                new: { text: '新词', status: 'Processing' },
                review: { text: '复习', status: 'Success' },
                mixed: { text: '混合', status: 'Default' },
            },
        },
        {
            title: '开始时间',
            dataIndex: 'started_at',
            key: 'started_at',
            width: 160,
            valueType: 'dateTime',
            search: false,
        },
        {
            title: '时长(秒)',
            dataIndex: 'duration_seconds',
            key: 'duration_seconds',
            width: 80,
            search: false,
            render: (val) => val || '-',
        },
        {
            title: '单词数',
            dataIndex: 'total_words',
            key: 'total_words',
            width: 80,
            search: false,
        },
        {
            title: '正确',
            dataIndex: 'correct_count',
            key: 'correct_count',
            width: 70,
            search: false,
        },
        {
            title: '错误',
            dataIndex: 'wrong_count',
            key: 'wrong_count',
            width: 70,
            search: false,
        },
        {
            title: '提示',
            dataIndex: 'hint_count',
            key: 'hint_count',
            width: 70,
            search: false,
        },
        {
            title: '正确率',
            key: 'accuracy',
            width: 80,
            search: false,
            render: (_, record) => {
                const total = (record.correct_count || 0) + (record.wrong_count || 0);
                if (total === 0) return '-';
                const accuracy = Math.round((record.correct_count / total) * 100);
                return `${accuracy}%`;
            },
        },
    ];

    return (
        <PageContainer>
            <ProTable
                columns={columns}
                actionRef={actionRef}
                cardBordered
                request={async (params = {}) => {
                    const { user_id, book_id, current, pageSize } = params;
                    const data = await getPracticeRecords({
                        page: current || 1,
                        pageSize: pageSize || 20,
                        user_id,
                        book_id
                    });

                    return {
                        data: data.data || [],
                        success: true,
                        total: data.total || 0
                    };
                }}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                    span: 6,
                    collapsed: false,
                    collapseRender: false,
                    optionRender: (searchConfig, formProps, dom) => [
                        ...dom.reverse(),
                    ],
                }}
                pagination={{
                    defaultPageSize: 20,
                    showSizeChanger: true,
                }}
            />
        </PageContainer>
    );
}
