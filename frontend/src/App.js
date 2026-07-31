import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FileTextOutlined, 
  TeamOutlined, 
  ScheduleOutlined, 
  BarChartOutlined,
  RobotOutlined
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import ResumeUpload from './pages/ResumeUpload';
import InterviewList from './pages/InterviewList';
import InterviewDetail from './pages/InterviewDetail';
import ReportDetail from './pages/ReportDetail';
import CandidateInvite from './pages/CandidateInvite';
import LiveKitMeeting from './pages/LiveKitMeeting';

const { Header, Content, Footer, Sider } = Layout;

// Layout wrapper for admin routes
function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <BarChartOutlined />,
      label: '控制台',
    },
    {
      key: '/upload',
      icon: <FileTextOutlined />,
      label: '简历上传',
    },
    {
      key: '/interviews',
      icon: <TeamOutlined />,
      label: '面试管理',
    },
    {
      key: '/reports',
      icon: <ScheduleOutlined />,
      label: '面试报告',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        breakpoint="lg"
        theme="light"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <RobotOutlined style={{ fontSize: 24, color: '#667eea' }} />
          <span style={{ 
            fontSize: 16, 
            fontWeight: 'bold', 
            marginLeft: 8,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            AI面试助手
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ marginLeft: 200 }}>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>
            智能面试管理系统
          </h2>
          <span style={{ color: '#666' }}>
            HR智能面试助手 v1.0
          </span>
        </Header>
        <Content style={{ margin: '24px 16px 0', overflow: 'initial' }}>
          <div style={{ padding: 24, background: '#fff', borderRadius: 8, minHeight: 360 }}>
            {children}
          </div>
        </Content>
        <Footer style={{ textAlign: 'center', color: '#999' }}>
          AI面试助手 ©{new Date().getFullYear()} Created for HR
        </Footer>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <Routes>
      {/* Full-screen routes without admin layout */}
      <Route path="/livekit/meeting" element={<LiveKitMeeting />} />
      <Route path="/candidate/invite/:id" element={<CandidateInvite />} />
      
      {/* Admin routes with layout */}
      <Route path="/*" element={
        <AdminLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<ResumeUpload />} />
            <Route path="/interviews" element={<InterviewList />} />
            <Route path="/interview/:id" element={<InterviewDetail />} />
            <Route path="/reports" element={<ReportDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AdminLayout>
      } />
    </Routes>
  );
}

export default App;