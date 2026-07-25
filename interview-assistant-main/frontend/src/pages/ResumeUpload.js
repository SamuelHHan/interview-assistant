import React, { useState } from 'react';
import { 
  Upload, 
  Card, 
  Form, 
  Input, 
  Button, 
  Row, 
  Col, 
  message, 
  Spin,
  Descriptions,
  Tag,
  Divider
} from 'antd';
import { InboxOutlined, FileTextOutlined } from '@ant-design/icons';
import { resumeApi, jdApi } from '../services/api';

const { Dragger } = Upload;
const { TextArea } = Input;

function ResumeUpload() {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [parsedResume, setParsedResume] = useState(null);
  const [jdList, setJdList] = useState([]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      
      const response = await resumeApi.upload(formData);
      setParsedResume(response.data.data);
      message.success('简历上传并解析成功！');
      
      // Load JD list for selection
      const jdResponse = await jdApi.getList();
      setJdList(jdResponse.data.data || []);
    } catch (error) {
      message.error('上传失败：' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
    return false; // Prevent default upload behavior
  };

  const handleCreateJD = async (values) => {
    try {
      await jdApi.create(values);
      message.success('职位描述创建成功！');
      form.resetFields();
      
      // Refresh JD list
      const jdResponse = await jdApi.getList();
      setJdList(jdResponse.data.data || []);
    } catch (error) {
      message.error('创建失败：' + (error.response?.data?.message || error.message));
    }
  };

  const uploadProps = {
    name: 'resume',
    accept: '.pdf',
    showUploadList: false,
    beforeUpload: handleUpload,
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>简历上传与解析</h2>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="上传简历">
            <Dragger {...uploadProps} disabled={uploading}>
              {uploading ? (
                <div style={{ padding: 40 }}>
                  <Spin size="large" />
                  <p style={{ marginTop: 16, color: '#666' }}>正在解析简历...</p>
                </div>
              ) : (
                <>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: '#667eea' }} />
                  </p>
                  <p className="ant-upload-text">点击或拖拽PDF简历文件到此区域</p>
                  <p className="ant-upload-hint">支持PDF格式，文件大小不超过10MB</p>
                </>
              )}
            </Dragger>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="创建职位描述">
            <Form form={form} layout="vertical" onFinish={handleCreateJD}>
              <Form.Item name="title" label="职位名称" rules={[{ required: true }]}>
                <Input placeholder="如：高级前端工程师" />
              </Form.Item>
              <Form.Item name="company" label="公司名称">
                <Input placeholder="公司名称" />
              </Form.Item>
              <Form.Item name="department" label="部门">
                <Input placeholder="部门名称" />
              </Form.Item>
              <Form.Item name="description" label="职位描述" rules={[{ required: true }]}>
                <TextArea rows={4} placeholder="请输入职位描述..." />
              </Form.Item>
              <Form.Item name="requirements" label="任职要求">
                <TextArea rows={3} placeholder="请输入任职要求..." />
              </Form.Item>
              <Form.Item name="required_skills" label="技能要求">
                <Input placeholder="多个技能用逗号分隔，如：React, TypeScript, Node.js" />
              </Form.Item>
              <Form.Item name="experience_years" label="经验要求">
                <Input placeholder="如：3-5年" />
              </Form.Item>
              <Form.Item name="salary_range" label="薪资范围">
                <Input placeholder="如：20k-30k" />
              </Form.Item>
              <Form.Item name="location" label="工作地点">
                <Input placeholder="如：北京" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block>
                创建职位描述
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>

      {parsedResume && (
        <Card title="解析结果" style={{ marginTop: 24 }}>
          <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="候选人姓名">
              {parsedResume.candidateName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {parsedResume.candidateEmail || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="电话">
              {parsedResume.candidatePhone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="技能" span={3}>
              {parsedResume.skills?.map((skill, index) => (
                <Tag key={index} color="blue">{skill}</Tag>
              )) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="工作经历" span={3}>
              {parsedResume.experience?.map((exp, index) => (
                <div key={index} style={{ marginBottom: 8 }}>
                  <strong>{exp.company}</strong> - {exp.position}
                  <span style={{ color: '#666', marginLeft: 8 }}>({exp.duration})</span>
                </div>
              )) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="教育背景" span={3}>
              {parsedResume.education?.map((edu, index) => (
                <div key={index}>
                  <strong>{edu.school}</strong> - {edu.major} ({edu.degree})
                </div>
              )) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="简历摘要" span={3}>
              {parsedResume.summary || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {jdList.length > 0 && (
        <Card title="已有职位描述" style={{ marginTop: 24 }}>
          <Row gutter={[16, 16]}>
            {jdList.map((jd) => (
              <Col xs={24} sm={12} lg={8} key={jd.id}>
                <Card 
                  size="small" 
                  title={jd.title}
                  extra={<Tag color="blue">{jd.company}</Tag>}
                >
                  <p style={{ color: '#666', marginBottom: 8 }}>{jd.location}</p>
                  <p style={{ fontSize: 12, color: '#999' }}>
                    {jd.description?.substring(0, 100)}...
                  </p>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  );
}

export default ResumeUpload;