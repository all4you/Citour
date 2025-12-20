import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { Button, message, App } from 'antd';
import { PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getWords, createWord, updateWord, deleteWord } from '../services/api';

export default function WordList() {
    const { id: wordbookId } = useParams();
    const location = useLocation();
    const actionRef = useRef();
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [wordbookName] = useState(
        location.state?.wordbookName || `词书 #${wordbookId}`
    );
    const navigate = useNavigate();
    const { modal } = App.useApp();

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 60,
            search: false,
        },
        {
            title: '拼写',
            dataIndex: 'spelling',
            key: 'spelling',
            width: 120,
            ellipsis: true,
        },
        {
            title: '释义',
            dataIndex: 'meaning',
            key: 'meaning',
            width: 130,
            search: false,
            ellipsis: true,
            render: (text) => {
                if (!text) return '-';
                return text.length > 100 ? text.substring(0, 100) + '...' : text;
            }
        },
        {
            title: '例句',
            dataIndex: 'sentence',
            key: 'sentence',
            search: false,
            ellipsis: true,
            render: (text) => {
                if (!text) return '-';
                return text.length > 100 ? text.substring(0, 100) + '...' : text;
            }
        },
        {
            title: '自然拼读',
            dataIndex: 'phonics_data',
            key: 'phonics_data',
            width: 220,
            search: false,
            ellipsis: true,
        },
        {
            title: '词根信息',
            dataIndex: 'root_info',
            key: 'root_info',
            search: false,
            ellipsis: true,
            render: (text) => {
                if (!text) return '-';
                return text.length > 100 ? text.substring(0, 100) + '...' : text;
            }
        },
        {
            title: '操作',
            valueType: 'option',
            width: 120,
            fixed: 'right',
            render: (text, record) => [
                <a key="edit" onClick={() => handleEdit(record)}>编辑</a>,
                <a key="delete" onClick={() => handleDelete(record)} style={{ color: 'red' }}>删除</a>,
            ],
        },
    ];

    const handleEdit = (record) => {
        setCurrentRecord(record);
        setEditModalVisible(true);
    };

    const handleDelete = (record) => {
        modal.confirm({
            title: '确认删除',
            content: `确定要删除单词"${record.spelling}"吗?`,
            onOk: async () => {
                try {
                    await deleteWord(record.id);
                    message.success('单词删除成功');
                    actionRef.current?.reload();
                } catch (error) {
                    modal.error({
                        title: '删除失败',
                        content: error.response?.data?.error || error.message,
                    });
                }
            },
        });
    };

    const handleCreate = async (values) => {
        try {
            await createWord(wordbookId, values);
            message.success('单词创建成功');
            setCreateModalVisible(false);
            actionRef.current?.reload();
            return true;
        } catch (error) {
            modal.error({
                title: '创建失败',
                content: error.response?.data?.error || error.message,
            });
            return false;
        }
    };

    const handleUpdate = async (values) => {
        try {
            await updateWord(currentRecord.id, values);
            message.success('单词更新成功');
            setEditModalVisible(false);
            setCurrentRecord(null);
            actionRef.current?.reload();
            return true;
        } catch (error) {
            modal.error({
                title: '更新失败',
                content: error.response?.data?.error || error.message,
            });
            return false;
        }
    };

    return (
        <PageContainer
            title={`单词管理 - ${wordbookName}`}
            extra={[
                <Button
                    key="back"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/tenant/wordbooks')}
                >
                    返回词书列表
                </Button>
            ]}
        >
            <ProTable
                columns={columns}
                actionRef={actionRef}
                cardBordered
                request={async (params = {}) => {
                    const { spelling, current, pageSize } = params;
                    const data = await getWords(wordbookId, {
                        page: current || 1,
                        pageSize: pageSize || 20,
                        spelling
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
                toolBarRender={() => [
                    <Button
                        key="button"
                        icon={<PlusOutlined />}
                        type="primary"
                        onClick={() => setCreateModalVisible(true)}
                    >
                        新增单词
                    </Button>,
                ]}
            />
            <ModalForm
                title="新增单词"
                open={createModalVisible}
                onOpenChange={setCreateModalVisible}
                onFinish={handleCreate}
                modalProps={{
                    destroyOnHidden: true,
                }}
            >
                <ProFormText
                    name="spelling"
                    label="拼写"
                    placeholder="请输入单词拼写"
                    rules={[{ required: true, message: '请输入单词拼写' }]}
                />
                <ProFormTextArea
                    name="meaning"
                    label="释义"
                    placeholder="请输入单词释义"
                    rules={[{ required: true, message: '请输入单词释义' }]}
                />
                <ProFormTextArea
                    name="sentence"
                    label="例句"
                    placeholder="请输入例句(可选)"
                />
                <ProFormTextArea
                    name="phonics_data"
                    label="自然拼读信息"
                    placeholder="请输入自然拼读信息(可选)"
                />
                <ProFormTextArea
                    name="root_info"
                    label="词根信息"
                    placeholder="请输入词根信息(可选)"
                />
            </ModalForm>
            <ModalForm
                title="编辑单词"
                open={editModalVisible}
                onOpenChange={setEditModalVisible}
                onFinish={handleUpdate}
                initialValues={currentRecord}
                modalProps={{
                    destroyOnHidden: true,
                }}
            >
                <ProFormText
                    name="spelling"
                    label="拼写"
                    placeholder="请输入单词拼写"
                    rules={[{ required: true, message: '请输入单词拼写' }]}
                />
                <ProFormTextArea
                    name="meaning"
                    label="释义"
                    placeholder="请输入单词释义"
                    rules={[{ required: true, message: '请输入单词释义' }]}
                />
                <ProFormTextArea
                    name="sentence"
                    label="例句"
                    placeholder="请输入例句(可选)"
                />
                <ProFormTextArea
                    name="phonics_data"
                    label="自然拼读信息"
                    placeholder="请输入自然拼读信息(可选)"
                />
                <ProFormTextArea
                    name="root_info"
                    label="词根信息"
                    placeholder="请输入词根信息(可选)"
                />
            </ModalForm>
        </PageContainer>
    );
}
