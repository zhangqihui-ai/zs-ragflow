import { useCallback, useMemo, useState, type RefObject } from 'react';
import { renderNodeLabel } from '@/components/artifact-force-graph/node-label';
import { DefaultLinkWidth, HighlightLinkWidth } from '@/components/artifact-force-graph/node-style';
import { getBaseLinkColor, withAlpha } from '@/components/artifact-force-graph/utils';
import type { ArtifactGraphLink, ArtifactGraphNode } from '@/components/artifact-force-graph/types';

export function useGraphHighlight(
  containerRef: RefObject<HTMLElement>,
  pinnedNode?: ArtifactGraphNode | null,
) {
  const [hoverNode, setHoverNode] = useState<ArtifactGraphNode | null>(null);
  const activeNode = pinnedNode ?? hoverNode;
  const neighbors = useMemo(() => new Set(activeNode?.__neighbors), [activeNode]);
  const links = useMemo(() => new Set(activeNode?.__links), [activeNode]);
  const highlightColor = useCallback(
    () => getComputedStyle(document.documentElement).getPropertyValue('--artifact-entity-accent').trim(),
    [],
  );

  return {
    handleNodeHover: setHoverNode,
    getNodeColor: (node: ArtifactGraphNode) => {
      if (node === pinnedNode) return highlightColor();
      if (!activeNode || node === activeNode || neighbors.has(node)) return node.__color;
      return withAlpha(getBaseLinkColor(containerRef.current), 0.42);
    },
    getLinkColor: (link: ArtifactGraphLink) => {
      if (pinnedNode && links.has(link)) return highlightColor();
      const baseColor = getBaseLinkColor(containerRef.current);
      return activeNode && !links.has(link) ? withAlpha(baseColor, 0.18) : baseColor;
    },
    getLinkWidth: (link: ArtifactGraphLink) => links.has(link) ? HighlightLinkWidth : DefaultLinkWidth,
    paintNode: useCallback((node: ArtifactGraphNode, ctx: CanvasRenderingContext2D, scale: number) => {
      ctx.save();
      if (activeNode && node !== activeNode && !neighbors.has(node)) ctx.globalAlpha = 0.3;
      if (node === pinnedNode && typeof node.x === 'number' && typeof node.y === 'number') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.__radius + 2 / scale, 0, Math.PI * 2);
        ctx.strokeStyle = highlightColor();
        ctx.lineWidth = 1.5 / scale;
        ctx.stroke();
      }
      renderNodeLabel(node, ctx, scale);
      ctx.restore();
    }, [activeNode, highlightColor, neighbors, pinnedNode]),
  };
}
