import ColorInput from './controls/ColorInput.jsx';
import SliderInput from './controls/SliderInput.jsx';
import TextInput from './controls/TextInput.jsx';
import { Image, Clapperboard, Youtube, Ghost } from 'lucide-react';

export default function BackgroundPanel({ background, onChange }) {
  const mode = background?.type || 'none';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'none', label: 'Aucun', icon: Ghost },
          { id: 'image', label: 'Image', icon: Image },
          { id: 'video', label: 'Vidéo', icon: Clapperboard },
          { id: 'youtube', label: 'YouTube', icon: Youtube },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange({ type: opt.id })}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border py-4 transition-all ${
              mode === opt.id
                ? 'border-discord/50 bg-discord/10 text-white'
                : 'border-white/5 bg-white/[0.02] text-white/40 hover:bg-white/[0.05] hover:text-white/60'
            }`}
          >
            <opt.icon className={`h-5 w-5 ${mode === opt.id ? 'text-discord' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {mode === 'image' && (
          <div className="space-y-2">
            <TextInput
              label="URL de l'image"
              value={background.image}
              onChange={(v) => onChange({ image: v })}
              placeholder="https://..."
            />
            <p className="text-[10px] leading-relaxed text-white/30 italic">
              Hébergez votre image (ex: Imgur, Discord) et collez le lien direct.
            </p>
          </div>
        )}

        {mode === 'video' && (
          <div className="space-y-2">
            <TextInput
              label="URL du fichier vidéo"
              value={background.video}
              onChange={(v) => onChange({ video: v })}
              placeholder="https://.../loop.mp4"
            />
            <p className="text-[10px] leading-relaxed text-white/30 italic">
              Utilisez un fichier .mp4 en boucle. Les vidéos trop lourdes peuvent ralentir le chargement.
            </p>
          </div>
        )}

        {mode === 'youtube' && (
          <div className="space-y-2">
            <TextInput
              label="ID ou Lien YouTube"
              value={background.youtubeId}
              onChange={(v) => onChange({ youtubeId: extractYouTubeId(v) })}
              placeholder="Ex: dQw4w9WgXcQ"
            />
            <p className="text-[10px] leading-relaxed text-white/30 italic">
              La vidéo sera jouée en boucle et sans son par défaut.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-white/5 pt-6" />

      <section className="space-y-4">
        <h3 className="eyebrow flex items-center gap-2">
          <div className="h-1 w-3 bg-discord" />
          Filtre & Visibilité
        </h3>
        <ColorInput
          label="Couleur du filtre"
          value={background?.overlayColor}
          onChange={(v) => onChange({ overlayColor: v })}
        />
        <SliderInput
          label="Opacité du filtre"
          min={0}
          max={1}
          step={0.01}
          value={background?.overlayOpacity ?? 0.4}
          onChange={(v) => onChange({ overlayOpacity: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </section>
    </div>
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
