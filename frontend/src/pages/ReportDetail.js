import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Tag, 
  Progress, 
  Row, 
  Col, 
  Statistic,
  Descriptions,
  List,
  Button,
  message,
  Spin,
  Empty
} from 'antd';
import { 
  DownloadOutlined,
  MailOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { reportApi, emailApi } from '../services/api';
import dayjs from 'dayjs';

function ReportDetail() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await reportApi.getList();
      setReports(response.data.data || []);
    } catch (error) {
      message.error('获取报告列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReport = async (interviewId) => {
    try {
      const report = reports.find(r => r.interview_id === interviewId);
      await emailApi.sendResult(interviewId, report?.report_url);
      message.success('报告已发送给候选人');
    } catch (error) {
      message.error('发送失败');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#52c41a';
    if (score >= 6) return '#1890ff';
    if (score >= 4) return '#faad14';
    return '#ff4d4f';
  };

  const columns = [
    {
      title: '候选人',
      dataIndex: ['interview', 'resume', 'candidate_name'],
      key: 'candidate_name',
    },
    {
      title: '职位',
      dataIndex: ['interview', 'jobDescription', 'title'],
      key: 'position',
    },
    {
      title: '综合评分',
      dataIndex: 'overall_score',
      key: 'overall_score',
      render: (score) => (
        <Progress 
          type="circle" 
          percent={score * 10} 
          size={50}
          strokeColor={getScoreColor(score)}
          format={(percent) => `${(percent / 10).toFixed(1)}`}
        />
      ),
    },
    {
      title: '技术能力',
      dataIndex: 'technical_score',
      key: 'technical_score',
      render: (score) => (
        <Progress 
          percent={score * 10} 
          size="small"
          strokeColor={getScoreColor(score)}
        />
      ),
    },
    {
      title: '沟通能力',
      dataIndex: 'communication_score',
      key: 'communication_score',
      render: (score) => (
        <Progress 
          percent={score * 10} 
          size="small"
          strokeColor={getScoreColor(score)}
        />
      ),
    },
    {
      title: '推荐结果',
      dataIndex: 'recommendation',
      key: 'recommendation',
      render: (rec) => {
        const colorMap = {
          '强烈推荐': 'success',
          '推荐': 'processing',
          '待定': 'warning',
          '不推荐': 'error',
        };
        return <Tag color={colorMap[rec] || 'default'}>{rec}</Tag>;
      },
    },
    {
      title: '生成时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<MailOutlined />}
          onClick={() => handleSendReport(record.interview_id)}
        >
          发送报告
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>面试报告</h2>
      
      {reports.length === 0 ? (
        <Empty description="暂无面试报告" />
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="总报告数"
                  value={reports.length}
                  suffix="份"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="平均评分"
                  value={reports.length > 0 
                    ? (reports.reduce((sum, r) => sum + (r.overall_score || 0), 0) / reports.length).toFixed(1)
                    : 0
                  }
                  suffix="/ 10"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="推荐人数"
                  value={reports.filter(r => ['强烈推荐', '推荐'].includes(r.recommendation)).length}
                  suffix={`/ ${reports.length}`}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          <Card>
            <Table 
              columns={columns}
              dataSource={reports}
              rowKey="id"
              expandable={{
                expandedRowRender: (record) => (
                  <div style={{ padding: 16 }}>
                    <Row gutter={[24, 24]}>
                      <Col xs={24} md={12}>
                        <Card title="评分详情" size="small">
                          <Descriptions column={1} size="small">
                            <Descriptions.Item label="技术能力">
                              <Progress percent={(record.technical_score || 0) * 10} size="small" />
                            </Descriptions.Item>
                            <Descriptions.Item label="沟通能力">
                              <Progress percent={(record.communication_score || 0) * 10} size="small" />
                            </Descriptions.Item>
                            <Descriptions.Item label="问题解决">
                              <Progress percent={(record.problem_solving_score || 0) * 10} size="small" />
                            </Descriptions.Item>
                            <Descriptions.Item label="团队协作">
                              <Progress percent={(record.teamwork_score || 0) * 10} size="small" />
                            </Descriptions.Item>
                          </Descriptions>
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card title="优势与建议" size="small">
                          <h4 style={{ color: '#52c41a' }}>优势</h4>
                          <List
                            size="small"
                            dataSource={record.strengths || []}
                            renderItem={(item) => <List.Item>{item}</List.Item>}
                            locale={{ emptyText: '暂无' }}
                          />
                          <h4 style={{ color: '#faad14', marginTop: 16 }}>改进建议</h4>
                          <List
                            size="small"
                            dataSource={record.improvements || []}
                            renderItem={(item) => <List.Item>{item}</List.Item>}
                            locale={{ emptyText: '暂无' }}
                          />
                        </Card>
                      </Col>
                    </Row>
                    {record.summary && (
                      <Card title="综合评价" size="small" style={{ marginTop: 16 }}>
                        <p>{record.summary}</p>
                      </Card>
                    )}
                  </div>
                ),
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
}

export default ReportDetail;