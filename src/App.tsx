/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useRef, useState, useCallback } from 'react';
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

type RevealDirection = 'up' | 'left' | 'right' | 'none';
const Reveal = ({ children, className = '', delay = 0, direction = 'up' }: { children: React.ReactNode; className?: string; delay?: number; direction?: RevealDirection }) => {
  const initial =
    direction === 'up'    ? { opacity: 0, y: 36 } :
    direction === 'left'  ? { opacity: 0, x: -36 } :
    direction === 'right' ? { opacity: 0, x: 36 } :
                            { opacity: 0 };
  const animate = direction === 'up' ? { opacity: 1, y: 0 } :
                  direction === 'left' || direction === 'right' ? { opacity: 1, x: 0 } :
                  { opacity: 1 };
  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
};

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReady = useRef(false);
  const pendingPlay = useRef(false);

  const sendYTCommand = useCallback((cmd: string, args: any[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: cmd, args }),
      '*'
    );
  }, []);

  // Listen for YouTube player ready event
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'onReady' || data?.info !== undefined) {
          iframeReady.current = true;
          if (pendingPlay.current) {
            pendingPlay.current = false;
            sendYTCommand('unMute');
            sendYTCommand('setVolume', [100]);
          }
        }
      } catch {}
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [sendYTCommand]);

  const getYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)([^&\s?#]+)/,
      /youtube\.com\/embed\/([^&\s?#]+)/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
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
              setIsPlaying(true);
              // Unmute the already-playing (muted) video — no user gesture needed for this
              if (iframeReady.current) {
                sendYTCommand('unMute');
                sendYTCommand('setVolume', [100]);
              } else {
                // iframe not ready yet — set flag so onMessage handler will unmute when ready
                pendingPlay.current = true;
              }
              setTimeout(() => setIsOpen(true), 8500);
            }
          }}
        >
          <div className="text-center text-white mb-12 px-4">
            <h1 className="font-cursive text-6xl sm:text-8xl mb-2 leading-none">{content.groomName}</h1>
            <p className="font-serif text-2xl sm:text-3xl italic mb-2">&</p>
            <h1 className="font-cursive text-6xl sm:text-8xl leading-none">{content.brideName}</h1>
          </div>
          
          <motion.div 
            className="relative w-60 h-40 sm:w-72 sm:h-48 mt-12"
            style={{ perspective: '1200px' }}
            whileHover={!isOpening && !isOpen ? { scale: 1.05 } : {}}
            animate={!isOpening && !isOpen ? { y: [0, -10, 0] } : { y: 0 }}
            transition={{ repeat: !isOpening && !isOpen ? Infinity : 0, duration: 3, ease: 'easeInOut' }}
          >
            {/* Envelope Back */}
            <div className="absolute inset-0 bg-[#4a1c22] rounded-md shadow-xl border border-white/5"></div>

            {/* Letter */}
            <motion.div 
              className="absolute bottom-4 left-4 right-4 h-40 bg-white rounded-t-lg shadow-inner flex flex-col items-center justify-start pt-6 px-4 border border-neutral-200 overflow-hidden"
              style={{ 
                zIndex: 5,
                backgroundImage: `url("${content.letterBgImage}")`, 
                backgroundSize: 'cover'
              }}
              animate={isOpening || isOpen ? { y: -180 } : { y: 0 }}
              transition={{ duration: 4.0, ease: [0.16, 1, 0.3, 1], delay: 1.5 }}
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
                  { id: 1, content: `Bonjour ${guestName ? guestName.split(' ')[0] : 'Invité'} !`, endX: -70, endY: -220, rotate: -15, delay: 2.5 },
                  { id: 2, content: `Rejoignez-nous pour célébrer !`, endX: 80, endY: -160, rotate: 10, delay: 4.0 },
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

            {/* Envelope Top Flap */}
            <motion.div 
              className="absolute top-0 left-0 w-full h-[60%] bg-burgundy"
              style={{ 
                clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
                transformOrigin: 'top center',
                zIndex: 20
              }}
              initial={{ rotateX: 0 }}
              animate={isOpening || isOpen ? { rotateX: -180, zIndex: 2 } : { rotateX: 0, zIndex: 20 }}
              transition={{ duration: 2.5, ease: 'easeInOut' }}
            >
              {/* Flap details */}
              <motion.div 
                className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-[1.5px] border-[#daaa77] bg-[#4a1c22] flex items-center justify-center"
                initial={{ opacity: 1 }}
                animate={isOpening || isOpen ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.1, delay: 0 }}
              >
                 <span className="text-[#daaa77] text-xs font-serif font-bold tracking-widest mt-1">{content.groomName?.[0]}<span className="mx-[1px]">&</span>{content.brideName?.[0]}</span>
              </motion.div>
            </motion.div>
          </motion.div>
          
          <div className="mt-16 text-white/80 font-sans tracking-widest text-sm">
            {heroDateText}
          </div>
        </motion.div>

        {/* Hidden YouTube iframe — must stay outside isOpen guard so it exists on first click */}
        {content?.musicUrl && (() => {
          const videoId = getYouTubeVideoId(content.musicUrl);
          if (!videoId) return null;
          return (
            <iframe
              ref={iframeRef}
              className="absolute w-0 h-0 pointer-events-none"
              src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&loop=1&playlist=${videoId}&controls=0&mute=1`}
              allow="autoplay"
              title="background-music"
            />
          );
        })()}

        {/* Content Section */}
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="bg-paper flex flex-col items-center pb-20 w-full shrink-0"
          >
            {/* Top image/border space */}
            <FloralBorder src={content.floralImage} />
          
          <div className="px-8 text-center mt-6">
            <Reveal delay={0.1}>
              <p className="font-serif italic text-burgundy text-lg leading-relaxed mb-6">
                "{content.bibleVerse}"<br/>
                <span className="text-sm font-sans block mt-2">{content.bibleVerseRef}</span>
              </p>
            </Reveal>
            
            <Reveal delay={0.2}>
              <div className="flex items-center justify-center gap-4 my-8">
                <span className="font-serif text-5xl text-burgundy">{content.groomName ? content.groomName[0] : 'M'}</span>
                <div className="w-[1px] h-12 bg-burgundy"></div>
                <span className="font-serif text-5xl text-burgundy">{content.brideName ? content.brideName[0] : 'M'}</span>
              </div>
            </Reveal>
            
            <Reveal delay={0.1}>
              <h2 className="font-sans tracking-[0.2em] text-sm text-burgundy/80 font-medium mb-12">
                NOUS NOUS MARIONS !
              </h2>
            </Reveal>
            
            <Reveal direction="none" delay={0}>
              <motion.img
                src={content.huggingImage}
                alt="Couple hugging"
                className="w-full aspect-[4/5] object-cover bg-neutral-200"
                initial={{ opacity: 0, scale: 1.04 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </Reveal>
          </div>

          <FloralBorder className="mt-8 opacity-60" flip src={content.floralImage} />

          {/* Music and Parents Section */}
          <div className="bg-burgundy w-full py-16 text-white text-center flex flex-col items-center relative">
            <Reveal><p className="font-serif italic text-lg mb-6">Écoutez notre chanson</p></Reveal>
            
            <Reveal delay={0.1}><div className="flex items-center justify-center gap-6 mb-16">
              <Shuffle className="w-4 h-4 opacity-70 cursor-pointer" />
              <SkipBack className="w-5 h-5 cursor-pointer" />
              <button 
                className="w-12 h-12 rounded-full border border-white flex items-center justify-center hover:bg-white/10 transition-colors"
                onClick={() => {
                  if (isPlaying) {
                    sendYTCommand('pauseVideo');
                  } else {
                    sendYTCommand('playVideo');
                    sendYTCommand('unMute');
                    sendYTCommand('setVolume', [100]);
                  }
                  setIsPlaying(prev => !prev);
                }}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </button>
              <SkipForward className="w-5 h-5 cursor-pointer" />
              <Repeat className="w-4 h-4 opacity-70 cursor-pointer" />
            </div></Reveal>

            <Reveal delay={0.1}><p className="font-serif text-lg leading-relaxed px-8 mb-10">
              Avec l'amour qui nous unit, la bénédiction<br/>
              de Dieu et le soutien de nos parents :
            </p></Reveal>

            <Reveal delay={0.2}><div className="font-serif italic text-white/90 space-y-6">
              <div>
                <p>{content.groomMother}</p>
                <p>{content.groomFather}</p>
              </div>
              <p className="text-xl">&</p>
              <div>
                <p>{content.brideMother}</p>
                <p>{content.brideFather}</p>
              </div>
            </div></Reveal>

            <Reveal delay={0.1}><p className="font-sans text-xs uppercase tracking-widest mt-12 px-8 leading-loose opacity-80">
              Nous unirons nos vies par le<br/>
              sacrement du mariage
            </p></Reveal>
          </div>

          {/* Countdown Section */}
          <Reveal direction="none" className="w-full">
          <div className="bg-[#4a1c22] w-full py-12 text-white border-b border-white/10">
            <div className="flex flex-col items-center text-center">
              <p className="font-sans tracking-widest text-xs uppercase mb-4 opacity-80">{uiMonth}</p>
              <div className="flex items-center justify-center gap-4 sm:gap-6 w-full px-6 sm:px-12 mb-10">
                <span className="font-sans text-xs uppercase tracking-wider w-1/4 text-right">{uiDayName}</span>
                <span className="font-serif text-5xl sm:text-6xl italic border-y border-white/20 py-2 w-1/2">{uiDay}</span>
                <span className="font-sans text-xs tracking-wider w-1/4 text-left">{uiYear}</span>
              </div>
              
              <p className="font-sans tracking-widest text-xs uppercase mb-6">Il reste</p>
              
              <div className="flex justify-center gap-3 sm:gap-6 font-serif text-3xl sm:text-4xl mb-2">
                <div className="flex flex-col items-center">
                  <span>{String(timeLeft.days).padStart(2, '0')}</span>
                  <span className="font-sans text-[10px] tracking-wider uppercase mt-1 opacity-70">Jours</span>
                </div>
                <span>:</span>
                <div className="flex flex-col items-center">
                  <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="font-sans text-[10px] tracking-wider uppercase mt-1 opacity-70">Heures</span>
                </div>
                <span>:</span>
                <div className="flex flex-col items-center">
                  <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="font-sans text-[10px] tracking-wider uppercase mt-1 opacity-70">Min</span>
                </div>
                <span>:</span>
                <div className="flex flex-col items-center">
                  <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span className="font-sans text-[10px] tracking-wider uppercase mt-1 opacity-70">Sec</span>
                </div>
              </div>
            </div>
          </div>
          </Reveal>

          <FloralBorder src={content.floralImage} />

          {/* Location & Itinerary */}
          <div className="w-full px-8 flex flex-col items-center mt-8">
            <Reveal direction="none">
              <motion.img
                src={content.outdoorImage}
                alt="Couple outdoor walking"
                className="w-full aspect-[4/5] object-cover mb-16"
                initial={{ opacity: 0, scale: 1.04 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </Reveal>

            <Reveal><div className="flex flex-col items-center text-center text-burgundy mb-16">
              <MapPin className="w-10 h-10 stroke-1 mb-4 opacity-80" />
              <p className="font-serif text-xl mb-2">{uiTime}</p>
              <h3 className="font-sans font-medium tracking-[0.2em] mb-1">RÉCEPTION</h3>
              <p className="font-serif text-xl border-b border-burgundy/30 pb-1 mb-2">{content.venueName}</p>
              <p className="font-sans text-sm opacity-80 mb-6">{content.venueCity}</p>
              
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${content.mapCoordinates || '-17.781617,-63.179379'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-burgundy text-white font-sans text-sm tracking-wider px-8 py-3 rounded-full hover:bg-[#4a1c22] transition-colors"
              >
                Voir l'emplacement
              </a>
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
              <h3 className="font-sans font-medium tracking-[0.1em] text-sm mb-4">CODE VESTIMENTAIRE</h3>
              <p className="font-serif italic text-lg mb-6">{content.dressCode}</p>
              
              <div className="flex justify-center mb-6">
                <svg className="w-16 h-16 fill-burgundy" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 2a2 2 0 100 4 2 2 0 000-4zM5.5 7A1.5 1.5 0 004 8.5v4A1.5 1.5 0 005.5 14H6v7.5a.5.5 0 001 0v-7h.5v7a.5.5 0 001 0V14h.5a1.5 1.5 0 001.5-1.5v-4A1.5 1.5 0 009 7H8l-1 2-1-2H5.5zm11.5-5a2 2 0 100 4 2 2 0 000-4zM16 7c-1.38 0-2.5 1.12-2.5 2.5V11c0 1.05.65 1.95 1.57 2.34L13 21.5a.5.5 0 00.91.41L15.39 18l.8 3.55a.5.5 0 00.98-.06l.82-5.74V22.5a.5.5 0 00.95.2l2-6a.5.5 0 00-.95-.32l-1.5 4.5v-5.14c.92-.39 1.57-1.29 1.57-2.34V9.5C18.5 8.12 17.38 7 16 7zm-1 3h2v1h-2v-1z"/>
                </svg>
              </div>
              
              <p className="font-serif text-sm opacity-90 max-w-[80%] mx-auto pb-4">
                Avec beaucoup d'affection, nous vous demandons d'éviter les vêtements blancs.
              </p>
            </div></Reveal>
          </div>

          <FloralBorder flip src={content.floralImage} />

          {/* Bottom Call to Actions */}
          <div className="bg-[#4a1c22] w-full py-16 text-white text-center flex flex-col items-center">
            
            <Reveal><div className="mb-14">
              <Gift className="w-8 h-8 stroke-1 mx-auto mb-4" />
              <h3 className="font-sans tracking-wide text-sm mb-4">SUGGESTION DE CADEAUX</h3>
              <p className="font-serif text-sm opacity-90 max-w-[80%] mx-auto mb-6">
                Le meilleur cadeau est votre présence, mais si vous souhaitez nous offrir quelque chose, voici une option :
              </p>
              <p className="font-sans text-xs tracking-widest uppercase mb-2">Urne nuptiale</p>
              <svg className="w-6 h-6 mx-auto stroke-white stroke-1 bg-transparent" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
            </div></Reveal>

            <div className="w-[80%] h-[1px] bg-white/10 mb-14"></div>

            <Reveal delay={0.1}><div className="mb-14 min-w-[80%]">
              <Hotel className="w-8 h-8 stroke-1 mx-auto mb-4" />
              <h3 className="font-sans tracking-wide text-sm mb-6">SUGGESTION D'HÉBERGEMENT</h3>
              
              {content.hotel1Name && (
                <div className="mb-6">
                  <p className="font-serif text-lg mb-2">{content.hotel1Name}</p>
                  {content.hotel1Url ? (
                    <a href={content.hotel1Url} target="_blank" rel="noopener noreferrer" className="border border-white/60 text-white rounded-full px-6 py-1 text-xs font-sans hover:bg-white hover:text-burgundy transition-colors">
                      Plus d'informations
                    </a>
                  ) : (
                    <button className="border border-white/60 text-white rounded-full px-6 py-1 text-xs font-sans opacity-60 cursor-default">
                      Plus d'informations
                    </button>
                  )}
                </div>
              )}
              {content.hotel2Name && (
                <div>
                  <p className="font-serif text-lg mb-2">{content.hotel2Name}</p>
                  {content.hotel2Url ? (
                    <a href={content.hotel2Url} target="_blank" rel="noopener noreferrer" className="border border-white/60 text-white rounded-full px-6 py-1 text-xs font-sans hover:bg-white hover:text-burgundy transition-colors">
                      Plus d'informations
                    </a>
                  ) : (
                    <button className="border border-white/60 text-white rounded-full px-6 py-1 text-xs font-sans opacity-60 cursor-default">
                      Plus d'informations
                    </button>
                  )}
                </div>
              )}
            </div></Reveal>

            <div className="w-[80%] h-[1px] bg-white/10 mb-14"></div>

            <Reveal delay={0.1}><div className="mb-16">
              <Heart className="w-8 h-8 stroke-1 mx-auto mb-4" />
              <h3 className="font-sans tracking-wide text-sm mb-4">CONFIRMER LA PRÉSENCE</h3>
              <p className="font-serif text-sm opacity-90 max-w-[80%] mx-auto mb-6">
                Nous vous remercions de confirmer votre présence avant le {content.rsvpDeadline}
              </p>
              <button className="border-2 border-white text-white rounded-full px-8 py-2 text-sm font-sans hover:bg-white hover:text-burgundy transition-colors">
                Confirmer ici
              </button>
            </div></Reveal>

            <Reveal delay={0.05}><p className="font-sans text-xs tracking-widest uppercase opacity-80 mb-6">
              Nous espérons compter sur votre présence
            </p></Reveal>
            <Reveal delay={0.15}><p className="font-cursive text-4xl sm:text-5xl opacity-90">
              Merci Beaucoup !
            </p></Reveal>
          </div>
          
          <FloralBorder src={content.floralImage} />

          <div className="w-full px-8 pb-12 flex justify-center -mt-[30px] relative z-10">
            <motion.img
              src={content.holdingHandsImage}
              alt="Couple holding hands"
              className="w-full aspect-[4/5] object-cover rounded-sm shadow-md"
              initial={{ opacity: 0, scale: 1.04 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default App;
