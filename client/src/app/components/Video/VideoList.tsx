"use client";

import { useContext, useEffect, useRef, useState } from 'react';
import AuthContext from '../../context/AuthContext';
import VideoItem from './VideoItem';

const VideoList = () => {
  const authContext = useContext(AuthContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userInteracted, setUserInteracted] = useState(false);

  if (!authContext) {
    return <div>Error: AuthContext not found</div>;
  }

  const { getVideos, videos } = authContext;

  useEffect(() => {
    getVideos();
  }, []);

  const handleScroll = (direction: 'up' | 'down') => {
    const container = containerRef.current;
    if (container) {
      const scrollAmount = direction === 'up' ? -window.innerHeight : window.innerHeight;
      container.scrollBy({
        top: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (videos.length === 0) {
    return <div>Loading videos...</div>;
  }

  return (
    <div className="relative h-screen overflow-hidden">
      <div
        className="video-list h-full overflow-y-scroll snap-y snap-mandatory"
        ref={containerRef}
        onClick={() => setUserInteracted(true)}
      >
        {videos.map((video) => (
          <VideoItem key={video.id} video={video} />
        ))}
      </div>
      <div className="absolute top-1/2 left-0 transform -translate-y-1/2">
        <button
          className="bg-gray-800 text-white p-2 rounded-full"
          onClick={() => handleScroll('up')}
        >
          ↑
        </button>
      </div>
      <div className="absolute bottom-1/2 left-0 transform translate-y-1/2">
        <button
          className="bg-gray-800 text-white p-2 rounded-full"
          onClick={() => handleScroll('down')}
        >
          ↓
        </button>
      </div>
    </div>
  );
};

export default VideoList;
