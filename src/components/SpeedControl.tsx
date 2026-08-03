import type { CSSProperties } from 'react';
import GaugeIcon from '../assets/gauge-solid-full.svg';

// Kept at 0 so this slider's scale matches VolumeControl's 0-500% exactly.
export const MIN_SPEED = 0;
export const MAX_SPEED = 5;
const STEP = 0.1;

type SpeedControlProps = {
    speed: number;
    onChange: (speed: number) => void;
    onAdjustStart: () => void;
    onAdjustEnd: () => void;
};

export default function SpeedControl({ speed, onChange, onAdjustStart, onAdjustEnd }: SpeedControlProps) {
    function step(delta: number){
        // Round to two decimals so repeated steps don't drift on float math.
        onChange(Math.round((speed + delta) * 100) / 100);
    }

    return (
        <div className="speed-view">
            <button onClick={() => onChange(1)} className="controlls-btn-speed" title="Reset to 1x">
                <img src={GaugeIcon}/>
            </button>
            <input
                className="speed-input"
                type="range"
                min={MIN_SPEED * 100}
                max={MAX_SPEED * 100}
                step="5"
                value={Math.round(speed * 100)}
                style={{ '--fill': (speed / MAX_SPEED * 100) + '%' } as CSSProperties}
                onChange={(e) => onChange(Number(e.target.value) / 100)}
                onPointerDown={onAdjustStart}
                onPointerUp={onAdjustEnd}
                onPointerCancel={onAdjustEnd}
            />
            <button onClick={() => step(-STEP)} className="step-btn" title="-0.1x">−</button>
            <span
                className={"speed-span" + (speed != 1 ? " altered" : "")}
                title="Click to reset to 1x"
                onClick={() => onChange(1)}
            >{speed.toFixed(2)}x</span>
            <button onClick={() => step(STEP)} className="step-btn" title="+0.1x">+</button>
        </div>
    );
}
