import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import {
  ScissorOutlined,
  CompressOutlined,
  SwapOutlined,
  AppstoreOutlined,
  MobileOutlined,
} from '@ant-design/icons';
import ListingGenerator from './components/ListingGenerator';

const { Sider, Content } = Layout;

const MENU_ITEMS = [
  { key: 'crop', icon: <ScissorOutlined />, label: '图片裁剪' },
  { key: 'compress', icon: <CompressOutlined />, label: '图片压缩' },
  { key: 'convert', icon: <SwapOutlined />, label: '格式转换' },
  { key: 'collage', icon: <AppstoreOutlined />, label: '图片拼图' },
  { key: 'listing', icon: <MobileOutlined />, label: '上架图生成' },
];

function App() {
  const [current, setCurrent] = useState('compress');
  const [collapsed, setCollapsed] = useState(false);

  const handleMenuClick = ({ key }) => {
    setCurrent(key);
    window.location.hash = key;
    const iframe = document.getElementById('content-frame');
    if (iframe && iframe.contentWindow) {
      iframe.src = `/legacy.html#${key}`;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={220}
        style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.06)' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 24px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {!collapsed && (
            <span style={{ fontWeight: 600, fontSize: 16 }}>图片工具箱</span>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[current]}
          items={MENU_ITEMS}
          onClick={handleMenuClick}
          style={{ marginTop: 8, border: 'none' }}
        />
      </Sider>
      <Layout>
        <Content
          style={{
            margin: 0,
            padding: 0,
            minHeight: '100vh',
            background: '#f5f5f5',
          }}
        >
          {current === 'listing' ? (
            <ListingGenerator />
          ) : (
            <iframe
              id="content-frame"
              src={`/legacy.html#${current}`}
              title="功能模块"
              style={{
                width: '100%',
                height: '100vh',
                border: 'none',
                display: 'block',
              }}
            />
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
