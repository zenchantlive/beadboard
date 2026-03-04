import React from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';

export function OffsetEdge(props: EdgeProps) {
    const {
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        style = {},
        markerEnd,
        data,
        label,
        labelStyle,
        labelBgStyle,
        labelBgPadding,
        labelBgBorderRadius,
        animated,
    } = props;

    // We can pass `offset` via the edge data. Positive or negative pixels.
    const offset = data?.offset as number | undefined ?? 0;

    // Apply offset to the Y axis for Left/Right layouts (horizontal edges)
    // or to the X axis for Top/Bottom layouts (vertical edges).
    // Assuming 'sourcePosition' dictates the primary flow direction.
    let sx = sourceX;
    let sy = sourceY;
    let tx = targetX;
    let ty = targetY;

    if (sourcePosition === 'right' || sourcePosition === 'left') {
        // Horizontal flow, offset the vertical axis (Y)
        sy += offset;
        ty += offset;
    } else {
        // Vertical flow, offset the horizontal axis (X)
        sx += offset;
        tx += offset;
    }

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition,
        targetX: tx,
        targetY: ty,
        targetPosition,
        // Optional: reduce the corner radius slightly for tighter clusters
        borderRadius: 8,
    });

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                className={animated ? "animated-edge" : ""}
                style={{ ...style, strokeDasharray: animated ? "5, 5" : "none" }}
            />
            {label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            pointerEvents: 'all',
                            ...(labelBgStyle as React.CSSProperties),
                            padding: Array.isArray(labelBgPadding) ? `${labelBgPadding[0]}px ${labelBgPadding[1]}px` : labelBgPadding,
                            borderRadius: labelBgBorderRadius,
                        }}
                        className="nodrag nopan"
                    >
                        <div style={labelStyle as React.CSSProperties}>{label}</div>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
