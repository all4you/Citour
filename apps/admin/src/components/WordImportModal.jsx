import React, { useState, useEffect } from 'react';
import { Modal, Upload, Button, Progress, Alert, App } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { importWords } from '../services/api';

const { Dragger } = Upload;

export default function WordImportModal({ open, wordbookId, preUploadedFile, onSuccess, onCancel }) {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const { modal } = App.useApp();

    // 当传入预上传的文件时,自动设置并开始导入
    useEffect(() => {
        if (open && preUploadedFile) {
            setFile(preUploadedFile);
            // 自动开始导入
            setTimeout(() => {
                handleImportWithFile(preUploadedFile);
            }, 500);
        }
    }, [open, preUploadedFile]);

    const handleFileChange = (info) => {
        if (info.fileList.length > 0) {
            setFile(info.fileList[0].originFileObj);
        } else {
            setFile(null);
        }
    };

    // 解析文件内容
    const parseFile = async (fileToImport) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet);

                    // 转换为标准格式
                    const words = json.map(row => ({
                        spelling: row.spelling || row['单词'] || row['Spelling'] || '',
                        meaning: row.meaning || row['释义'] || row['Meaning'] || row['中文'] || '',
                        sentence: row.sentence || row['例句'] || row['Sentence'] || '',
                        phonics_data: row.phonics_data || row['自然拼读'] || row['Phonics'] || '',
                        root_info: row.root_info || row['词根'] || row['Root'] || ''
                    }));

                    resolve(words);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(fileToImport);
        });
    };

    const handleImportWithFile = async (fileToImport) => {
        setImporting(true);
        setProgress(0);

        try {
            // Step 1: 解析文件
            setProgress(20);
            const words = await parseFile(fileToImport);

            if (words.length === 0) {
                throw new Error('文件中没有找到有效的单词数据');
            }

            setProgress(50);

            // Step 2: 调用导入 API
            const result = await importWords(wordbookId, words);

            setProgress(100);

            // 显示导入结果
            const { imported, failed } = result;

            if (failed === 0) {
                modal.success({
                    title: '导入成功',
                    content: `成功导入 ${imported} 个单词`
                });
            } else {
                modal.warning({
                    title: '导入完成',
                    content: (
                        <div>
                            <p>成功: {imported} 个</p>
                            <p>失败: {failed} 个</p>
                        </div>
                    ),
                    width: 500
                });
            }

            setTimeout(() => {
                setFile(null);
                setProgress(0);
                setImporting(false);
                onSuccess && onSuccess();
            }, 1000);

        } catch (error) {
            setProgress(0);
            setImporting(false);
            modal.error({
                title: '导入失败',
                content: error.response?.data?.error || error.message
            });
        }
    };

    const handleImport = async () => {
        if (!file) {
            modal.error({ title: '错误', content: '请先选择文件' });
            return;
        }
        await handleImportWithFile(file);
    };

    const handleCancel = () => {
        if (!importing) {
            setFile(null);
            setProgress(0);
            onCancel && onCancel();
        }
    };

    const downloadTemplate = () => {
        // 创建示例数据
        const template = `spelling,meaning,sentence,phonics_data,root_info
hello,你好,Hello! How are you?,/həˈloʊ/,来自古英语 hāl
world,世界,Welcome to the world.,/wɜːrld/,来自古英语 weorold
apple,苹果,I like eating apples.,/ˈæpl/,来自古英语 æppel`;

        const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'word_template.csv';
        link.click();
    };

    return (
        <Modal
            title="导入单词"
            open={open}
            onCancel={handleCancel}
            footer={[
                <Button key="cancel" onClick={handleCancel} disabled={importing}>
                    取消
                </Button>,
                <Button key="import" type="primary" onClick={handleImport} loading={importing}>
                    开始导入
                </Button>
            ]}
            width={600}
            maskClosable={!importing}
        >
            <Alert
                message="文件格式说明"
                description={
                    <div>
                        <p>支持的文件格式: .xlsx, .xls, .csv</p>
                        <p>必填列: spelling (单词拼写), meaning (中文释义)</p>
                        <p>可选列: sentence (例句), phonics_data (自然拼读), root_info (词根信息)</p>
                        <Button
                            type="link"
                            icon={<DownloadOutlined />}
                            onClick={downloadTemplate}
                            style={{ padding: 0, marginTop: 8 }}
                        >
                            下载模板文件
                        </Button>
                    </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Dragger
                accept=".xlsx,.xls,.csv"
                maxCount={1}
                beforeUpload={() => false}
                onChange={handleFileChange}
                disabled={importing}
            >
                <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                    支持单个文件上传,文件大小不超过 5MB
                </p>
            </Dragger>

            {importing && (
                <div style={{ marginTop: 16 }}>
                    <Progress percent={progress} status={progress === 100 ? 'success' : 'active'} />
                    <p style={{ textAlign: 'center', marginTop: 8, color: '#666' }}>
                        正在导入单词,请稍候...
                    </p>
                </div>
            )}
        </Modal>
    );
}
