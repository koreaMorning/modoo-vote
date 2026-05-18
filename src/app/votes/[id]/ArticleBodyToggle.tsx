'use client';

import { useState } from 'react';

interface Props {
  description: string;
}

export default function ArticleBodyToggle({ description }: Props) {
  const [expanded, setExpanded] = useState(false);

  const paragraphs = description
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const leadPara = paragraphs[0] ?? null;
  const bodyParas = paragraphs.slice(1);

  if (!leadPara) return null;

  return (
    <div className="my-6 pb-6 border-b border-[#c8bfa0]">
      {expanded ? (
        <>
          <p className="text-[15px] font-serif text-[#2d2520] leading-[1.85] mb-4">
            {leadPara}
          </p>
          {bodyParas.length > 0 && (
            <div className="md:columns-2 md:gap-8 md:[column-rule:1px_solid_#c8bfa0] clear-both text-sm font-serif text-[#3d3326] leading-[1.8]">
              {bodyParas.map((p, i) => (
                <p key={i} className="mb-3 break-inside-avoid">
                  {p}
                </p>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="line-clamp-3 text-[15px] font-serif text-[#2d2520] leading-[1.85]">
          {paragraphs.join(' ')}
        </p>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-xs text-[#6b6356] hover:text-[#1c1712] font-semibold flex items-center gap-1 transition-colors"
      >
        {expanded ? '▲ 접기' : '▼ 펼치기'}
      </button>
    </div>
  );
}
