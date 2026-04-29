/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion, useAnimation } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import {
  Heart,
  MapPin,
  Gift,
  Hotel,
  CheckCircle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle
} from 'lucide-react';

const FloralBorder = ({ className = '', flip = false, src }: { className?: string; flip?: boolean; src?: string }) => (
  <img 
    src={src || "https://images.unsplash.com/photo-1572454641328-3e4b785d0d8c?w=800&auto=format&fit=crop&q=80"} 
    alt="floral" 
    className={`w-full h-32 object-cover mix-blend-multiply opacity-80 ${flip ? 'rotate-180' : ''} ${className}`}
  />
);

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';
const Reveal = ({ children, className = '', delay = 0, direction = 'up', distance = 36 }: { children: React.ReactNode; className?: string; delay?: number; direction?: RevealDirection; distance?: number }) => {
  const initial =
    direction === 'up'    ? { opacity: 0, y:  distance } :
    direction === 'down'  ? { opacity: 0, y: -distance } :
    direction === 'left'  ? { opacity: 0, x: -distance } :
    direction === 'right' ? { opacity: 0, x:  distance } :
                            { opacity: 0 };
  const animate =
    direction === 'left' || direction === 'right' ? { opacity: 1, x: 0 } :
    direction === 'up'   || direction === 'down'  ? { opacity: 1, y: 0 } :
    { opacity: 1 };
  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
};

/** Animated thin horizontal rule that grows from center */
const GoldLine = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="h-[1px] bg-gradient-to-r from-transparent via-[#daaa77] to-transparent"
    initial={{ scaleX: 0, opacity: 0 }}
    whileInView={{ scaleX: 1, opacity: 1 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay }}
    style={{ transformOrigin: 'center' }}
  />
);

/** Animated sound-wave bars */
const SoundWave = ({ active }: { active: boolean }) => (
  <div className="flex items-end gap-[3px] h-5 mb-0">
    {[0.5, 1, 0.7, 1.2, 0.4, 1, 0.8].map((h, i) => (
      <motion.span
        key={i}
        className="w-[3px] rounded-full bg-white/70 origin-bottom"
        animate={active
          ? { scaleY: [h * 0.4, h, h * 0.6, h * 1.2, h * 0.5, h], opacity: [0.6, 1, 0.7, 1, 0.6, 1] }
          : { scaleY: 0.2, opacity: 0.3 }}
        transition={{ duration: 0.9 + i * 0.08, repeat: Infinity, ease: 'easeInOut', delay: i * 0.09 }}
        style={{ height: '20px' }}
      />
    ))}
  </div>
);

// Spotify IFrame Embed API types
declare global {
  interface Window {
    onSpotifyIframeApiReady: (api: any) => void;
  }
}

/** Convert a Spotify share URL or URI to a spotify: URI.
 *  Falls back to the default calm piano playlist. */
