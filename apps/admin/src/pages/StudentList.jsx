import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText } from '@ant-design/pro-components';
import { Button, message, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../services/api';

export default function StudentList() {
    const actionRef = useRef();
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
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
            title: '姓名',
            dataIndex: 'name',
            key: 'name',
            width: 120,
            ellipsis: true,
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
            title: '账号',
            dataIndex: 'account',
            key: 'account',
            width: 120,
            ellipsis: true,
        },
        {
            title: '班级',
            dataIndex: 'class_name',
            key: 'class_name',
            width: 120,
            search: false,
            render: (text) => text || '-',
        },
        {
            title: '操作',
            valueType: 'option',
            width: 120,
            fixed: 'right',
            render: (text, record) => [
                <a key="edit" onClick={() => handleEdit(record)}>编辑</a>,
                <a key="delete" style={{ color: 'red' }} onClick={() => handleDelete(record)}>删除</a>,
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
            content: `确定要删除学生 "${record.name}" 吗？此操作将同时删除该学生的所有学习记录。`,
            okText: '删除',
            okType: 'danger',
            onOk: async () => {
                try {
                    await deleteStudent(record.id);
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
            await createStudent(values);
            message.success('学生创建成功');
            setCreateModalVisible(false);
            actionRef.current?.reload();
            return true;
        } catch (error) {
            message.error(error.response?.data?.error || '创建失败');
            return false;
        }
    };

    const handleUpdate = async (values) => {
        try {
            await updateStudent(currentRecord.id, values);
            message.success('学生信息更新成功');
            setEditModalVisible(false);
            setCurrentRecord(null);
            actionRef.current?.reload();
            return true;
        } catch (error) {
            message.error(error.response?.data?.error || '更新失败');
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
                    const { name, current, pageSize } = params;
                    const data = await getStudents({
                        page: current || 1,
                        pageSize: pageSize || 20,
                        name
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
                        新增学生
                    </Button>,
                ]}
            />
            <ModalForm
                title="新增学生"
                open={createModalVisible}
                onOpenChange={setCreateModalVisible}
                onFinish={handleCreate}
                modalProps={{
                    destroyOnHidden: true,
                }}
            >
                <ProFormText
                    name="name"
                    label="姓名"
                    rules={[{ required: true, message: '请输入姓名' }]}
                />
                <ProFormText
                    name="account"
                    label="账号"
                    rules={[{ required: true, message: '请输入账号' }]}
                />
                <ProFormText.Password
                    name="password"
                    label="密码"
                    rules={[{ required: true, message: '请输入密码' }]}
                />
                <ProFormText
                    name="class_name"
                    label="班级"
                    placeholder="可选"
                />
            </ModalForm>
            <ModalForm
                title="编辑学生"
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
                    label="姓名"
                    rules={[{ required: true, message: '请输入姓名' }]}
                />
                <ProFormText
                    name="account"
                    label="账号"
                    rules={[{ required: true, message: '请输入账号' }]}
                />
                <ProFormText.Password
                    name="password"
                    label="密码"
                    placeholder="留空则不修改密码"
                />
                <ProFormText
                    name="class_name"
                    label="班级"
                    placeholder="可选"
                />
            </ModalForm>
        </PageContainer>
    );
}
