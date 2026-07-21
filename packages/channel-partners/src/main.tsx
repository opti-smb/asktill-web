import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import ChannelPartnersApp from './ChannelPartnersApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <div style={{ maxWidth: 960, margin: '24px auto', padding: '0 16px' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Channel partners</h1>
        <ChannelPartnersApp />
      </div>
    </BrowserRouter>
  </StrictMode>,
);
