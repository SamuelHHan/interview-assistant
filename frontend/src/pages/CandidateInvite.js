import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Result, Spin, message, Descriptions, Space } from 'antd';
import { CheckCircleOutlined, VideoCameraOutlined, ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

function CandidateInvite() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchInterviewStatus();
  }, [id]);

  const fetchInterviewStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/interview/${id}/status`);
      const data = response.data.data;
      setInterview(data);
      setAccepted(data.candidate_accepted);
    } catch (error) {
      message.error('获取面试信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      await axios.post(`${API_BASE_URL}/interview/${id}/accept`);
      setAccepted(true);
      message.success('已接受面试邀请！');
      fetchInterviewStatus();
    } catch (error) {
      message.error('操作失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleJoinMeeting = async () => {
    try {
      setJoining(true);
      await axios.post(`${API_BASE_URL}/interview/${id}/join`);
      message.success('正在进入会议...');
      if (interview.meeting_url) {
        // 从存储的URL中提取token和room参数，使用当前访问的host重新构建URL
        // 这样无论FRONTEND_URL配置成什么，候选人都能从当前访问地址进入会议室
        const url = new URL(interview.meeting_url);
        const token = url.searchParams.get('token');
        const room = url.searchParams.get('room');
        const currentOrigin = window.location.origin;
        const meetingUrl = `${currentOrigin}/livekit/meeting?token=${encodeURIComponent(token)}&room=${encodeURIComponent(room)}`;
        window.location.href = meetingUrl;
      }
      fetchInterviewStatus();
    } catch (error) {
      message.error('进入会议失败：' + (error.response?.data?.message || error.message));
    } finally {
      setJoining(false);
    }
  };

  // 刷新会议室链接（当 meeting_url 为空时）
  const handleRefreshToken = async () => {
    try {
      setJoining(true);
      const response = await axios.post(`${API_BASE_URL}/interview/${id}/refresh-token`);
      const { meetingUrl, tokenExpires, scheduledTime, meetingId } = response.data.data;
      
      // 更新本地面试数据（包括新增的scheduledTime和meetingId）
      setInterview(prev => ({
        ...prev,
        meeting_url: meetingUrl,
        meeting_id: meetingId,
        scheduled_time: scheduledTime,
        meeting_token_expires: tokenExpires
      }));
      
      // 重新构建URL使用当前host
      const url = new URL(meetingUrl);
      const token = url.searchParams.get('token');
      const room = url.searchParams.get('room');
      const currentOrigin = window.location.origin;
      const newMeetingUrl = `${currentOrigin}/livekit/meeting?token=${encodeURIComponent(token)}&room=${encodeURIComponent(room)}`;
      
      // 直接跳转
      window.location.href = newMeetingUrl;
    } catch (error) {
      message.error('刷新失败：' + (error.response?.data?.message || error.message));
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!interview) {
    return (
      <Result
        status="404"
        title="面试不存在"
        subTitle="请检查链接是否正确"
      />
    );
  }

  const isExpired = interview.scheduled_time && dayjs(interview.scheduled_time).isBefore(dayjs().subtract(2, 'hour'));

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }}>
      <Card style={{ maxWidth: 600, width: '100%', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, color: '#333', marginBottom: 8 }}>🎯 面试邀请</h1>
          <p style={{ color: '#666', fontSize: 16 }}>您被邀请参加 AI 视频面试</p>
        </div>

        <Descriptions column={1} bordered size="middle" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="候选人">
            <strong>{interview.candidate_name}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="面试职位">
            {interview.position}
          </Descriptions.Item>
          <Descriptions.Item label="面试时间">
            <Space>
              <ClockCircleOutlined />
              {interview.scheduled_time ? dayjs(interview.scheduled_time).format('YYYY年MM月DD日 HH:mm') : '待定'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="会议室">
            {interview.meeting_id || '待生成'}
          </Descriptions.Item>
        </Descriptions>

        {isExpired ? (
          <Result
            status="warning"
            title="面试链接已过期"
            subTitle="面试链接已过期，请联系HR重新安排"
          />
        ) : !accepted ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: 24, color: '#666' }}>
              请确认您是否参加本次面试。接受邀请后，您可以在面试开始时加入会议。
            </p>
            <Button 
              type="primary" 
              size="large" 
              icon={<CheckCircleOutlined />}
              onClick={handleAccept}
              style={{ width: 200, height: 48, fontSize: 16 }}
            >
              接受面试邀请
            </Button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Result
              status="success"
              title="已接受面试邀请"
              subTitle={interview.scheduled_time ? `请在面试时间 ${dayjs(interview.scheduled_time).format('MM月DD日 HH:mm')} 准时参加会议` : '面试时间已确认，等待会议链接生成'}
            />
            {(!interview.meeting_url || interview.meeting_url === 'null' || interview.meeting_url === 'undefined') ? (
              <div>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<ReloadOutlined />}
                  onClick={handleRefreshToken}
                  loading={joining}
                  style={{ width: 200, height: 48, fontSize: 16 }}
                >
                  生成面试链接
                </Button>
                <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                  面试链接尚未生成，点击上方按钮创建
                </p>
              </div>
            ) : (
              <Button 
                type="primary" 
                size="large" 
                icon={<VideoCameraOutlined />}
                onClick={handleJoinMeeting}
                loading={joining}
                style={{ width: 200, height: 48, fontSize: 16 }}
              >
                {interview.candidate_joined ? '重新进入会议' : '加入面试会议'}
              </Button>
            )}
            {interview.candidate_joined && (
              <p style={{ marginTop: 16, color: '#52c41a' }}>
                ✅ 您已加入会议（{dayjs(interview.joined_at).format('HH:mm')}）
              </p>
            )}
          </div>
        )}

        <div style={{ marginTop: 32, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
          <h4 style={{ marginBottom: 8 }}>📝 面试须知</h4>
          <ul style={{ color: '#666', paddingLeft: 20, margin: 0 }}>
            <li>请提前5分钟进入会议室，检查摄像头和麦克风</li>
            <li>面试将由AI面试官进行，请保持放松</li>
            <li>面试全程约20分钟，请确保时间充足</li>
            <li>建议使用Chrome或Edge浏览器，确保网络稳定</li>
            <li>面试链接一周内有效，请及时参加</li>
            <li>如有问题，请联系HR</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

export default CandidateInvite;