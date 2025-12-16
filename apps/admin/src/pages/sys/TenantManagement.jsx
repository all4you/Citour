import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText } from '@ant-design/pro-components';
import { Button, message, App, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getTenants, createTenant } from '../../services/api';

export default function TenantManagement() {
    const actionRef = useRef();
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const { modal } = App.useApp();

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 60,
            search: false,
        },
        {
            title: '租户名称',
            dataIndex: 'name',
            key: 'name',
            ellipsis: true,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            search: false,
            render: (status) => (
                <Tag color={status === 'active' ? 'green' : 'red'}>
                    {status === 'active' ? '启用' : '禁用'}
                </Tag>
            ),
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            valueType: 'dateTime',
            search: false,
        },
    ];

    const handleCreate = async (values) => {
        const progressModal = modal.info({
            title: '正在创建租户',
            content: (
                <div>
                    <p>⏳ 正在创建租户...</p>
                </div>
            ),
            okButtonProps: { style: { display: 'none' } },
            closable: false,
        });

        try {
            await createTenant({
                name: values.name,
                adminName: values.adminName,
                adminAccount: values.adminAccount,
                adminPassword: values.adminPassword
            });

            progressModal.destroy();
            message.success('租户创建成功');
            setCreateModalVisible(false);
            actionRef.current?.reload();

            // 显示租户登录信息
            modal.success({
                title: '租户创建成功',
                content: (
                    <div>
                        <p>租户名称: {values.name}</p>
                        <p>管理员账号: {values.adminAccount}</p>
                        <p>管理员密码: {values.adminPassword}</p>
                        <p>登录地址: <a href="/tenant/login" target="_blank">/tenant/login</a></p>
                        <p style={{ color: 'red', marginTop: 10 }}>请将以上信息告知租户管理员</p>
                    </div>
                ),
                width: 500
            });

            return true;
        } catch (error) {
            progressModal.destroy();
            modal.error({
                title: '创建失败',
                content: error.response?.data?.error || error.message,
            });
            return false;
        }
    };

    return (
        <PageContainer title="租户管理">
            <ProTable
                columns={columns}
                actionRef={actionRef}
                cardBordered
                request={async (params = {}) => {
                    const { name } = params;
                    const res = await getTenants({
                        page: currentPage,
                        pageSize,
                        name
                    });

                    return {
                        data: res.data || [],
                        success: true,
                        total: res.total || 0
                    };
                }}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                    span: 6,
                    collapsed: false,
                    collapseRender: false,
                }}
                pagination={{
                    current: currentPage,
                    pageSize,
                    onChange: (page) => setCurrentPage(page),
                }}
                toolBarRender={() => [
                    <Button
                        key="button"
                        icon={<PlusOutlined />}
                        type="primary"
                        onClick={() => setCreateModalVisible(true)}
                    >
                        新增租户
                    </Button>,
                ]}
            />
            <ModalForm
                title="新增租户"
                open={createModalVisible}
                onOpenChange={setCreateModalVisible}
                onFinish={handleCreate}
                modalProps={{
                    destroyOnHidden: true,
                }}
                width={500}
            >
                <ProFormText
                    name="name"
                    label="租户名称"
                    placeholder="请输入租户名称"
                    rules={[{ required: true, message: '请输入租户名称' }]}
                />
                <ProFormText
                    name="adminName"
                    label="管理员姓名"
                    placeholder="请输入管理员姓名(可选)"
                />
                <ProFormText
                    name="adminAccount"
                    label="管理员账号"
                    placeholder="请输入管理员账号"
                    rules={[{ required: true, message: '请输入管理员账号' }]}
                />
                <ProFormText.Password
                    name="adminPassword"
                    label="管理员密码"
                    placeholder="请输入管理员密码"
                    rules={[{ required: true, message: '请输入管理员密码' }]}
                />
            </ModalForm>
        </PageContainer>
    );
}
