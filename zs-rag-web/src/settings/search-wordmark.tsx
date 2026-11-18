import type { MouseEventHandler } from 'react';
import { RAGFlowLogo as OriginalSearchLogo } from '@/pages/next-search/ragflow-logo';

const colors = ['blue', 'red', 'yellow', 'blue', 'green', 'red'] as const;
const title = 'RAG一下，你就知道';

export function RAGFlowLogo({
  onClick,
  showEmbedIcon = true,
}: {
  onClick?: MouseEventHandler<HTMLHeadingElement>;
  showEmbedIcon?: boolean;
}) {
  return (
    <div className="search-wordmark">
      <h1 aria-label={title} className={onClick ? 'search-wordmark-compact' : undefined} onClick={onClick}>
        {[...title].map((character, index) => (
          <span key={index} aria-hidden="true" data-color={colors[index % colors.length]}>
            {character}
          </span>
        ))}
      </h1>
      {showEmbedIcon && (
        <div className="search-wordmark-share">
          <OriginalSearchLogo />
        </div>
      )}
    </div>
  );
}
