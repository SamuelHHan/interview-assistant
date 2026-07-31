import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Descriptions, 
  Tag, 
  List, 
  Button, 
  Space, 
  message, 
  Spin,
  Modal,
  Input,
  Row,
  Col,
  Divider,
  Progress,
  Badge,
  Steps,
  Alert,
  Tooltip
} from 'antd';
import { 
  ArrowLeftOutlined,
  CheckOutlined,
  MailOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  VideoCameraOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { interviewApi, emailApi, reportApi } from '../services/api';

const { TextArea } = Input;
const { Step } = Steps;

function InterviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState([]);

  useEffect(() => {
    fetchInterview();
    // Poll for status updates every 10 seconds
    const interval = setInterval(fetchInterview, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchInterview = async () => {
    try {
      setLoading(true);
      const response = await interviewApi.getById(id);
      setInterview(response.data.data);
      setEditedQuestions(response.data.data?.interview_questions || []);
    } catch (error) {
      message.error('获取面试详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmQuestions = async () => {
    try {
      await interviewApi.confirmQuestions(id, editedQuestions);
      message.success('问题已确认');
      setConfirmModalVisible(false);
      fetchInterview();
    } catch (error) {
      message.error('确认失败');
    }
  };

  const handleSendInvitation = async () => {
    try {
      await emailApi.sendInvitation(id);
      message.success('邀请邮件已发送');
      fetchInterview();
    } catch (error) {
      message.error('发送失败');
    }
  };

  const handleStartInterview = async () => {
    try {
      await interviewApi.start(id);
      message.success('面试已开始');
      fetchInterview();
    } catch (error) {
      message.error('启动失败');
    }
  };

  const handleGenerateReport = async () => {
    try {
      await reportApi.generate(id);
      message.success('报告生成成功');
      navigate('/reports');
    } catch (error) {
      message.error('生成报告失败');
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

  const getCandidateStatusTag = () => {
    if (!interview) return null;
    if (interview.candidate_joined) {
      return <Badge status="success" text="候选人已加入会议" />;
    }
    if (interview.candidate_accepted) {
      return <Badge status="processing" text="候选人已接受邀请" />;
    }
    if (interview.status === 'email_sent') {
      return <Badge status="default" text="等待候选人接受" />;
    }
    return <Badge status="default" text="未发送邀请" />;
  };

  const getCurrentStep = () => {
    if (!interview) return 0;
    switch (interview.status) {
      case 'pending': return 0;
      case 'questions_generated': return 1;
      case 'confirmed': return 2;
      case 'email_sent': 
        if (interview.candidate_joined) return 4;
        if (interview.candidate_accepted) return 3;
        return 3;
      case 'in_progress': return 4;
      case 'completed': return 5;
      default: return 0;
    }
  };

  if (loading && !interview) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!interview) {
    return <div>面试不存在</div>;
  }

  return (
    <div>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/interviews')}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      {/* Process Steps */}
      <Card style={{ marginBottom: 16 }}>
        <Steps current={getCurrentStep()} size="small">
          <Step title="创建面试" icon={<UserOutlined />} />
          <Step title="生成问题" icon={<FileTextOutlined />} />
          <Step title="确认问题" icon={<CheckOutlined />} />
          <Step title="发送邀请" icon={<MailOutlined />} />
          <Step title="进行面试" icon={<VideoCameraOutlined />} />
          <Step title="完成" icon={<CheckCircleOutlined />} />
        </Steps>
      </Card>

      {/* Candidate Status Alert */}
      {interview.status === 'email_sent' && (
        <Alert
          message={getCandidateStatusTag()}
          description={
            interview.candidate_joined 
              ? `候选人已于 ${dayjs(interview.joined_at).format('YYYY-MM-DD HH:mm')} 加入会议`
              : interview.candidate_accepted
              ? `候选人已于 ${dayjs(interview.accepted_at).format('YYYY-MM-DD HH:mm')} 接受邀请，等待加入会议`
              : '邀请邮件已发送，等待候选人接受。候选人可以通过邮件中的链接接受邀请并加入会议。'
          }
          type={interview.candidate_joined ? 'success' : interview.candidate_accepted ? 'info' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="基本信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="状态">
                {getStatusTag(interview.status)}
              </Descriptions.Item>
              <Descriptions.Item label="候选人">
                {interview.resume?.candidate_name}
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">
                {interview.resume?.candidate_email}
              </Descriptions.Item>
              <Descriptions.Item label="职位">
                {interview.jobDescription?.title}
              </Descriptions.Item>
              <Descriptions.Item label="公司">
                {interview.jobDescription?.company}
              </Descriptions.Item>
              <Descriptions.Item label="面试时间">
                {interview.scheduled_time 
                  ? dayjs(interview.scheduled_time).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="会议链接">
                {interview.meeting_url ? (
                  <a href={interview.meeting_url} target="_blank" rel="noopener noreferrer">
                    加入会议
                  </a>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="会议号">
                {interview.meeting_id || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card 
            title="面试问题"
            extra={
              interview.status === 'questions_generated' && (
                <Button 
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => setConfirmModalVisible(true)}
                >
                  确认问题
                </Button>
              )
            }
          >
            <List
              dataSource={interview.interview_questions || []}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    title={<>
                      <Tag color="blue">{index + 1}</Tag>
                      <Tag>{item.category}</Tag>
                    </>}
                    description={item.question}
                  />
                </List.Item>
              )}
              locale={{ emptyText: '暂无问题' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Space wrap>
          {interview.status === 'questions_generated' && (
            <Button 
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => setConfirmModalVisible(true)}
            >
              确认问题
            </Button>
          )}
          {interview.status === 'confirmed' && (
            <Button 
              type="primary"
              icon={<MailOutlined />}
              onClick={handleSendInvitation}
            >
              发送邀请邮件
            </Button>
          )}
          {interview.status === 'email_sent' && interview.candidate_joined && (
            <Button 
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStartInterview}
            >
              开始面试
            </Button>
          )}
          {interview.status === 'completed' && (
            <Button 
              type="primary"
              icon={<FileTextOutlined />}
              onClick={handleGenerateReport}
            >
              生成报告
            </Button>
          )}
        </Space>
      </Card>

      {/* Confirm Questions Modal */}
      <Modal
        title="确认面试问题"
        open={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
        onOk={handleConfirmQuestions}
        width={700}
      >
        <List
          dataSource={editedQuestions}
          renderItem={(item, index) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <Tag color="blue" style={{ marginBottom: 8 }}>{item.category}</Tag>
                <TextArea 
                  defaultValue={item.question}
                  onChange={(e) => {
                    const newQuestions = [...editedQuestions];
                    newQuestions[index] = { ...item, question: e.target.value };
                    setEditedQuestions(newQuestions);
                  }}
                  autoSize={{ minRows: 2 }}
                />
              </div>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}

export default InterviewDetail;