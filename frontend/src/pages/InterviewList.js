import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Modal, 
  Form, 
  Select, 
  DatePicker, 
  InputNumber,
  message,
  Popconfirm
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  PlusOutlined, 
  EyeOutlined, 
  ThunderboltOutlined,
  MailOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { interviewApi, resumeApi, jdApi, emailApi } from '../services/api';

function InterviewList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [interviews, setInterviews] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [jds, setJds] = useState([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [form] = Form.useForm();
  const [scheduleForm] = Form.useForm();

  useEffect(() => {
    fetchInterviews();
    fetchResumesAndJds();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await interviewApi.getList();
      setInterviews(response.data.data || []);
    } catch (error) {
      message.error('获取面试列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchResumesAndJds = async () => {
    try {
      const [resumesRes, jdsRes] = await Promise.all([
        resumeApi.getList(),
        jdApi.getList(),
      ]);
      setResumes(resumesRes.data.data || []);
      setJds(jdsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch resumes and JDs:', error);
    }
  };

  const handleCreateInterview = async (values) => {
    try {
      const response = await interviewApi.create(values.resumeId, values.jdId);
      message.success('面试创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      fetchInterviews();
      
      // Navigate to interview detail
      navigate(`/interview/${response.data.data.id}`);
    } catch (error) {
      message.error('创建失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleGenerateQuestions = async (id) => {
    try {
      await interviewApi.generateQuestions(id);
      message.success('问题生成成功');
      fetchInterviews();
    } catch (error) {
      message.error('生成失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleSchedule = async (values) => {
    try {
      await interviewApi.schedule(
        selectedInterview.id,
        values.scheduledTime.toISOString(),
        values.duration
      );
      message.success('面试安排成功');
      setScheduleModalVisible(false);
      scheduleForm.resetFields();
      fetchInterviews();
    } catch (error) {
      message.error('安排失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleSendInvitation = async (id) => {
    try {
      await emailApi.sendInvitation(id);
      message.success('邀请邮件已发送');
    } catch (error) {
      message.error('发送失败：' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'default', text: '待处理' },
      questions_generated: { color: 'processing', text: '已生成问题' },
      confirmed: { color: 'warning', text: '已确认' },
      email_sent: { color: 'cyan', text: '已发送邀请' },
      in_progress: { color: 'blue', text: '进行中' },
      completed: { color: 'success', text: '已完成' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '候选人',
      dataIndex: ['resume', 'candidate_name'],
      key: 'candidate_name',
    },
    {
      title: '职位',
      dataIndex: ['jobDescription', 'title'],
      key: 'position',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: '面试时间',
      dataIndex: 'scheduled_time',
      key: 'scheduled_time',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/interview/${record.id}`)}
          >
            查看
          </Button>
          {record.status === 'pending' && (
            <Button 
              type="link" 
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => handleGenerateQuestions(record.id)}
            >
              生成问题
            </Button>
          )}
          {record.status === 'confirmed' && (
            <>
              <Button 
                type="link" 
                size="small"
                icon={<CalendarOutlined />}
                onClick={() => {
                  setSelectedInterview(record);
                  setScheduleModalVisible(true);
                }}
              >
                安排
              </Button>
            </>
          )}
          {record.status === 'email_sent' && (
            <Button 
              type="link" 
              size="small"
              icon={<MailOutlined />}
              onClick={() => handleSendInvitation(record.id)}
            >
              重发邀请
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card 
        title="面试管理" 
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建面试
          </Button>
        }
      >
        <Table 
          columns={columns}
          dataSource={interviews}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create Interview Modal */}
      <Modal
        title="创建面试"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateInterview}>
          <Form.Item name="resumeId" label="选择简历" rules={[{ required: true }]}>
            <Select placeholder="请选择简历">
              {resumes.map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  {r.candidate_name} ({r.candidate_email})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="jdId" label="选择职位" rules={[{ required: true }]}>
            <Select placeholder="请选择职位">
              {jds.map((j) => (
                <Select.Option key={j.id} value={j.id}>
                  {j.title} - {j.company}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            创建
          </Button>
        </Form>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        title="安排面试"
        open={scheduleModalVisible}
        onCancel={() => setScheduleModalVisible(false)}
        footer={null}
      >
        <Form form={scheduleForm} layout="vertical" onFinish={handleSchedule}>
          <Form.Item name="scheduledTime" label="面试时间" rules={[{ required: true }]}>
            <DatePicker 
              showTime 
              format="YYYY-MM-DD HH:mm"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
          <Form.Item name="duration" label="时长(分钟)" initialValue={20}>
            <InputNumber min={10} max={60} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            确认安排
          </Button>
        </Form>
      </Modal>
    </div>
  );
}

export default InterviewList;