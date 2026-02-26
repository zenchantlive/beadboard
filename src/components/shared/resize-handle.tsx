"use client";

import React, { useCallback, useRef, useEffect } from 'react';

interface ResizeHandleProps {
    direction: 'left' | 'right';
    onResize: (delta: number) => void;
    onResizeEnd?: () => void;
}

export function ResizeHandle({ direction, onResize, onResizeEnd }: ResizeHandleProps) {
    const isDragging = useRef(false);
    const startX = useRef(0);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        startX.current = e.clientX;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = direction === 'left'
            ? e.clientX - startX.current
            : startX.current - e.clientX;
        startX.current = e.clientX;
        onResize(delta);
    }, [direction, onResize]);

    const handleMouseUp = useCallback(() => {
        if (isDragging.current) {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            onResizeEnd?.();
        }
    }, [onResizeEnd]);

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return (
        <div
            className={`
                w-1 h-full cursor-col-resize 
                bg-transparent hover:bg-[var(--ui-accent-info)]/30 
                transition-colors duration-150
                flex-shrink-0 z-10
                group relative
            `}
            onMouseDown={handleMouseDown}
        >
            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[var(--ui-accent-info)]/10" />
        </div>
    );
}
