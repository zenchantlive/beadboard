import { useState, useEffect, useCallback } from 'react';

const LEFT_PANEL_KEY = 'bb.ui.leftPanelWidth';
const RIGHT_PANEL_KEY = 'bb.ui.rightPanelWidth';

const DEFAULT_LEFT_WIDTH = 320;
const DEFAULT_RIGHT_WIDTH = 332;

export const MIN_LEFT_WIDTH = 192;
export const MIN_RIGHT_WIDTH = 256;

export function usePanelResize() {
    const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
    const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const savedLeft = localStorage.getItem(LEFT_PANEL_KEY);
        const savedRight = localStorage.getItem(RIGHT_PANEL_KEY);

        if (savedLeft) {
            setLeftWidth(parseInt(savedLeft, 10));
        }
        if (savedRight) {
            setRightWidth(parseInt(savedRight, 10));
        }

        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem(LEFT_PANEL_KEY, String(leftWidth));
        }
    }, [leftWidth, mounted]);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem(RIGHT_PANEL_KEY, String(rightWidth));
        }
    }, [rightWidth, mounted]);

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