function toSpotifyUri(url: string | undefined): string {
  const DEFAULT = 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO'; // Peaceful Piano
  if (!url) return DEFAULT;
  if (url.startsWith('spotify:')) return url;
  const m = url.match(/open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/);
  return m ? `spotify:${m[1]}:${m[2]}` : DEFAULT;
}

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const spotifyApiRef = useRef<any>(null);      // stores IFrameAPI once ready
  const spotifyControllerRef = useRef<any>(null);
  const envelopeControls = useAnimation();

  // Start the envelope idle float animation
  useEffect(() => {
    envelopeControls.start(
      { y: [0, -10, 0] },
      { duration: 3, ease: 'easeInOut', repeat: Infinity }
    );
  }, [envelopeControls]);

  // Eagerly load the Spotify script on mount so the API is ready before the user clicks.
  // Also inject CSS + a MutationObserver to suppress the promo bar Spotify injects into <body>.
  useEffect(() => {
    // CSS kill-switch for the floating promo banner
    const style = document.createElement('style');
    style.textContent = [
      '#SpotifyPromotion',
      'div[id*="spotify-promotion"]',
      'div[class*="SpotifyPromotion"]',
      'div[class*="spotify-promotion"]',
    ].join(',') + '{ display:none!important; }';
    document.head.appendChild(style);

    // MutationObserver: hide any Spotify promo div added directly to <body>
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) {
            const id = node.id || '';
            const cls = node.className || '';
            if (
              (id && id !== 'spotify-embed-container' && id.toLowerCase().includes('spotify')) ||
              cls.toLowerCase().includes('promotion')
            ) {
              node.style.display = 'none';
            }
          }
        });
      });
    });
    observer.observe(document.body, { childList: true });

    // Store IFrameAPI reference when it becomes ready.
    // Delaying controller creation until user click solves strict Safari/iOS & Chrome autoplay blocks
    window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
      spotifyApiRef.current = IFrameAPI;
    };

    if (!document.getElementById('spotify-iframe-api')) {
      const script = document.createElement('script');
      script.id = 'spotify-iframe-api';
      script.src = 'https://open.spotify.com/embed/iframe-api/v1';
      script.async = true;
      document.head.appendChild(script);
    }

    return () => observer.disconnect();
  }, []);

  /** Called within the envelope click handler (user gesture) — plays the controller. */
  const initSpotify = (uri: string) => {
    if (!spotifyApiRef.current) return;

    if (!spotifyControllerRef.current) {
      const container = document.getElementById('spotify-embed-container');
      if (container) {
        // Create full controller directly during click event user gesture
        spotifyApiRef.current.createController(
          container,
          { uri: uri || 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO', width: '300', height: '80', theme: '0' },
          (controller: any) => {
            spotifyControllerRef.current = controller;
            controller.addListener('ready', () => {
              controller.play();
              setIsPlaying(true);
            });
            // Brute force play fallback
            setTimeout(() => {
              controller.play();
              setIsPlaying(true);
            }, 1500);
          }
        );
      }
    } else {
      const play = () => {
        spotifyControllerRef.current.play();
        setIsPlaying(true);
      };

      const isCustomUri = uri && uri !== 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO';
      if (isCustomUri) {
        spotifyControllerRef.current.loadUri(uri);
        spotifyControllerRef.current.addListener('ready', play);
        setTimeout(play, 1500);
      } else {
        play();
      }
    }
  };


  const [guestName, setGuestName] = useState<string | null>(null);
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guest = params.get('guest');
    if (guest) {
      setGuestName(guest);
    }
    fetch('/api/content')
      .then(res => res.json())
      .then(data => setContent(data))
      .catch(err => console.error("Could not load content", err));
  }, []);

  // Countdown logic
  const [targetTime, setTargetTime] = useState<number | null>(null);

  useEffect(() => {
    if (content && content.targetDate) {
      // Append :00 and the timezone offset +01:00 for Morocco time
      setTargetTime(new Date(`${content.targetDate}:00+01:00`).getTime());
    } else if (content) {
      // Default fallback
      setTargetTime(new Date('2026-12-06T17:00:00+01:00').getTime());
    }
  }, [content]);

  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });

  useEffect(() => {
    if (!targetTime) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetTime - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  if (!content) return null;

  let heroDateText = content.date || '';
  let uiMonth = 'Diciembre';
  let uiDayName = 'Sábado';
  let uiDay = '06';
  let uiYear = '2026';
  let uiTime = '17:00 hrs.';

  if (content.targetDate) {
    const [datePart, timePart] = content.targetDate.split('T');
    const [yy, mm, dd] = datePart.split('-');
    
    heroDateText = `${dd}.${mm}.${yy}`;

    const dateObj = new Date(Date.UTC(parseInt(yy), parseInt(mm) - 1, parseInt(dd)));
    
    const monthStr = dateObj.toLocaleDateString('fr-FR', { month: 'long', timeZone: 'UTC' });
    uiMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
    
    const dayStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
    uiDayName = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
    
    uiDay = dd;
    uiYear = yy;
    
    if (timePart) {
      uiTime = `${timePart} hrs.`;
    }
  }

  return (
    <div className="min-h-screen w-full bg-neutral-100 flex sm:items-center justify-center p-0 sm:p-4 md:p-8">
      <div className="w-full max-w-[100vw] sm:max-w-md md:max-w-lg lg:max-w-xl bg-paper min-h-[100dvh] sm:min-h-[850px] sm:max-h-[90vh] sm:rounded-2xl shadow-2xl overflow-x-hidden relative scroll-smooth flex flex-col text-neutral-800">
        {/* Hero Section */}
        <motion.div 
          className="relative w-full bg-burgundy flex flex-col items-center justify-center cursor-pointer shrink-0 z-50 overflow-hidden"
          animate={{ minHeight: isOpen ? '70vh' : '100dvh' }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          onClick={() => {
            if (!isOpening && !isOpen) {
              setIsOpening(true);
              // Use Spotify embed for music; fall back to <audio> for plain URLs
              if (!content?.musicUrl || content.musicUrl.includes('spotify') || content.musicUrl === '') {
                initSpotify(toSpotifyUri(content?.musicUrl));
              } else {
                audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
              }
              // Shake the envelope then scale it up as it opens
              envelopeControls.stop();
              envelopeControls.start(
                { x: [0, -7, 7, -5, 5, -2, 0], y: 0 },
                { duration: 0.5 }
              ).then(() => {
                envelopeControls.start(
                  { scale: 1.08, y: -8, x: 0 },
                  { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
                );
              });
              setTimeout(() => setIsOpen(true), 8500);
            }
          }}
        >
          <div className="text-center text-white mb-12 px-4">
            <motion.h1
              className="font-cursive text-6xl sm:text-8xl mb-2 leading-none"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            >{content.groomName}</motion.h1>
            <motion.p
              className="font-serif text-2xl sm:text-3xl italic mb-2"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: 'backOut', delay: 0.55 }}
            >&</motion.p>
            <motion.h1
              className="font-cursive text-6xl sm:text-8xl leading-none"
              initial={{ opacity: 0, y: -24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
            >{content.brideName}</motion.h1>
          </div>
          
          <motion.div 
            className="relative w-64 h-44 sm:w-80 sm:h-52 mt-12"
            animate={envelopeControls}
            whileHover={!isOpening && !isOpen ? { scale: 1.05 } : {}}
          >
            {/* Ambient pulsing rings — only visible before tap */}
            {!isOpening && !isOpen && (
              <>
                <motion.div
                  className="absolute -inset-3 rounded-lg border border-[#daaa77]/40 pointer-events-none"
                  animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.05, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute -inset-6 rounded-lg border border-[#daaa77]/20 pointer-events-none"
                  animate={{ opacity: [0, 0.6, 0], scale: [1, 1.09, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
                />
              </>
            )}
            {/* Envelope Back */}
            <div className="absolute inset-0 bg-[#3d1820] rounded-md shadow-xl border border-white/5" />

            {/* Inner Warm Glow — revealed as flap opens */}
            <motion.div
              className="absolute inset-0 rounded-md overflow-hidden pointer-events-none"
              style={{ zIndex: 4 }}
              initial={{ opacity: 0 }}
              animate={isOpening || isOpen ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 1.8, delay: 1.2 }}
            >
              <div className="w-full h-full" style={{ background: 'linear-gradient(to bottom, #fffbf0, #f5e6d0, #ede0c4)' }} />
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 70%, rgba(218,170,119,0.5) 0%, transparent 65%)' }} />
            </motion.div>

            {/* Letter */}
            <motion.div 
              className="absolute bottom-0 left-4 right-4 h-44 bg-white rounded-t-lg shadow-inner flex flex-col items-center justify-start pt-6 px-4 border border-neutral-200 overflow-hidden"
              style={{ 
                zIndex: 5,
                backgroundImage: `url("${content.letterBgImage}")`, 
                backgroundSize: 'cover'
              }}
              animate={isOpening || isOpen ? { y: -230, rotate: [0, -1.5, 1.5, -0.8, 0.4, 0] } : { y: 0, rotate: 0 }}
              transition={{ duration: 4.5, ease: [0.16, 1, 0.3, 1], delay: 1.5 }}
            >
               {guestName && (
                 <p className="font-serif text-burgundy text-center mb-2 italic text-lg leading-tight mix-blend-multiply opacity-90 drop-shadow-sm">Pour :<br/>{guestName}</p>
               )}
               {!guestName && (
                 <p className="font-serif text-burgundy text-center mb-2 italic text-lg leading-tight mix-blend-multiply opacity-90 drop-shadow-sm">Notre<br/>Mariage</p>
               )}
               {(!isOpening && !isOpen) && (
                 <p className="font-serif text-burgundy opacity-50 text-sm mt-4">Ouvrir l'invitation</p>
               )}
            </motion.div>

            {/* Paper Messages */}
            {isOpening && (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 6 }}>
                {[
                  { id: 1, content: (content.envelopeMsg1 || 'Bonjour {guest} !').replace('{guest}', guestName ? guestName.split(' ')[0] : 'Invité'), endX: -70, endY: -220, rotate: -15, delay: 2.5 },
                  { id: 2, content: content.envelopeMsg2 || 'Rejoignez-nous pour célébrer !', endX: 80, endY: -160, rotate: 10, delay: 4.0 },
                ].map((msg) => (
                  <motion.div
                    key={msg.id}
                    className="absolute top-[40%] left-1/2 text-[#3a1c22] px-6 py-4 rounded-sm shadow-2xl text-sm font-serif whitespace-nowrap flex items-center justify-center font-bold z-50 border border-[#e5d5c5]"
                    style={{
                      backgroundImage: `url("${content.paperBgImage}")`,
                      backgroundSize: 'cover',
                      boxShadow: '0 15px 30px rgba(0,0,0,0.4), inset 0 0 10px rgba(255,255,255,0.5)'
                    }}
                    initial={{ opacity: 0, scale: 0.2, x: '-50%', y: '-50%', filter: 'blur(12px)' }}
                    animate={{ 
                      opacity: [0, 1, 1], 
                      scale: [0.6, 1, 1], 
                      x: `calc(-50% + ${msg.endX}px)`, 
                      y: `calc(-50% + ${msg.endY}px)`, 
                      rotate: [0, msg.rotate, msg.rotate],
                      filter: ['blur(12px)', 'blur(0px)', 'blur(0px)']
                    }}
                    transition={{ duration: 3.0, delay: msg.delay, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="absolute inset-0 bg-white/40 mix-blend-overlay"></div>
                    <span className="relative z-10 text-lg drop-shadow-md mix-blend-multiply opacity-90">{msg.content}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Red Car Keepsake Photo */}
            {isOpening && (
              <motion.div
                className="absolute top-[40%] left-1/2 bg-white pb-6 p-2 rounded-sm shadow-2xl border border-neutral-200 pointer-events-none flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.2, x: '-50%', y: '-50%' }}
                animate={{ 
                  opacity: [0, 1, 1], 
                  scale: [0.5, 1, 1.1], 
                  x: `calc(-50% + 10px)`, 
                  y: `calc(-50% - 240px)`, 
                  rotate: [0, -5, 5] 
                }}
                transition={{ duration: 2.5, delay: 5.5, ease: 'easeOut' }}
                style={{ zIndex: 50 }}
              >
                 <img 
                   src={content.keepsakeImage} 
                   alt="Red Car Keepsake"
                   className="w-28 h-28 object-cover sepia-[.3]"
                 />
                 <span className="font-cursive text-xl sm:text-2xl text-burgundy/80 mt-2">Souvenirs</span>
              </motion.div>
            )}

            {/* Gold Sparkle Particles — burst from the seal as flap opens */}
            {isOpening && (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 25 }}>
                {[
                  { x: -55, y: -85, size: 6, delay: 1.80 },
                  { x:  65, y: -75, size: 4, delay: 1.95 },
                  { x: -28, y: -105, size: 5, delay: 2.05 },
                  { x:  42, y: -115, size: 3, delay: 2.15 },
                  { x: -72, y: -55, size: 4, delay: 2.25 },
                  { x:  85, y: -95, size: 6, delay: 2.35 },
                  { x:  12, y: -125, size: 3, delay: 2.00 },
                  { x: -18, y: -48, size: 5, delay: 1.88 },
                ].map((p, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full bg-[#daaa77]"
                    style={{ width: p.size, height: p.size, top: '30%', left: '50%', marginLeft: -(p.size / 2) }}
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 1, 0], x: p.x, y: p.y, scale: [0, 1.8, 1.2, 0] }}
                    transition={{ duration: 2.2, delay: p.delay, ease: 'easeOut' }}
                  />
                ))}
              </div>
            )}

            {/* Floating Hearts */}
            {isOpening && (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 25 }}>
                {[
                  { x: -42, y: -190, rotate: -15, delay: 2.8 },
                  { x:  52, y: -210, rotate:  10, delay: 3.3 },
                  { x:  -8, y: -230, rotate:  -5, delay: 3.8 },
                ].map((h, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-base select-none"
                    style={{ top: '35%', left: '50%', marginLeft: '-8px', color: '#daaa77' }}
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0, rotate: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      x: h.x,
                      y: h.y,
                      scale: [0, 1.3, 1, 0],
                      rotate: h.rotate,
                    }}
                    transition={{ duration: 3.0, delay: h.delay, ease: 'easeOut' }}
                  >
                    ♥
                  </motion.div>
                ))}
              </div>
            )}

            {/* Envelope Front (Left, Right, Bottom) */}
            <div 
              className="absolute inset-0 bg-[#63262f] rounded-md shadow-[0_-2px_10px_rgba(0,0,0,0.1)]"
              style={{ 
                clipPath: 'polygon(0 0, 50% 60%, 100% 0, 100% 100%, 0 100%)',
                zIndex: 10 
              }}
            >
              <div className="absolute inset-0 border-2 border-black/5 rounded-md pointer-events-none"></div>
            </div>

            {/* Envelope Top Flap
                 Perspective is on this direct parent — gives true 3D depth to rotateX */}
            <div
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '60%',
                perspective: '250px',
                perspectiveOrigin: 'top center',
                zIndex: isOpening || isOpen ? 2 : 20,
              }}
            >
              <motion.div
                className="absolute inset-0 bg-burgundy"
                style={{
                  clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
                  transformOrigin: 'top center',
                }}
                animate={isOpening || isOpen ? { rotateX: -180 } : { rotateX: 0 }}
                transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
              >
                {/* Wax seal — pops and spins as the flap unfolds */}
                <motion.div
                  className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-[1.5px] border-[#daaa77] bg-[#4a1c22] flex items-center justify-center"
                  animate={
                    isOpening || isOpen
                      ? { opacity: 0, scale: 1.6, rotate: 30 }
                      : { opacity: 1, scale: 1,   rotate: 0  }
                  }
                  transition={{ duration: 0.45, delay: 0.1, ease: 'easeIn' }}
                >
                  <span className="text-[#daaa77] text-xs font-serif font-bold tracking-widest mt-1">{content.groomName?.[0]}<span className="mx-[1px]">&</span>{content.brideName?.[0]}</span>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div
            className="mt-16 font-sans tracking-widest text-sm flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            <span className="text-white/80">{heroDateText}</span>
            <motion.div
              className="h-[1px] bg-gradient-to-r from-transparent via-[#daaa77] to-transparent w-32"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.1, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'center' }}
            />
            <AnimatePresence>
              {!isOpening && !isOpen && (
                <motion.span
                  key="prompt"
                  className="text-[#daaa77]/80 text-xs tracking-[0.25em] uppercase mt-2"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: [0, 1, 0.6, 1], y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut', delay: 1.5 }}
                >
                  Appuyez pour ouvrir
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Hidden audio element for non-Spotify URLs */}
        {content?.musicUrl && !content.musicUrl.includes('spotify') && (
          <audio
            ref={audioRef}
            src={content.musicUrl}
            loop
            preload="auto"
            className="hidden"
          />
        )}

        {/* Spotify IFrame Embed — rendered transparently in the DOM so browsers don't block autoplay, without showing a promo bar */}
        <div style={{ position: 'absolute', opacity: '0.001', pointerEvents: 'none', width: '300px', height: '80px', zIndex: -1 }} aria-hidden="true">
          <div id="spotify-embed-container" />
        </div>

        {/* Content Section */}
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="bg-paper flex flex-col items-center pb-20 w-full shrink-0"
          >
            {/* Top image/border space */}
            <FloralBorder src={content.floralImage} />
          
          <div className="px-8 text-center mt-8 w-full">
            <GoldLine delay={0.2} />
            <div className="py-8">
            <Reveal delay={0.1}>
              <p className="font-serif italic text-burgundy text-lg leading-relaxed mb-3">
                “{content.bibleVerse}”
              </p>
              <p className="text-sm font-sans text-burgundy/60 tracking-wider">{content.bibleVerseRef}</p>
            </Reveal>
            </div>
            <GoldLine delay={0.3} />
            
            <Reveal delay={0.15} className="py-10">
              <div className="flex items-center justify-center gap-6 my-2">
                <motion.span
                  className="font-serif text-5xl text-burgundy"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                >{content.groomName ? content.groomName[0] : 'M'}</motion.span>
                <motion.div
                  className="w-[1px] bg-gradient-to-b from-transparent via-burgundy to-transparent"
                  initial={{ height: 0 }}
                  whileInView={{ height: 48 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.span
                  className="font-serif text-5xl text-burgundy"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                >{content.brideName ? content.brideName[0] : 'M'}</motion.span>
              </div>
            </Reveal>

            <GoldLine delay={0.1} />
            <Reveal delay={0.1} className="py-6">
              <h2 className="font-sans tracking-[0.3em] text-xs text-burgundy/70 font-medium">
                NOUS NOUS MARIONS !
              </h2>
            </Reveal>
            <GoldLine delay={0.15} />
            
            {/* Hugging image — wipe reveal from bottom + corner ornaments + caption */}
            <div className="mt-10 relative w-full">
              {/* Top-left corner bracket */}
              <div className="absolute -top-3 -left-3 w-12 h-12 pointer-events-none z-10">
                <motion.svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                  <motion.path d="M 46 2 L 2 2 L 2 46" stroke="#daaa77" strokeWidth="1.5" strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.85 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.0, delay: 1.1, ease: 'easeOut' }}
                  />
                </motion.svg>
              </div>
              {/* Bottom-right corner bracket */}
              <div className="absolute -bottom-3 -right-3 w-12 h-12 pointer-events-none z-10">
                <motion.svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                  <motion.path d="M 2 46 L 46 46 L 46 2" stroke="#daaa77" strokeWidth="1.5" strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.85 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.0, delay: 1.3, ease: 'easeOut' }}
                  />
                </motion.svg>
              </div>

              {/* Clip-path wipe: curtain lifts from bottom upward */}
              <motion.div
                className="relative w-full overflow-hidden bg-neutral-200"
                style={{ aspectRatio: '4/5' }}
                initial={{ clipPath: 'inset(100% 0 0 0)' }}
                whileInView={{ clipPath: 'inset(0% 0 0 0)' }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.img
                  src={content.huggingImage}
                  alt="Couple hugging"
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ scale: 1.14 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
                />
                {/* Warm bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#3d1820]/55 to-transparent pointer-events-none" />
                {/* Caption slide up */}
                <motion.div
                  className="absolute bottom-5 w-full text-center"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 1.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="font-cursive text-2xl text-white/90 drop-shadow-lg">
                    {content.groomName} &amp; {content.brideName}
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </div>

          <FloralBorder className="mt-8 opacity-60" flip src={content.floralImage} />

          {/* Music and Parents Section */}
          <div className="bg-burgundy w-full py-16 text-white text-center flex flex-col items-center relative overflow-hidden">
            {/* Subtle radial glow in background */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(218,170,119,0.12) 0%, transparent 70%)' }} />

            <Reveal><p className="font-serif italic text-lg mb-3">Écoutez notre chanson</p></Reveal>
            <Reveal delay={0.05}><div className="mb-6"><SoundWave active={isPlaying} /></div></Reveal>
            
            <Reveal delay={0.1}>
              <div className="flex items-center justify-center gap-6 mb-14">
                <Shuffle className="w-4 h-4 opacity-40 cursor-pointer" />
                <SkipBack className="w-5 h-5 opacity-70 cursor-pointer hover:opacity-100 transition-opacity" />
                {/* Pulsing ring around play button */}
                <div className="relative">
                  {isPlaying && (
                    <motion.div
                      className="absolute inset-0 rounded-full border border-white/50"
                      animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  <button 
                    className="relative w-12 h-12 rounded-full border border-white flex items-center justify-center hover:bg-white/10 transition-colors z-10"
                    onClick={() => {
                      if (spotifyControllerRef.current) {
                        try {
                          if (isPlaying) spotifyControllerRef.current.pause();
                          else spotifyControllerRef.current.resume();
                        } catch (_) {}
                      } else {
                        if (isPlaying) audioRef.current?.pause();
                        else audioRef.current?.play().catch(() => {});
                      }
                      setIsPlaying(prev => !prev);
                    }}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                  </button>
                </div>
                <SkipForward className="w-5 h-5 opacity-70 cursor-pointer hover:opacity-100 transition-opacity" />
                <Repeat className="w-4 h-4 opacity-40 cursor-pointer" />
              </div>
            </Reveal>

            <Reveal delay={0.1}><p className="font-serif text-lg leading-relaxed px-8 mb-10">
              Avec l'amour qui nous unit, la bénédiction<br/>
              de Dieu et le soutien de nos parents :
            </p></Reveal>

            <Reveal delay={0.2}><div className="font-serif italic text-white/90 space-y-6">
              <div>
                <p>{content.groomMother}</p>
                <p>{content.groomFather}</p>
              </div>
              <motion.p
                className="text-xl"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >&</motion.p>
              <div>
                <p>{content.brideMother}</p>
                <p>{content.brideFather}</p>
              </div>
            </div></Reveal>

            <Reveal delay={0.1}><p className="font-sans text-xs uppercase tracking-widest mt-12 px-8 leading-loose opacity-70">
              Nous unirons nos vies par le<br/>
              sacrement du mariage
            </p></Reveal>
          </div>

          {/* Countdown Section */}
          <div className="bg-[#4a1c22] w-full py-14 text-white border-b border-white/10 overflow-hidden">
            <div className="flex flex-col items-center text-center">
              <Reveal direction="none">
                <p className="font-sans tracking-[0.3em] text-xs uppercase mb-5 opacity-60">{uiMonth}</p>
              </Reveal>
              <Reveal delay={0.05}>
                <div className="flex items-center justify-center gap-4 sm:gap-6 w-full px-6 sm:px-12 mb-10">
                  <span className="font-sans text-xs uppercase tracking-wider w-1/4 text-right opacity-70">{uiDayName}</span>
                  <span className="font-serif text-5xl sm:text-6xl italic border-y border-white/20 py-2 w-1/2">{uiDay}</span>
                  <span className="font-sans text-xs tracking-wider w-1/4 text-left opacity-70">{uiYear}</span>
                </div>
              </Reveal>
              
              <Reveal direction="none" delay={0.1}><GoldLine /></Reveal>
              <Reveal direction="none" delay={0.15}><p className="font-sans tracking-widest text-xs uppercase my-5 opacity-60">Il reste</p></Reveal>
              <Reveal direction="none" delay={0.1}><GoldLine /></Reveal>
              
              <div className="flex justify-center gap-3 sm:gap-6 font-serif text-3xl sm:text-4xl mt-8 mb-2">
                {[
                  { value: timeLeft.days,    label: 'Jours' },
                  { value: timeLeft.hours,   label: 'Heures' },
                  { value: timeLeft.minutes, label: 'Min' },
                  { value: timeLeft.seconds, label: 'Sec' },
                ].map((unit, idx) => (
                  <React.Fragment key={unit.label}>
                    {idx > 0 && <span className="opacity-40 self-start mt-1">:</span>}
                    <motion.div
                      className="flex flex-col items-center min-w-[3ch]"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.2 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span>{String(unit.value).padStart(2, '0')}</span>
                      <span className="font-sans text-[9px] tracking-wider uppercase mt-1 opacity-50">{unit.label}</span>
                    </motion.div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <FloralBorder src={content.floralImage} />

          {/* Location & Itinerary */}
          <div className="w-full px-8 flex flex-col items-center mt-8">
            {/* Outdoor image — wipe reveal left-to-right + shimmer sweep + corner ornaments */}
            <div className="relative w-full mb-16">
              {/* Top-right corner bracket */}
              <div className="absolute -top-3 -right-3 w-12 h-12 pointer-events-none z-10">
                <motion.svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                  <motion.path d="M 2 2 L 46 2 L 46 46" stroke="#daaa77" strokeWidth="1.5" strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.85 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.0, delay: 1.1, ease: 'easeOut' }}
                  />
                </motion.svg>
              </div>
              {/* Bottom-left corner bracket */}
              <div className="absolute -bottom-3 -left-3 w-12 h-12 pointer-events-none z-10">
                <motion.svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                  <motion.path d="M 2 2 L 2 46 L 46 46" stroke="#daaa77" strokeWidth="1.5" strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.85 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.0, delay: 1.3, ease: 'easeOut' }}
                  />
                </motion.svg>
              </div>

              {/* Clip-path wipe: curtain slides from right edge leftward */}
              <motion.div
                className="relative w-full overflow-hidden bg-neutral-200"
                style={{ aspectRatio: '4/5' }}
                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.img
                  src={content.outdoorImage}
                  alt="Couple outdoor walking"
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ scale: 1.14 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
                />
                {/* Shimmer sweep — fires once after image appears */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)' }}
                  initial={{ x: '-120%' }}
                  whileInView={{ x: '160%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, delay: 1.15, ease: 'easeInOut' }}
                />
                {/* Subtle vignette */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#3d1820]/35 pointer-events-none" />
              </motion.div>
            </div>

            <Reveal><div className="flex flex-col items-center text-center text-burgundy mb-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: 'backOut', delay: 0.1 }}
              >
                <MapPin className="w-10 h-10 stroke-1 mb-4 opacity-80" />
              </motion.div>
              <p className="font-serif text-xl mb-2">{uiTime}</p>
              <h3 className="font-sans font-medium tracking-[0.2em] mb-2">RÉCEPTION</h3>
              <p className="font-serif text-xl mb-1 relative inline-block">
                {content.venueName}
                <motion.span
                  className="absolute bottom-0 left-0 h-[1px] bg-burgundy/40"
                  initial={{ width: 0 }}
                  whileInView={{ width: '100%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </p>
              <p className="font-sans text-sm opacity-70 mt-2 mb-6">{content.venueCity}</p>
              
              <motion.a 
                href={`https://www.google.com/maps/search/?api=1&query=${content.mapCoordinates || '-17.781617,-63.179379'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-burgundy text-white font-sans text-sm tracking-wider px-8 py-3 rounded-full hover:bg-[#4a1c22] transition-colors inline-block"
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(74,28,34,0.4)' }}
                whileTap={{ y: 0 }}
                transition={{ duration: 0.2 }}
              >
                Voir l'emplacement
              </motion.a>
            </div></Reveal>

            <Reveal><h3 className="font-sans font-medium tracking-[0.1em] text-burgundy text-sm mb-16">ITINÉRAIRE DES ACTIVITÉS</h3></Reveal>
            
            <div className="relative w-full max-w-[280px] mb-16">
              {/* Center Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-burgundy/30 -translate-x-1/2"></div>
              
              {[
                { time: '14:30', name: 'CÉRÉMONIE', right: true, icon: <svg className="w-6 h-6 fill-burgundy bg-paper p-1" viewBox="0 0 24 24"><path d="M11 2v4H8v2h3v14h2V8h3V6h-3V2h-2z"/></svg> },
                { time: '16:30', name: 'RÉCEPTION', right: false, icon: <svg className="w-5 h-5 stroke-burgundy stroke-[1.5] fill-none bg-paper p-1" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> },
                { time: '17:30', name: 'VIN D\'HONNEUR', right: true, icon: <svg className="w-5 h-5 stroke-burgundy stroke-[1.5] fill-none bg-paper" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.5 3a2.5 2.5 0 0 0-5 0V8c0 1.5 1.5 3 2.5 3s2.5-1.5 2.5-3V3z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13 11v8"/><path strokeLinecap="round" strokeLinejoin="round" d="M10 19h6"/><path strokeLinecap="round" strokeLinejoin="round" d="M6 3v2"/></svg> },
                { time: '18:00', name: 'BANQUET', right: false, icon: <svg className="w-5 h-5 stroke-burgundy stroke-[1.5] fill-none bg-paper p-[2px]" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg> },
                { time: '19:30', name: 'FÊTE', right: true, icon: <svg className="w-5 h-5 stroke-burgundy stroke-[1.5] fill-none bg-paper p-[2px]" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
                { time: '21:00', name: 'HEURE FOLLE', right: false, icon: <svg className="w-5 h-5 stroke-burgundy stroke-[1.5] fill-none bg-paper p-[2px]" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> },
                { time: '23:30', name: 'FIN', right: true, icon: <svg className="w-5 h-5 stroke-burgundy stroke-[1.5] fill-none bg-paper p-[2px]" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
              ].map((item, idx) => (
                <Reveal key={idx} direction={item.right ? 'right' : 'left'} delay={idx * 0.07}>
                <div className="relative flex items-center justify-between w-full mb-10 last:mb-0">
                  {/* Left Side */}
                  <div className={`w-1/2 pr-6 text-right ${item.right ? 'invisible' : ''}`}>
                    <span className="font-serif font-bold text-lg leading-none block text-burgundy">{item.time}</span>
                    <span className="font-sans text-[10px] tracking-widest mt-1 block text-burgundy/80">{item.name}</span>
                  </div>
                  
                  {/* Center Icon */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
                    {item.icon}
                  </div>

                  {/* Right Side */}
                  <div className={`w-1/2 pl-6 text-left ${!item.right ? 'invisible' : ''}`}>
                    <span className="font-serif font-bold text-lg leading-none block text-burgundy">{item.time}</span>
                    <span className="font-sans text-[10px] tracking-widest mt-1 block text-burgundy/80">{item.name}</span>
                  </div>
                </div>
                </Reveal>
              ))}
            </div>

            <Reveal><div className="flex flex-col items-center text-center text-burgundy w-full mb-8">
              <h3 className="font-sans font-medium tracking-[0.1em] text-sm mb-3">CODE VESTIMENTAIRE</h3>
              <p className="font-serif italic text-lg mb-5">{content.dressCode}</p>
              
              <motion.div
                initial={{ opacity: 0, rotate: -30, scale: 0.6 }}
                whileInView={{ opacity: 1, rotate: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: 'backOut', delay: 0.1 }}
              >
                <div className="flex justify-center mb-5">
                <svg className="w-16 h-16 fill-burgundy" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 2a2 2 0 100 4 2 2 0 000-4zM5.5 7A1.5 1.5 0 004 8.5v4A1.5 1.5 0 005.5 14H6v7.5a.5.5 0 001 0v-7h.5v7a.5.5 0 001 0V14h.5a1.5 1.5 0 001.5-1.5v-4A1.5 1.5 0 009 7H8l-1 2-1-2H5.5zm11.5-5a2 2 0 100 4 2 2 0 000-4zM16 7c-1.38 0-2.5 1.12-2.5 2.5V11c0 1.05.65 1.95 1.57 2.34L13 21.5a.5.5 0 00.91.41L15.39 18l.8 3.55a.5.5 0 00.98-.06l.82-5.74V22.5a.5.5 0 00.95.2l2-6a.5.5 0 00-.95-.32l-1.5 4.5v-5.14c.92-.39 1.57-1.29 1.57-2.34V9.5C18.5 8.12 17.38 7 16 7zm-1 3h2v1h-2v-1z"/>
                </svg>
              </div>              </motion.div>              
              <p className="font-serif text-sm opacity-90 max-w-[80%] mx-auto pb-4">
                Avec beaucoup d'affection, nous vous demandons d'éviter les vêtements blancs.
              </p>
            </div></Reveal>
          </div>

          <FloralBorder flip src={content.floralImage} />

          {/* Bottom Call to Actions */}
          <div className="bg-[#4a1c22] w-full py-16 text-white text-center flex flex-col items-center overflow-hidden">
            {/* Ambient top glow */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#daaa77]/40 to-transparent mb-14" />

            <Reveal><div className="mb-14 px-8">
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: 'backOut' }}
              >
                <Gift className="w-8 h-8 stroke-1 mx-auto mb-4" />
              </motion.div>
              <h3 className="font-sans tracking-wide text-sm mb-4">SUGGESTION DE CADEAUX</h3>
              <p className="font-serif text-sm opacity-80 max-w-[80%] mx-auto mb-6">
                Le meilleur cadeau est votre présence, mais si vous souhaitez nous offrir quelque chose, voici une option :
              </p>
              <p className="font-sans text-xs tracking-widest uppercase mb-2 opacity-60">Urne nuptiale</p>
              <svg className="w-6 h-6 mx-auto stroke-white stroke-1 bg-transparent" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
            </div></Reveal>

            <div className="w-[80%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mb-14" />

            <Reveal delay={0.1}><div className="mb-14 min-w-[80%]">
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: 'backOut', delay: 0.05 }}
              >
                <Hotel className="w-8 h-8 stroke-1 mx-auto mb-4" />
              </motion.div>
              <h3 className="font-sans tracking-wide text-sm mb-6">SUGGESTION D'HÉBERGEMENT</h3>
              
              {content.hotel1Name && (
                <div className="mb-6">
                  <p className="font-serif text-lg mb-2">{content.hotel1Name}</p>
                  {content.hotel1Url ? (
                    <motion.a href={content.hotel1Url} target="_blank" rel="noopener noreferrer"
                      className="border border-white/60 text-white rounded-full px-6 py-1 text-xs font-sans hover:bg-white hover:text-burgundy transition-colors inline-block"
                      whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                      Plus d'informations
                    </motion.a>
                  ) : (
                    <button className="border border-white/20 text-white/40 rounded-full px-6 py-1 text-xs font-sans cursor-default">
                      Plus d'informations
                    </button>
                  )}
                </div>
              )}
              {content.hotel2Name && (
                <div>
                  <p className="font-serif text-lg mb-2">{content.hotel2Name}</p>
                  {content.hotel2Url ? (
                    <motion.a href={content.hotel2Url} target="_blank" rel="noopener noreferrer"
                      className="border border-white/60 text-white rounded-full px-6 py-1 text-xs font-sans hover:bg-white hover:text-burgundy transition-colors inline-block"
                      whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                      Plus d'informations
                    </motion.a>
                  ) : (
                    <button className="border border-white/20 text-white/40 rounded-full px-6 py-1 text-xs font-sans cursor-default">
                      Plus d'informations
                    </button>
                  )}
                </div>
              )}
            </div></Reveal>

            <div className="w-[80%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mb-14" />

            <Reveal delay={0.1}><div className="mb-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: 'backOut', delay: 0.05 }}
              >
                <Heart className="w-8 h-8 stroke-1 mx-auto mb-4" />
              </motion.div>
              <h3 className="font-sans tracking-wide text-sm mb-4">CONFIRMER LA PRÉSENCE</h3>
              <p className="font-serif text-sm opacity-80 max-w-[80%] mx-auto mb-6">
                Nous vous remercions de confirmer votre présence avant le {content.rsvpDeadline}
              </p>
              <motion.button
                className="border-2 border-white text-white rounded-full px-8 py-2 text-sm font-sans hover:bg-white hover:text-burgundy transition-colors"
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(255,255,255,0.2)' }}
                whileTap={{ y: 0 }}
              >
                Confirmer ici
              </motion.button>
            </div></Reveal>

            <div className="w-[80%] h-[1px] bg-gradient-to-r from-transparent via-[#daaa77]/40 to-transparent mb-10" />

            <Reveal delay={0.05}><p className="font-sans text-xs tracking-widest uppercase opacity-50 mb-6">
              Nous espérons compter sur votre présence
            </p></Reveal>

            {/* "Merci Beaucoup" with breathing gold glow */}
            <Reveal delay={0.15}>
              <div className="relative">
                <motion.div
                  className="absolute inset-0 rounded-full blur-2xl bg-[#daaa77]/20"
                  animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.1, 0.9] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.p
                  className="relative font-cursive text-4xl sm:text-5xl text-[#daaa77]"
                  animate={{ textShadow: ['0 0 0px #daaa77', '0 0 20px #daaa7780', '0 0 0px #daaa77'] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  Merci Beaucoup !
                </motion.p>
              </div>
            </Reveal>

            <div className="w-[80%] h-[1px] bg-gradient-to-r from-transparent via-[#daaa77]/30 to-transparent mt-10" />
          </div>
          
          <FloralBorder src={content.floralImage} />

          {/* Holding-hands image — wipe reveal top-to-bottom + all 4 corners + caption */}
          <div className="w-full px-8 pb-12 flex justify-center -mt-[30px] relative z-10">
            <div className="relative w-full">
              {/* All four corner brackets */}
              {([
                { pos: '-top-3 -left-3',    d: 'M 46 2 L 2 2 L 2 46',   delay: 1.0 },
                { pos: '-top-3 -right-3',   d: 'M 2 2 L 46 2 L 46 46',  delay: 1.1 },
                { pos: '-bottom-3 -left-3', d: 'M 2 2 L 2 46 L 46 46',  delay: 1.2 },
                { pos: '-bottom-3 -right-3',d: 'M 2 46 L 46 46 L 46 2', delay: 1.3 },
              ] as { pos: string; d: string; delay: number }[]).map((c, i) => (
                <div key={i} className={`absolute ${c.pos} w-12 h-12 pointer-events-none z-10`}>
                  <motion.svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                    <motion.path d={c.d} stroke="#daaa77" strokeWidth="1.5" strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 0.9 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.0, delay: c.delay, ease: 'easeOut' }}
                    />
                  </motion.svg>
                </div>
              ))}

              {/* Clip-path wipe: curtain drops from top downward */}
              <motion.div
                className="relative w-full overflow-hidden rounded-sm bg-neutral-200"
                style={{ aspectRatio: '4/5' }}
                initial={{ clipPath: 'inset(0 0 100% 0)' }}
                whileInView={{ clipPath: 'inset(0 0 0% 0)' }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.img
                  src={content.holdingHandsImage}
                  alt="Couple holding hands"
                  className="absolute inset-0 w-full h-full object-cover shadow-md"
                  initial={{ scale: 1.14 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
                />
                {/* Shimmer sweep */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(75deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)' }}
                  initial={{ x: '-120%' }}
                  whileInView={{ x: '160%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, delay: 1.2, ease: 'easeInOut' }}
                />
                {/* Bottom gradient + caption */}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#3d1820]/60 to-transparent pointer-events-none" />
                <motion.div
                  className="absolute bottom-5 w-full text-center"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 1.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="font-cursive text-2xl text-white/85 drop-shadow-lg">Pour toujours</p>
                </motion.div>
              </motion.div>
            </div>
          </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default App;
