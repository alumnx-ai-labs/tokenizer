import { useState } from 'react';

export default function BPEDemo({ text }) {
  const [merges, setMerges] = useState([]);
  const [numMerges, setNumMerges] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTrain = async () => {
    if (!text || text.trim().length === 0) {
      setError('Please enter some text in the main input area first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMerges([]);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/bpe/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, num_merges: parseInt(numMerges, 10) })
      });
      
      if (!res.ok) throw new Error('Failed to train BPE');
      
      const data = await res.json();
      setMerges(data.merges);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      marginTop: '20px',
      padding: '24px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Interactive BPE Training
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          See how the Byte Pair Encoding algorithm learns to merge characters into words based on frequency. It will use the text you provided above as its training corpus.
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
          Number of merges to perform:
        </label>
        <input 
          type="number" 
          value={numMerges} 
          onChange={e => setNumMerges(e.target.value)}
          min="1" max="500"
          style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '4px',
            width: '80px', fontSize: '13px'
          }}
        />
        <button
          onClick={handleTrain}
          disabled={loading}
          style={{
            padding: '6px 16px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '13px', fontWeight: 500, opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Training...' : 'Train BPE'}
        </button>
      </div>
      
      {error && (
        <div style={{ padding: '12px', background: 'rgba(255,0,0,0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}
      
      {merges.length > 0 && (
        <div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Merge History
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {merges.map(m => (
              <div key={m.step} style={{ 
                background: 'var(--surface-2)', padding: '12px', 
                borderRadius: '6px', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '20px' }}>#{m.step}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace' }}>
                    <span style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', whiteSpace: 'pre' }}>{m.pair1}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>+</span>
                    <span style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', whiteSpace: 'pre' }}>{m.pair2}</span>
                    <span style={{ color: 'var(--accent)', margin: '0 4px' }}>➔</span>
                    <span style={{ padding: '2px 6px', background: 'var(--accent)', color: '#fff', borderRadius: '4px', whiteSpace: 'pre' }}>{m.merged}</span>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Freq: {m.frequency}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
