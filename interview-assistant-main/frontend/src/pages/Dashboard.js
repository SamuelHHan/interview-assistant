import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, List, Tag, Progress, Spin } from 'antd';
import { 
  FileTextOutlined, 
  TeamOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { resumeApi, interviewApi, reportApi } from '../services/api';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalResumes: 0,
    totalInterviews: 0,
    completedInterviews: 0,
    pendingInterviews: 0,
    avgScore: 0,
  });
  const [recentInterviews, setRecentInterviews] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [resumesRes, interviewsRes, reportsRes] = await Promise.all([
        resumeApi.getList(),
        interviewApi.getList(),
        reportApi.getList(),
      ]);

      const resumes = resumesRes.data.data || [];
      const interviews = interviewsRes.data.data || [];
      const reports = reportsRes.data.data || [];

      const completed = interviews.filter(i => i.status === 'completed').length;
      const pending = interviews.filter(i => ['pending', 'questions_generated', 'confirmed', 'email_sent'].includes(i.status)).length;
      
      const avgScore = reports.length > 0 
        ? (reports.reduce((sum, r) => sum + (r.overall_score || 0), 0) / reports.length).toFixed(1)
        : 0;

      setStats({
        totalResumes: resumes.length,
        totalInterviews: interviews.length,
        completedInterviews: completed,
        pendingInterviews: pending,
        avgScore: parseFloat(avgScore),
      });

      setRecentInterviews(interviews.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>控制台概览</h2>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="简历总数"
              value={stats.totalResumes}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#667eea' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="面试总数"
              value={stats.totalInterviews}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#764ba2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待面试"
              value={stats.pendingInterviews}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均评分"
              value={stats.avgScore}
              suffix="/ 10"
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="面试进度">
            <div style={{ marginBottom: 16 }}>
              <span>已完成面试</span>
              <Progress 
                percent={stats.totalInterviews > 0 
                  ? Math.round((stats.completedInterviews / stats.totalInterviews) * 100) 
                  : 0
                } 
                status="active"
                strokeColor={{ '0%': '#667eea', '100%': '#764ba2' }}
              />
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="已完成"
                  value={stats.completedInterviews}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="待进行"
                  value={stats.pendingInterviews}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="最近面试">
            <List
              dataSource={recentInterviews}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.resume?.candidate_name || '未知候选人'}
                    description={item.jobDescription?.title || '未知职位'}
                  />
                  {getStatusTag(item.status)}
                </List.Item>
              )}
              locale={{ emptyText: '暂无面试记录' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;