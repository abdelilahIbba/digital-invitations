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
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.filePath) {
        handleChange(key, result.filePath);
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
        <h1 className="text-3xl font-bold">Content Management</h1>
        <div className="space-x-4">
          <Link to="/" className="px-4 py-2 bg-neutral-200 rounded hover:bg-neutral-300 transition-colors">View Site</Link>
          <button onClick={handleSave} className="px-4 py-2 bg-[#63262f] text-white rounded hover:bg-[#4a1c22] transition-colors">Save Changes</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">Texts</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Bride Name</label>
            <input 
              type="text" 
              value={data.brideName} 
              onChange={e => handleChange('brideName', e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Groom Name</label>
            <input 
              type="text" 
              value={data.groomName} 
              onChange={e => handleChange('groomName', e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input 
              type="text" 
              value={data.date} 
              onChange={e => handleChange('date', e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target Timer Date/Time</label>
            <input 
              type="datetime-local" 
              value={data.targetDate || ''} 
              onChange={e => handleChange('targetDate', e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">Images</h2>
          
          {['letterBgImage', 'paperBgImage', 'keepsakeImage', 'floralImage', 'huggingImage', 'outdoorImage', 'holdingHandsImage'].map(imgKey => (
            <div key={imgKey} className="flex flex-col gap-2 border p-4 rounded bg-neutral-50">
              <label className="block text-sm font-medium">{imgKey}</label>
              
              <div className="flex items-center gap-4">
                {data[imgKey] && (
                  <img src={data[imgKey]} alt={imgKey} className="w-16 h-16 object-cover rounded shadow-sm" />
                )}
                
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={data[imgKey]} 
                    onChange={e => handleChange(imgKey, e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm mb-2"
                    placeholder="Image URL or Path"
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
        </div>
      </div>
    </div>
  );
}
