import React from 'react';
import { Button, Space } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

/**
 * 基于 page_token 的分页组件
 * 只支持上一页/下一页导航
 */
export default function TokenPagination({
    canGoPrev,
    canGoNext,
    onPrev,
    onNext,
    currentPage = 1,
    pageSize = 20,
    style
}) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px 0',
            ...style
        }}>
            <Space size="middle">
                <Button
                    icon={<LeftOutlined />}
                    disabled={!canGoPrev}
                    onClick={onPrev}
                >
                    上一页
                </Button>
                <span style={{ color: '#666' }}>
                    第 {currentPage} 页 (每页 {pageSize} 条)
                </span>
                <Button
                    icon={<RightOutlined />}
                    disabled={!canGoNext}
                    onClick={onNext}
                >
                    下一页
                </Button>
            </Space>
        </div>
    );
}
