import React, { useEffect, useRef, useState } from 'react';
import { Playlist } from './Playlist';
import { useFitElectronWindow } from '../../hooks/useFitElectronWindow';
import { PlaylistAction, PlaylistSyncState, Track } from '../../types/winamp';

const DEFAULT_WIDTH = 275;
const DEFAULT_HEIGHT = 232;

/**
 * Window entry point for the detached playlist (`?panel=playlist`).
 *
 * Track state is mirrored from the main window through the main process; the
 * playlist only renders the list and sends user intents back. This keeps the
 * audio engine and the real File objects in a single renderer.
 */
export const DetachedPlaylist: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useFitElectronWindow(rootRef);

  useEffect(() => {
    document.body.classList.add('wa-detached');
    document.title = 'WinAMP Playlist';
    return () => document.body.classList.remove('wa-detached');
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onPlaylistState) return;

    const unsubscribe = api.onPlaylistState((state: PlaylistSyncState) => {
      setTracks(
        state.tracks.map((track) => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
          duration: track.duration,
          url: track.url,
        }))
      );
      setCurrentTrackId(state.currentTrackId);
    });

    api.requestPlaylistState();
    return unsubscribe;
  }, []);

  // The playlist window has focus while detached, so it must drive playback
  // shortcuts itself instead of relying on the main window's key listener.
  useEffect(() => {
    const sendCommand = (type: 'toggle-play' | 'stop' | 'prev' | 'next' | 'pause') => {
      window.electronAPI?.sendPlaylistAction({ type });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          sendCommand('toggle-play');
          break;
        case 'v':
        case 'V':
          sendCommand('stop');
          break;
        case 'z':
        case 'Z':
          sendCommand('prev');
          break;
        case 'b':
        case 'B':
          sendCommand('next');
          break;
        case 'c':
        case 'C':
          sendCommand('pause');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const send = (action: PlaylistAction) => {
    window.electronAPI?.sendPlaylistAction(action);
  };

  const handleAddTracks = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    void Promise.all(
      files.map(async (file) => ({
        name: file.name,
        mime: file.type,
        data: await file.arrayBuffer(),
      }))
    ).then((payload) => send({ type: 'add-files', files: payload }));
  };

  return (
    <div ref={rootRef} className="w-fit bg-[#0d0e10]">
      <Playlist
        tracks={tracks}
        currentTrackId={currentTrackId}
        onSelectTrack={(track) => send({ type: 'select-track', trackId: track.id })}
        onAddTracks={handleAddTracks}
        onRequestAddUrl={() => send({ type: 'add-url' })}
        onRemoveTrack={(id) => send({ type: 'remove-track', trackId: id })}
        onClose={() => window.electronAPI?.closePlaylistWindow()}
        onAttach={() => window.electronAPI?.attachPlaylist()}
        width={width}
        height={height}
        onResize={(nextWidth, nextHeight) => {
          setWidth(nextWidth);
          setHeight(nextHeight);
        }}
      />
    </div>
  );
};
