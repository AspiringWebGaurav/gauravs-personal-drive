import { useCallback, useRef, useState } from 'react';

interface LongPressOptions {
    onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
    onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
    onFinish?: () => void; // Called when long press ends (finger lifted)
    ms?: number;
}

export function useLongPress({ onLongPress, onClick, onFinish, ms = 500 }: LongPressOptions) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPress = useRef(false);
    const isStarted = useRef(false);

    const start = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            isStarted.current = true;
            isLongPress.current = false;
            timerRef.current = setTimeout(() => {
                isLongPress.current = true;
                onLongPress(e);
            }, ms);
        },
        [onLongPress, ms]
    );

    const stop = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            if (!isStarted.current) return;

            isStarted.current = false;

            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            if (isLongPress.current) {
                // Long press finished
                if (onFinish) onFinish();
            } else {
                // Regular click
                if (onClick) onClick(e);
            }
            isLongPress.current = false;
        },
        [onClick, onFinish]
    );

    return {
        onMouseDown: start,
        onMouseUp: stop,
        onMouseLeave: stop,
        onTouchStart: start,
        onTouchEnd: stop,
    };
}
