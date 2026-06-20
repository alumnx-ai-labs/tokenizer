const COLORS = 6;

const tokenStyle = (index, isUnk) => {
  if (isUnk) {
    return {
      background: 'var(--tok-unk-bg)',
      color: 'var(--tok-unk-fg)',
      border: '1px solid var(--tok-unk-fg)',
    };
  }
  const c = index % COLORS;
  return {
    background: `var(--tok-${c}-bg)`,
    color: `var(--tok-${c}-fg)`,
    border: `1px solid var(--tok-${c}-fg)`,
  };
};

export default function TokenDisplay({ tokens }) {
  if (!tokens || tokens.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', lineHeight: 1.8 }}>
      {tokens.map((t, i) => (
        <span
          key={i}
          title={`Token ID: ${t.token_id}${t.is_unk ? ' [UNK]' : ''}`}
          style={{
            ...tokenStyle(i, t.is_unk),
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            fontSize: '13px',
            padding: '1px 6px',
            borderRadius: '4px',
            display: 'inline-block',
            cursor: 'default',
            whiteSpace: 'pre',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {t.token.replace(/ /g, '·')}
        </span>
      ))}
    </div>
  );
}
