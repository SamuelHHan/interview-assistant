import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Button, Alert, Spin, Typography, Space, Progress, message } from 'antd';
import { 
  AudioOutlined, 
  AudioMutedOutlined, 
  VideoCameraOutlined, 
  VideoCameraAddOutlined,
  PhoneOutlined,
  MessageOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Room, RoomEvent } from 'livekit-client';
import axios from 'axios';

const { Title, Text } = Typography;

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

function LiveKitMeeting() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const roomName = searchParams.get('room');
  
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20 minutes in seconds
  const [interviewEnded, setInterviewEnded] = useState(false);
  
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const roomRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastFinalTranscriptRef = useRef('');

  // 自动根据当前访问的host确定LiveKit WebSocket地址
  // 如果环境变量配置了非localhost的地址则使用环境变量，否则使用当前页面host
  const getLivekitWsUrl = () => {
    const envUrl = process.env.REACT_APP_LIVEKIT_WS_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${hostname}:7880`;
  };
  const wsUrl = getLivekitWsUrl();

  // Format time remaining
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Connect to LiveKit room
  const connectRoom = useCallback(async () => {
    if (!token || !roomName) {
      setError('Missing meeting credentials');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners before connecting
      setupRoomListeners(newRoom);

      await newRoom.connect(wsUrl, token);
      
      // Enable camera and microphone
      await newRoom.localParticipant.enableCameraAndMicrophone();
      
      setRoom(newRoom);
      roomRef.current = newRoom;
      setConnected(true);
      setConnecting(false);

      // Start 20-minute countdown
      startTimer();

      message.success('已成功加入会议室');
    } catch (err) {
      console.error('Failed to connect to room:', err);
      setError(`连接失败: ${err.message}`);
      setConnecting(false);
    }
  }, [token, roomName, wsUrl]);

  // Set up room event listeners
  const setupRoomListeners = (roomInstance) => {
    // Handle incoming data messages (from AI Agent via server)
    roomInstance.on(RoomEvent.DataReceived, (payload, participant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        
        if (data.type === 'agent_message') {
          const newMessage = {
            type: 'agent',
            text: data.text,
            messageType: data.messageType || 'message',
            timestamp: data.timestamp || new Date().toISOString(),
          };
          
          setMessages(prev => [...prev, newMessage]);
          
          // Track current question
          if (data.messageType === 'question') {
            setCurrentQuestion(data.text);
          }
          
          // Check if interview is ending
          if (data.messageType === 'closing' || data.messageType === 'time_up') {
            setInterviewEnded(true);
          }
        }
      } catch (e) {
        console.log('Received non-JSON data');
      }
    });

    // Handle disconnection
    roomInstance.on(RoomEvent.Disconnected, (reason) => {
      console.log('Disconnected from room:', reason);
      setConnected(false);
      setInterviewEnded(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      message.info('已离开会议室');
    });
  };

  // Start 20-minute countdown timer
  const startTimer = () => {
    const startTime = Date.now();
    const duration = 20 * 60 * 1000; // 20 minutes
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setInterviewEnded(true);
      }
    }, 1000);
  };

  // Toggle audio
  const toggleAudio = async () => {
    if (!room) return;
    
    try {
      if (audioEnabled) {
        await room.localParticipant.setMicrophoneEnabled(false);
      } else {
        await room.localParticipant.setMicrophoneEnabled(true);
      }
      setAudioEnabled(!audioEnabled);
    } catch (err) {
      message.error('麦克风操作失败');
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    if (!room) return;
    
    try {
      if (videoEnabled) {
        await room.localParticipant.setCameraEnabled(false);
      } else {
        await room.localParticipant.setCameraEnabled(true);
      }
      setVideoEnabled(!videoEnabled);
    } catch (err) {
      message.error('摄像头操作失败');
    }
  };

  // Leave room
  const leaveRoom = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (room) {
      await room.disconnect();
    }
    
    setConnected(false);
    setInterviewEnded(true);
    navigate('/');
  };

  // Send transcript to backend via HTTP API
  const sendTranscriptToBackend = async (text) => {
    try {
      // Extract interview ID from token (token contains candidate-{interviewId})
      const tokenParts = token.split('.');
      if (tokenParts.length < 2) return;
      
      // Decode payload to get identity
      const payload = JSON.parse(atob(tokenParts[1]));
      const identity = payload.sub || ''; // subject claim
      
      const match = identity.match(/candidate-(\d+)/);
      if (!match) {
        console.warn('Could not extract interview ID from token');
        return;
      }
      
      const interviewId = match[1];
      
      await axios.post(`${API_BASE_URL}/interview/${interviewId}/transcript`, {
        text
      });
    } catch (error) {
      console.error('Failed to send transcript:', error);
    }
  };

  // Set up speech recognition and send to backend
  useEffect(() => {
    if (!room || !connected) return;

    // Set up speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        
        if (finalTranscript && finalTranscript !== lastFinalTranscriptRef.current) {
          lastFinalTranscriptRef.current = finalTranscript;
          
          // Send to backend via HTTP API
          sendTranscriptToBackend(finalTranscript);
          
          // Add to local messages for display
          const newMessage = {
            type: 'candidate',
            text: finalTranscript,
            timestamp: new Date().toISOString(),
          };
          
          setMessages(prev => [...prev, newMessage]);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        // Restart on error unless it's no-speech
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          try {
            recognition.start();
          } catch (e) {
            // Already started or other error
          }
        }
      };
      
      recognition.onend = () => {
        // Auto-restart if still connected and not ended
        if (connected && !interviewEnded) {
          try {
            recognition.start();
          } catch (e) {
            // Already started or other error
          }
        }
      };
      
      recognition.start();
      
      return () => {
        recognition.stop();
      };
    } else {
      message.warning('您的浏览器不支持语音识别，请使用Chrome或Edge浏览器');
    }
  }, [room, connected, interviewEnded]);

  // Display local video
  useEffect(() => {
    if (room && videoRef.current) {
      const attachVideo = async () => {
        const videoTrack = room.localParticipant.videoTrackPublications.values().next().value;
        if (videoTrack && videoTrack.track) {
          videoTrack.track.attach(videoRef.current);
        }
      };
      
      attachVideo();
      
      return () => {
        const videoTrack = room?.localParticipant.videoTrackPublications.values().next().value;
        if (videoTrack && videoTrack.track) {
          videoTrack.track.detach();
        }
      };
    }
  }, [room, videoEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  if (!token || !roomName) {
    return (
      <div style={{ padding: 50, textAlign: 'center' }}>
        <Alert
          message="无效的会议链接"
          description="缺少必要的会议信息，请通过正确的邀请链接进入。"
          type="error"
          showIcon
        />
        <Button type="primary" onClick={() => navigate('/')} style={{ marginTop: 20 }}>
          返回首页
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 50, textAlign: 'center' }}>
        <Alert
          message="连接失败"
          description={error}
          type="error"
          showIcon
        />
        <Button type="primary" onClick={connectRoom} style={{ marginTop: 20 }}>
          重试连接
        </Button>
      </div>
    );
  }

  if (!connected) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}>
        <Card style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
          <Spin spinning={connecting} size="large">
            <Title level={3}>准备进入面试</Title>
            <p style={{ color: '#666', marginBottom: 24 }}>
              面试时长约20分钟，请确保您的摄像头和麦克风正常工作
            </p>
            
            <div style={{ marginBottom: 24 }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ 
                  width: '100%', 
                  maxWidth: 400, 
                  borderRadius: 8,
                  background: '#000',
                  transform: 'scaleX(-1)'
                }}
              />
            </div>
            
            <Space>
              <Button
                size="large"
                icon={audioEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
                onClick={() => setAudioEnabled(!audioEnabled)}
              >
                {audioEnabled ? '麦克风开启' : '麦克风关闭'}
              </Button>
              <Button
                size="large"
                icon={videoEnabled ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
                onClick={() => setVideoEnabled(!videoEnabled)}
              >
                {videoEnabled ? '摄像头开启' : '摄像头关闭'}
              </Button>
            </Space>
            
            <div style={{ marginTop: 24 }}>
              <Button
                type="primary"
                size="large"
                icon={<PhoneOutlined />}
                onClick={connectRoom}
                loading={connecting}
                style={{ width: 200, height: 48 }}
              >
                加入面试
              </Button>
            </div>
          </Spin>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f0f2f5',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ 
        background: '#fff', 
        padding: '12px 24px', 
        borderBottom: '1px solid #e8e8e8',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>🎯 AI视频面试</Title>
          {currentQuestion && (
            <Text type="secondary" style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              当前问题: {currentQuestion}
            </Text>
          )}
        </Space>
        
        <Space>
          <div style={{ 
            background: timeRemaining < 300 ? '#ff4d4f' : '#52c41a',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <ClockCircleOutlined />
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {formatTime(timeRemaining)}
            </Text>
          </div>
          
          <Button 
            danger 
            icon={<PhoneOutlined />}
            onClick={leaveRoom}
          >
            结束面试
          </Button>
        </Space>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        padding: 16, 
        gap: 16,
        overflow: 'hidden'
      }}>
        {/* Video Area */}
        <div style={{ 
          flex: 2, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 16 
        }}>
          {/* Local Video */}
          <Card 
            style={{ flex: 1, position: 'relative' }}
            bodyStyle={{ padding: 0, height: '100%' }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ 
                width: '100%', 
                height: '100%',
                objectFit: 'cover',
                borderRadius: 8,
                transform: 'scaleX(-1)'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 12,
              background: 'rgba(0,0,0,0.6)',
              padding: '8px 16px',
              borderRadius: 24
            }}>
              <Button
                shape="circle"
                size="large"
                icon={audioEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
                onClick={toggleAudio}
                style={{ color: audioEnabled ? '#52c41a' : '#ff4d4f' }}
              />
              <Button
                shape="circle"
                size="large"
                icon={videoEnabled ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
                onClick={toggleVideo}
                style={{ color: videoEnabled ? '#52c41a' : '#ff4d4f' }}
              />
            </div>
          </Card>
          
          {/* Progress Bar */}
          <Card>
            <Progress 
              percent={Math.round(((20 * 60 - timeRemaining) / (20 * 60)) * 100)} 
              status={timeRemaining < 300 ? 'exception' : 'active'}
              format={() => `已用时间: ${formatTime(20 * 60 - timeRemaining)}`}
            />
          </Card>
        </div>

        {/* Chat/Transcript Area */}
        <Card 
          style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            maxWidth: 400
          }}
          title={
            <Space>
              <MessageOutlined />
              <span>面试对话</span>
            </Space>
          }
          bodyStyle={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
              <Spin tip="等待AI面试官..." />
            </div>
          )}
          
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                alignSelf: msg.type === 'candidate' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: 12,
                background: msg.type === 'candidate' ? '#1890ff' : '#f6ffed',
                color: msg.type === 'candidate' ? '#fff' : '#333',
                border: msg.type === 'agent' ? '1px solid #b7eb8f' : 'none',
              }}
            >
              <Text style={{ 
                fontSize: 12, 
                color: msg.type === 'candidate' ? 'rgba(255,255,255,0.7)' : '#999',
                display: 'block',
                marginBottom: 4
              }}>
                {msg.type === 'candidate' ? '您' : 'AI面试官'} · {new Date(msg.timestamp).toLocaleTimeString('zh-CN')}
              </Text>
              <Text style={{ 
                color: msg.type === 'candidate' ? '#fff' : '#333',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.text}
              </Text>
            </div>
          ))}
          
          {interviewEnded && (
            <Alert
              message="面试已结束"
              description="感谢您的参与！面试结果将通过邮件通知您。"
              type="success"
              showIcon
              style={{ marginTop: 12 }}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

export default LiveKitMeeting;