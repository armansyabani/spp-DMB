import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Link2, Upload, Images, X, Loader2, Trash2, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface MediaPickerProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: 'square' | 'video';
}

type Tab = 'LINK' | 'UPLOAD' | 'GALLERY';

export const MediaPicker: React.FC<MediaPickerProps> = ({ label, value, onChange, aspect = 'video' }) => {
  const { mediaGallery, uploadMediaFile, addMediaFromUrl, deleteMediaItem } = useApp();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('UPLOAD');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 8MB');
      return;
    }
    setUploading(true);
    try {
      const item = await uploadMediaFile(file);
      onChange(item.url);
      toast.success('Berhasil diunggah!');
      setOpen(false);
    } catch (err: any) {
      toast.error(`Gagal mengunggah: ${err?.message || 'terjadi kesalahan'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUseUrl = () => {
    if (!urlInput.trim()) return;
    addMediaFromUrl(urlInput.trim());
    onChange(urlInput.trim());
    setUrlInput('');
    setOpen(false);
  };

  const aspectClass = aspect === 'square' ? 'aspect-square' : 'aspect-video';

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</label>

      <div
        className={`relative ${aspectClass} w-full max-w-xs rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden group cursor-pointer`}
        onClick={() => setOpen(true)}
      >
        {value ? (
          <img src={value} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
            <Images className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Klik untuk pilih gambar</span>
          </div>
        )}
        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-white text-xs font-bold px-3 py-1.5 bg-emerald-600 rounded-lg">Ganti</span>
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{label}</h4>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 dark:border-slate-800">
              {[
                { id: 'UPLOAD' as Tab, label: 'Upload', icon: Upload },
                { id: 'GALLERY' as Tab, label: 'Galeri', icon: Images },
                { id: 'LINK' as Tab, label: 'Link URL', icon: Link2 },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition ${
                    tab === t.id
                      ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-500/10'
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {tab === 'UPLOAD' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pilih foto/video langsung dari perangkat (HP/Laptop). Maks 8MB.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-8 border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-2xl flex flex-col items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs font-bold">Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6" />
                        <span className="text-xs font-bold">Klik untuk pilih file</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {tab === 'GALLERY' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Media yang pernah diunggah sebelumnya, tinggal pilih ulang.
                  </p>
                  {mediaGallery.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400">Belum ada media di galeri.</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {mediaGallery.map((m) => (
                        <div
                          key={m.id}
                          className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group cursor-pointer"
                          onClick={() => {
                            onChange(m.url);
                            setOpen(false);
                          }}
                        >
                          {m.type === 'video' ? (
                            <video src={m.url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMediaItem(m.id);
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'LINK' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tempel link/URL gambar dari internet.</p>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={handleUseUrl}
                    disabled={!urlInput.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                  >
                    Gunakan Link Ini
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
