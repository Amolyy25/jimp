import ColorInput from './controls/ColorInput.jsx';
import SliderInput from './controls/SliderInput.jsx';
import TextInput from './controls/TextInput.jsx';

/**
 * Editor panel for the page-wide background layer.
 * The mode selector drives what fields are shown below.
 */
export default function BackgroundPanel({ background, onChange }) {
  const mode = background?.type || 'none';

  const handleUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    onChange({ [field]: dataUrl });
  };

  return (
    <div className="space-y-5">
      <TextInput
        label="Mode"
        value={mode}
        onChange={(v) => onChange({ type: v })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'image', label: 'Image' },
          { value: 'video', label: 'Video file' },
          { value: 'youtube', label: 'YouTube embed' },
        ]}
      />

      {mode === 'image' && (
        <div className="space-y-3">
          <TextInput
            label="Image URL"
            value={background.image}
            onChange={(v) => onChange({ image: v })}
            placeholder="https://..."
          />
          <UploadRow label="…or upload" accept="image/*" onFile={(e) => handleUpload(e, 'image')} />
        </div>
      )}

      {mode === 'video' && (
        <div className="space-y-3">
          <TextInput
            label="Video URL"
            value={background.video}
            onChange={(v) => onChange({ video: v })}
            placeholder="https://.../loop.mp4"
          />
          <UploadRow label="…or upload" accept="video/*" onFile={(e) => handleUpload(e, 'video')} />
          <p className="text-[11px] leading-relaxed text-white/40">
            For best results use a short, silent, looping mp4 (≤ 15s, ≤ 5MB).
          </p>
        </div>
      )}

      {mode === 'youtube' && (
        <div className="space-y-2">
          <TextInput
            label="YouTube ID or URL"
            value={background.youtubeId}
            onChange={(v) => onChange({ youtubeId: extractYouTubeId(v) })}
            placeholder="dQw4w9WgXcQ"
          />
          <p className="text-[11px] leading-relaxed text-white/40">
            Paste a full YouTube URL or just the video ID. Video is muted and
            looped by default.
          </p>
        </div>
      )}

      <div className="border-t border-white/5" />

      <section className="space-y-3">
        <h3 className="eyebrow">Overlay</h3>
        <ColorInput
          label="Overlay color"
          value={background?.overlayColor}
          onChange={(v) => onChange({ overlayColor: v })}
        />
        <SliderInput
          label="Overlay opacity"
          min={0}
          max={1}
          step={0.01}
          value={background?.overlayOpacity ?? 0}
          onChange={(v) => onChange({ overlayOpacity: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </section>
    </div>
  );
}

function UploadRow({ label, accept, onFile }) {
  return (
    <label className="block space-y-1.5">
      <span className="eyebrow">{label}</span>
      <input
        type="file"
        accept={accept}
        onChange={onFile}
        className="block w-full text-xs text-white/60 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
      />
    </label>
  );
}

function extractYouTubeId(input) {
  if (!input) return '';
  // Already an id
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
  const match =
    input.match(/[?&]v=([^&]+)/) ||
    input.match(/youtu\.be\/([^?&]+)/) ||
    input.match(/embed\/([^?&]+)/);
  return match ? match[1] : input;
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
