import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { DetachedPlaylist } from './components/Playlist/DetachedPlaylist';
import './index.css';

const panel = new URLSearchParams(window.location.search).get('panel');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {panel === 'playlist' ? <DetachedPlaylist /> : <App />}
  </React.StrictMode>
);
