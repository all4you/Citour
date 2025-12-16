import React, { useState, useEffect, useRef } from 'react';
import { Card, Steps, Button, Result, Spin, App } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Step } = Steps;

export default function SystemSetup() {
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(false);
    const [checkStatus, setCheckStatus] = useState(null);
    const navigate = useNavigate();
    const { modal } = App.useApp();
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        handleCheck();
    }, []);

    const handleCheck = async () => {
        setLoading(true);
        try {
            await axios.get('/api/system/check');
            setCheckStatus('success');
        } catch (error) {
            console.error('Connectivity check failed:', error);
            setCheckStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTables = async () => {
        setLoading(true);
        try {
            await axios.post('/api/system/init', { createTables: true });
            modal.success({
                title: '系统初始化成功',
                content: (
                    <div>
                        <p>系统表创建成功!</p>
                        <p>系统管理员账号已自动创建</p>
                        <p style={{ marginTop: 10 }}>
                            <strong>请使用环境变量中配置的账号密码登录系统管理后台</strong>
                        </p>
                    </div>
                ),
                onOk: () => {
                    navigate('/sys/login');
                }
            });
        } catch (error) {
            console.error('Create tables error:', error);
            modal.error({
                title: '创建系统表失败',
                content: error.response?.data?.error || error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const renderStep0 = () => {
        if (loading) {
            return (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Spin tip="正在检查系统连通性..." size="large" />
                </div>
            );
        }

        if (checkStatus === 'error') {
            return (
                <Result
                    status="error"
                    title="系统连接失败"
                    subTitle="无法连接到飞书服务,请检查环境变量配置"
                    extra={[
                        <Button key="retry" onClick={handleCheck}>
                            重试
                        </Button>
                    ]}
                />
            );
        }

        if (checkStatus === 'success') {
            return (
                <Result
                    status="success"
                    title="系统已连接"
                    subTitle="可以开始初始化系统表"
                    extra={[
                        <Button type="primary" onClick={() => setCurrent(1)}>
                            下一步
                        </Button>
                    ]}
                />
            );
        }

        return null;
    };

    const renderStep1 = () => {
        return (
            <Result
                icon={<DatabaseOutlined style={{ fontSize: 72, color: '#1890ff' }} />}
                title="创建系统表"
                subTitle="点击下方按钮创建系统数据表 (tenant, user) 并自动创建系统管理员账号"
                extra={[
                    <Button key="back" onClick={() => setCurrent(0)}>
                        上一步
                    </Button>,
                    <Button key="create" type="primary" loading={loading} onClick={handleCreateTables}>
                        创建系统表
                    </Button>
                ]}
            />
        );
    };

    const steps = [
        {
            title: '连通性检查',
            content: renderStep0(),
        },
        {
            title: '创建系统表',
            content: renderStep1(),
        }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <Card
                title={
                    <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                        词途系统初始化
                    </div>
                }
                style={{ width: '100%', maxWidth: '800px' }}
            >
                <Steps current={current} style={{ marginBottom: 40 }}>
                    {steps.map(item => (
                        <Step key={item.title} title={item.title} />
                    ))}
                </Steps>
                <div style={{ padding: '20px 0' }}>
                    {steps[current].content}
                </div>
            </Card>
        </div>
    );
}
