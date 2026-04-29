import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function UpdateCrud() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to load content", e);
        setLoading(false);
      });
  }, []);

  const handleChange = (key: string, value: string) => {
    setData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (key: string, file: File) => {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: file,
        headers: {
          'Content-Type': file.type || 'image/jpeg',
          'X-Filename': encodeURIComponent(file.name),
        },
      });
      const result = await res.json();
      if (result.filePath) {
        handleChange(key, result.filePath);
      } else {
        console.error('Upload error:', result);
        alert(`Échec de l'upload: ${result.details || result.error}`);
      }
    } catch (e) {
      console.error("Failed to upload image", e);
    }
  };

  const handleSave = async () => {
    try {
      await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      alert('Content saved successfully!');
    } catch (e) {
      console.error("Failed to save content", e);
      alert('Failed to save content');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">No data found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans bg-white min-h-screen text-neutral-800">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gestion du contenu</h1>
        <div className="space-x-4">
          <Link to="/" className="px-4 py-2 bg-neutral-200 rounded hover:bg-neutral-300 transition-colors">Voir le site</Link>
          <button onClick={handleSave} className="px-4 py-2 bg-[#63262f] text-white rounded hover:bg-[#4a1c22] transition-colors">Enregistrer</button>
        </div>
      </div>

      <div className="space-y-10">

        {/* Section: Couple */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">👰 Couple</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prénom de la mariée</label>
              <input type="text" value={data.brideName || ''} onChange={e => handleChange('brideName', e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prénom du marié</label>
              <input type="text" value={data.groomName || ''} onChange={e => handleChange('groomName', e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
        </section>

        {/* Section: Date & Heure */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">📅 Date & Heure</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date affichée (ex: 06.12.2026)</label>
              <input type="text" value={data.date || ''} onChange={e => handleChange('date', e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date/heure du compte à rebours</label>
              <input type="datetime-local" value={data.targetDate || ''} onChange={e => handleChange('targetDate', e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date limite RSVP (ex: 01 novembre)</label>
              <input type="text" value={data.rsvpDeadline || ''} onChange={e => handleChange('rsvpDeadline', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="01 novembre" />
            </div>
          </div>
        </section>

        {/* Section: Verset biblique */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">📖 Verset biblique</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Verset</label>
            <textarea value={data.bibleVerse || ''} onChange={e => handleChange('bibleVerse', e.target.value)} className="w-full border rounded px-3 py-2 h-20 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Référence (ex: Colossiens 3:14)</label>
            <input type="text" value={data.bibleVerseRef || ''} onChange={e => handleChange('bibleVerseRef', e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
        </section>

        {/* Section: Parents */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">👨‍👩‍👧 Parents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mère du marié</label>
              <input type="text" value={data.groomMother || ''} onChange={e => handleChange('groomMother', e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Père du marié</label>
              <input type="text" value={data.groomFather || ''} onChange={e => handleChange('groomFather', e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mère de la mariée</label>
              <input type="text" value={data.brideMother || ''} onChange={e => handleChange('brideMother', e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Père de la mariée</label>
              <input type="text" value={data.brideFather || ''} onChange={e => handleChange('brideFather', e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
        </section>

        {/* Section: Lieu */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">📍 Lieu de réception</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom du lieu</label>
              <input type="text" value={data.venueName || ''} onChange={e => handleChange('venueName', e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ville</label>
              <input type="text" value={data.venueCity || ''} onChange={e => handleChange('venueCity', e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Coordonnées GPS (lat,lng)</label>
              <input type="text" value={data.mapCoordinates || ''} onChange={e => handleChange('mapCoordinates', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="-17.781617,-63.179379" />
            </div>
          </div>
        </section>

        {/* Section: Code vestimentaire */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">👔 Code vestimentaire</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Code vestimentaire</label>
            <input type="text" value={data.dressCode || ''} onChange={e => handleChange('dressCode', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Tenue formelle" />
          </div>
        </section>

        {/* Section: Hébergement */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">🏨 Hébergement suggéré</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hôtel 1 — Nom</label>
              <input type="text" value={data.hotel1Name || ''} onChange={e => handleChange('hotel1Name', e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hôtel 1 — Lien (optionnel)</label>
              <input type="text" value={data.hotel1Url || ''} onChange={e => handleChange('hotel1Url', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hôtel 2 — Nom</label>
              <input type="text" value={data.hotel2Name || ''} onChange={e => handleChange('hotel2Name', e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hôtel 2 — Lien (optionnel)</label>
              <input type="text" value={data.hotel2Url || ''} onChange={e => handleChange('hotel2Url', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="https://..." />
            </div>
          </div>
        </section>

        {/* Section: Messages de l'enveloppe */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">✉️ Messages de l'enveloppe</h2>
          <p className="text-xs text-neutral-500">Ces messages apparaissent en volant hors de l'enveloppe lors de l'ouverture. Dans le 1er message, <code className="bg-neutral-100 px-1 rounded">{'{guest}'}</code> sera automatiquement remplacé par le prénom de l'invité (ou « Invité » si non précisé).</p>
          <div>
            <label className="block text-sm font-medium mb-1">Message 1 (salutation)</label>
            <input type="text" value={data.envelopeMsg1 || ''} onChange={e => handleChange('envelopeMsg1', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Bonjour {guest} !" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message 2 (invitation)</label>
            <input type="text" value={data.envelopeMsg2 || ''} onChange={e => handleChange('envelopeMsg2', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Rejoignez-nous pour célébrer !" />
          </div>
        </section>

        {/* Section: Musique */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">🎵 Musique</h2>
          <div>
            <label className="block text-sm font-medium mb-1">URL audio (lien direct MP3/OGG)</label>
            <input type="text" value={data.musicUrl || ''} onChange={e => handleChange('musicUrl', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="https://example.com/music.mp3" />
          </div>
        </section>

        {/* Section: Images */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">🖼️ Images</h2>
          {[
            { key: 'letterBgImage', label: 'Fond de la lettre' },
            { key: 'paperBgImage', label: 'Fond du papier (confettis)' },
            { key: 'keepsakeImage', label: 'Photo souvenir (polaroid)' },
            { key: 'floralImage', label: 'Bordure florale' },
            { key: 'huggingImage', label: 'Photo couple (embrassés)' },
            { key: 'outdoorImage', label: 'Photo couple (extérieur)' },
            { key: 'holdingHandsImage', label: 'Photo couple (mains)' },
          ].map(({ key: imgKey, label }) => (
            <div key={imgKey} className="flex flex-col gap-2 border p-4 rounded bg-neutral-50">
              <label className="block text-sm font-medium">{label}</label>
              <div className="flex items-center gap-4">
                {data[imgKey] && (
                  <img src={data[imgKey]} alt={label} className="w-16 h-16 object-cover rounded shadow-sm flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="flex-1">
                  <input
                    type="text"
                    value={data[imgKey] || ''}
                    onChange={e => handleChange(imgKey, e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm mb-2"
                    placeholder="URL de l'image"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageUpload(imgKey, e.target.files[0]);
                      }
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

      </div>
    </div>
  );
}
