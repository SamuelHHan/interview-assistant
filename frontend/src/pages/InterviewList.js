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
  Popconfirm,
  Badge,
  Tooltip,
  Alert
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  PlusOutlined, 
  EyeOutlined, 
  ThunderboltOutlined,
  MailOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  VideoCameraOutlined,
  ReloadOutlined
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
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchInterviews();
    fetchResumesAndJds();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      console.log('Fetching interviews...');
      const response = await interviewApi.getList();
      console.log('Interviews response:', response);
      const data = response.data?.data || [];
      console.log('Interviews data:', data);
      setInterviews(data);
      return data;
    } catch (error) {
      console.error('Fetch interviews error:', error);
      console.error('Error response:', error.response);
      message.error('获取面试列表失败: ' + (error.response?.data?.message || error.message));
      return [];
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
      setCreating(true);
      const response = await interviewApi.create(values.resumeId, values.jdId);
      const newInterview = response.data.data;
      
      message.success({
        content: '面试创建成功！AI已自动生成问题并发送邀请邮件',
        duration: 3
      });
      
      setCreateModalVisible(false);
      form.resetFields();
      
      // Refresh list first, then navigate
      await fetchInterviews();
      
      // Show success modal with next steps
      Modal.success({
        title: '面试创建成功',
        content: (
          <div>
            <p>AI已自动完成以下操作：</p>
            <ul>
              <li>✅ 生成面试问题</li>
              <li>✅ 安排面试时间（明天）</li>
              <li>✅ 发送邀请邮件给候选人</li>
            </ul>
            <p>候选人接受邀请后，您可以在列表中看到状态更新。</p>
          </div>
        ),
        onOk: () => navigate(`/interview/${newInterview.id}`)
      });
    } catch (error) {
      message.error('创建失败：' + (error.response?.data?.message || error.message));
    } finally {
      setCreating(false);
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
      fetchInterviews();
    } catch (error) {
      message.error('发送失败：' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'default', text: '待处理', icon: <ClockCircleOutlined /> },
      questions_generated: { color: 'processing', text: '已生成问题', icon: <ThunderboltOutlined /> },
      confirmed: { color: 'warning', text: '已确认', icon: <CheckCircleOutlined /> },
      email_sent: { color: 'cyan', text: '已发送邀请', icon: <MailOutlined /> },
      in_progress: { color: 'blue', text: '进行中', icon: <VideoCameraOutlined /> },
      completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  const getCandidateStatus = (record) => {
    if (record.candidate_joined) {
      return <Badge status="success" text="已加入会议" />;
    }
    if (record.candidate_accepted) {
      return <Badge status="processing" text="已接受邀请" />;
    }
    if (record.status === 'email_sent') {
      return <Badge status="default" text="等待接受" />;
    }
    return <Badge status="default" text="未邀请" />;
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
      render: (text, record) => (
        <Space>
          <UserOutlined />
          {text || '未知'}
        </Space>
      ),
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
      title: '候选人状态',
      key: 'candidate_status',
      render: (_, record) => getCandidateStatus(record),
    },
    {
      title: '面试时间',
      dataIndex: 'scheduled_time',
      key: 'scheduled_time',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '会议',
      key: 'meeting',
      render: (_, record) => (
        record.meeting_url ? (
          <Tooltip title={`会议号: ${record.meeting_id}`}>
            <Button 
              type="link" 
              size="small" 
              icon={<VideoCameraOutlined />}
              href={record.meeting_url}
              target="_blank"
            >
              加入
            </Button>
          </Tooltip>
        ) : '-'
      ),
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
          )}
          {record.status === 'email_sent' && !record.candidate_accepted && (
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
      <Alert
        message="面试流程说明"
        description="创建面试后，AI将自动生成面试问题、安排会议并发送邀请邮件。候选人接受邀请并加入会议后，状态会实时更新。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Card 
        title="面试管理" 
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchInterviews}
            >
              刷新
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建面试
            </Button>
          </Space>
        }
      >
        <Table 
          columns={columns}
          dataSource={interviews}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: '暂无面试记录，点击右上角"创建面试"开始'
          }}
        />
      </Card>

      {/* Create Interview Modal */}
      <Modal
        title="创建面试"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
      >
        <Alert
          message="创建后AI将自动"
          description="1. 生成面试问题 2. 安排会议时间 3. 发送邀请邮件"
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical" onFinish={handleCreateInterview}>
          <Form.Item name="resumeId" label="选择简历" rules={[{ required: true }]}>
            <Select placeholder="请选择简历" loading={resumes.length === 0}>
              {resumes.map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  {r.candidate_name} ({r.candidate_email})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="jdId" label="选择职位" rules={[{ required: true }]}>
            <Select placeholder="请选择职位" loading={jds.length === 0}>
              {jds.map((j) => (
                <Select.Option key={j.id} value={j.id}>
                  {j.title} - {j.company}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={creating}>
            {creating ? '创建中...' : '创建'}
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