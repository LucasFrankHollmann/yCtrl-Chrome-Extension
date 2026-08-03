import type { CSSProperties } from 'react';
import VolumeIcon from '../assets/volume-solid-full.svg';
import VolumeMutedIcon from '../assets/volume-xmark-solid-full.svg';

export const MAX_VOLUME = 5;
const STEP = 0.1;

type VolumeControlProps = {
    volume: number;
    muted: boolean;
    onChange: (volume: number) => void;
    onToggleMute: () => void;
    onAdjustStart: () => void;
    onAdjustEnd: () => void;
};

export default function VolumeControl({ volume, muted, onChange, onToggleMute, onAdjustStart, onAdjustEnd }: VolumeControlProps) {
    const percent = Math.round(volume * 100);

    function step(delta: number){
        // Round to whole percent so repeated steps don't drift on float math.
        const stepped = Math.round((volume + delta) * 100) / 100;
        onChange(Math.min(Math.max(stepped, 0), MAX_VOLUME));
    }

    return (
        <div className="volume-view">
            <button onClick={onToggleMute} className="controlls-btn-volume" title={muted ? "Unmute" : "Mute"}>
                <img src={muted ? VolumeMutedIcon : VolumeIcon}/>
            </button>
            <input
                className="volume-input"
                type="range"
                min="0"
                max={MAX_VOLUME * 100}
                step="5"
                value={percent}
                style={{ '--fill': (percent / MAX_VOLUME) + '%' } as CSSProperties}
                onChange={(e) => onChange(Number(e.target.value) / 100)}
                onPointerDown={onAdjustStart}
                onPointerUp={onAdjustEnd}
                onPointerCancel={onAdjustEnd}
            />
            <button onClick={() => step(-STEP)} className="step-btn" title="-10%">−</button>
            <span
                className={"volume-span" + (volume > 1 ? " boosted" : "")}
                title="Click to reset to 100%"
                onClick={() => onChange(1)}
            >{percent}%</span>
            <button onClick={() => step(STEP)} className="step-btn" title="+10%">+</button>
        </div>
    );
}
