import React, { useState, useEffect, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import { BookOutlined, UserOutlined, FileTextOutlined, CheckCircleOutlined, CloudOutlined } from '@ant-design/icons';
import { getDashboardStats } from '../services/api';

export default function Dashboard() {
    const user = JSON.parse(localStorage.getItem('citour_user') || '{}');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const loadStats = async () => {
            try {
                const res = await getDashboardStats();
                // API 返回 { success: true, data: {...} }
                setStats(res.data || res);
            } catch (err) {
                console.error('Failed to load dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const cardStyle = {
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    };

    return (
        <PageContainer
            title={`欢迎, ${user.name || '管理员'}`}
            subTitle="租户管理后台"
        >
            <Spin spinning={loading}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8} lg={5}>
                        <Card style={cardStyle}>
                            <Statistic
                                title="单词本总数"
                                value={stats?.wordbookCount || 0}
                                prefix={<BookOutlined style={{ color: '#1890ff' }} />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={5}>
                        <Card style={cardStyle}>
                            <Statistic
                                title="在线单词本"
                                value={stats?.onlineWordbookCount || 0}
                                prefix={<CloudOutlined style={{ color: '#52c41a' }} />}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={5}>
                        <Card style={cardStyle}>
                            <Statistic
                                title="单词数量"
                                value={stats?.wordCount || 0}
                                prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
                                valueStyle={{ color: '#722ed1' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={5}>
                        <Card style={cardStyle}>
                            <Statistic
                                title="学生数量"
                                value={stats?.studentCount || 0}
                                prefix={<UserOutlined style={{ color: '#fa8c16' }} />}
                                valueStyle={{ color: '#fa8c16' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={4}>
                        <Card style={cardStyle}>
                            <Statistic
                                title="打卡次数"
                                value={stats?.practiceCount || 0}
                                prefix={<CheckCircleOutlined style={{ color: '#eb2f96' }} />}
                                valueStyle={{ color: '#eb2f96' }}
                                suffix="次"
                            />
                        </Card>
                    </Col>
                </Row>
            </Spin>

            <Card
                title="🚀 快速开始"
                style={{ marginTop: 24, ...cardStyle }}
            >
                <div style={{ padding: '20px 0' }}>
                    <h3>👋 欢迎使用词途管理后台</h3>
                    <p style={{ marginTop: 16, lineHeight: '1.8' }}>
                        您可以通过左侧菜单进行以下操作:
                    </p>
                    <ul style={{ lineHeight: '2', marginTop: 16 }}>
                        <li><strong>词书管理</strong>: 创建和管理单词本,添加单词内容</li>
                        <li><strong>学生管理</strong>: 创建学生账号,管理学生信息</li>
                        <li><strong>打卡记录</strong>: 查看学生的练习打卡记录</li>
                    </ul>
                    <p style={{ marginTop: 16, color: '#999' }}>
                        提示: 建议先创建词书并添加单词,然后创建学生账号供学生使用。
                    </p>
                </div>
            </Card>
        </PageContainer>
    );
}
