import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProFormUploadDragger } from '@ant-design/pro-components';
import { Button, message, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getWordbooks, createWordbook, updateWordbook, deleteWordbook } from '../services/api';
import { useNavigate } from 'react-router-dom';
import WordImportModal from '../components/WordImportModal';

export default function WordbookList() {
    const actionRef = useRef();
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [importWordbookId, setImportWordbookId] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
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
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            width: 120,
            ellipsis: true,
        },
        {
            title: '单词数',
            dataIndex: 'word_count',
            key: 'word_count',
            width: 80,
            search: false,
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            search: false,
            ellipsis: true,
            render: (text) => {
                if (!text) return '-';
                return text.length > 100 ? text.substring(0, 100) + '...' : text;
            }
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 80,
            valueEnum: {
                online: { text: '在线', status: 'Success' },
                offline: { text: '离线', status: 'Default' },
            },
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 160,
            valueType: 'dateTime',
            search: false,
        },
        {
            title: '操作',
            valueType: 'option',
            width: 220,
            fixed: 'right',
            render: (text, record) => [
                <a key="edit" onClick={() => handleEdit(record)}>编辑</a>,
                <a key="import" onClick={() => handleImport(record)}>导入单词</a>,
                <a key="words" onClick={() => handleManageWords(record)}>管理单词</a>,
                <a key="delete" style={{ color: 'red' }} onClick={() => handleDelete(record)}>删除</a>,
            ],
        },
    ];

    const handleEdit = (record) => {
        setCurrentRecord(record);
        setEditModalVisible(true);
    };

    const handleImport = (record) => {
        setImportWordbookId(record.id);
        setImportModalVisible(true);
    };

    const handleManageWords = (record) => {
        navigate(`/tenant/wordbooks/${record.id}/words`, {
            state: {
                wordbookId: record.id,
                wordbookName: record.name
            }
        });
    };

    const handleDelete = (record) => {
        modal.confirm({
            title: '确认删除',
            content: `确定要删除词书 "${record.name}" 吗？此操作将同时删除该词书下的所有单词。`,
            okText: '删除',
            okType: 'danger',
            onOk: async () => {
                try {
                    await deleteWordbook(record.id);
                    message.success('删除成功');
                    actionRef.current?.reload();
                } catch (error) {
                    message.error('删除失败: ' + error.message);
                }
            }
        });
    };

    const handleCreate = async (values) => {
        try {
            const { wordsFile, ...wordbookData } = values;
            const result = await createWordbook(wordbookData);
            const wordbookId = result.id;

            if (uploadFile) {
                message.success('词书创建成功,正在导入单词...');
                setCreateModalVisible(false);
                setImportWordbookId(wordbookId);
                setImportModalVisible(true);
            } else {
                message.success('词书创建成功');
                setCreateModalVisible(false);
                actionRef.current?.reload();
            }
            return true;
        } catch (error) {
            message.error('创建失败: ' + error.message);
            return false;
        }
    };

    const handleUpdate = async (values) => {
        try {
            await updateWordbook(currentRecord.id, values);
            message.success('词书更新成功');
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
        <PageContainer>
            <ProTable
                columns={columns}
                actionRef={actionRef}
                cardBordered
                request={async (params = {}) => {
                    const { status, current, pageSize } = params;
                    const data = await getWordbooks({
                        page: current || 1,
                        pageSize: pageSize || 20,
                        status
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
                        新增词书
                    </Button>,
                ]}
            />
            <ModalForm
                title="新增词书"
                open={createModalVisible}
                onOpenChange={setCreateModalVisible}
                onFinish={handleCreate}
                modalProps={{
                    destroyOnHidden: true,
                }}
            >
                <ProFormText
                    name="name"
                    label="名称"
                    placeholder="请输入词书名称"
                    rules={[{ required: true, message: '请输入词书名称' }]}
                />
                <ProFormTextArea
                    name="description"
                    label="描述"
                    placeholder="请输入词书描述"
                />
                <ProFormSelect
                    name="status"
                    label="状态"
                    options={[
                        { label: '在线', value: 'online' },
                        { label: '离线', value: 'offline' },
                    ]}
                    initialValue="online"
                    rules={[{ required: true, message: '请选择状态' }]}
                />
                <ProFormUploadDragger
                    name="wordsFile"
                    label="单词明细文件 (可选)"
                    description="支持 .xlsx, .xls, .csv 格式,包含以下这些列：spelling, meaning, sentence, phonics_data, root_info"
                    max={1}
                    accept=".xlsx,.xls,.csv"
                    fieldProps={{
                        beforeUpload: (file) => {
                            setUploadFile(file);
                            return false;
                        },
                        onRemove: () => {
                            setUploadFile(null);
                        }
                    }}
                />
            </ModalForm>
            <ModalForm
                title="编辑词书"
                open={editModalVisible}
                onOpenChange={setEditModalVisible}
                onFinish={handleUpdate}
                initialValues={currentRecord}
                modalProps={{
                    destroyOnHidden: true,
                }}
            >
                <ProFormText
                    name="name"
                    label="名称"
                    placeholder="请输入词书名称"
                    rules={[{ required: true, message: '请输入词书名称' }]}
                />
                <ProFormTextArea
                    name="description"
                    label="描述"
                    placeholder="请输入词书描述"
                />
                <ProFormSelect
                    name="status"
                    label="状态"
                    options={[
                        { label: '在线', value: 'online' },
                        { label: '离线', value: 'offline' },
                    ]}
                    rules={[{ required: true, message: '请选择状态' }]}
                />
            </ModalForm>

            <WordImportModal
                open={importModalVisible}
                wordbookId={importWordbookId}
                preUploadedFile={uploadFile}
                onSuccess={() => {
                    setImportModalVisible(false);
                    setUploadFile(null);
                    message.success('单词导入成功');
                    actionRef.current?.reload();
                }}
                onCancel={() => {
                    setImportModalVisible(false);
                    setUploadFile(null);
                }}
            />
        </PageContainer>
    );
}
