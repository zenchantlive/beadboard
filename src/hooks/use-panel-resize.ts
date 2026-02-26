import { useState, useEffect, useCallback } from 'react';

const LEFT_PANEL_KEY = 'bb.ui.leftPanelWidth';
const RIGHT_PANEL_KEY = 'bb.ui.rightPanelWidth';

const DEFAULT_LEFT_WIDTH = 320;
const DEFAULT_RIGHT_WIDTH = 332;

export const MIN_LEFT_WIDTH = 192;
export const MIN_RIGHT_WIDTH = 256;

export function usePanelResize() {
    const [leftWidth, setLeftWidth] = useState(() => {
        if (typeof window === 'undefined') return DEFAULT_LEFT_WIDTH;
        const saved = localStorage.getItem(LEFT_PANEL_KEY);
        return saved ? parseInt(saved, 10) : DEFAULT_LEFT_WIDTH;
    });

    const [rightWidth, setRightWidth] = useState(() => {
        if (typeof window === 'undefined') return DEFAULT_RIGHT_WIDTH;
        const saved = localStorage.getItem(RIGHT_PANEL_KEY);
        return saved ? parseInt(saved, 10) : DEFAULT_RIGHT_WIDTH;
    });

    useEffect(() => {
        localStorage.setItem(LEFT_PANEL_KEY, String(leftWidth));
    }, [leftWidth]);

    useEffect(() => {
        localStorage.setItem(RIGHT_PANEL_KEY, String(rightWidth));
    }, [rightWidth]);

    const clampLeftWidth = useCallback((width: number) => {
        const maxWidth = Math.floor(window.innerWidth * 0.30);
        return Math.max(MIN_LEFT_WIDTH, Math.min(width, maxWidth));
    }, []);

    const clampRightWidth = useCallback((width: number) => {
        const maxWidth = Math.floor(window.innerWidth * 0.35);
        return Math.max(MIN_RIGHT_WIDTH, Math.min(width, maxWidth));
    }, []);

    const handleLeftResize = useCallback((delta: number) => {
        setLeftWidth(prev => clampLeftWidth(prev + delta));
    }, [clampLeftWidth]);

    const handleRightResize = useCallback((delta: number) => {
        setRightWidth(prev => clampRightWidth(prev + delta));
    }, [clampRightWidth]);

    return {
        leftWidth,
        rightWidth,
        handleLeftResize,
        handleRightResize,
        clampLeftWidth,
        clampRightWidth,
        MIN_LEFT_WIDTH,
        MIN_RIGHT_WIDTH
    };
}
