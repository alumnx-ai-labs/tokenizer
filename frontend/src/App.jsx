import { useState, useEffect, useCallback, useRef } from 'react';
import TokenizerPanel from './components/TokenizerPanel';
import './index.css';

const API = import.meta.env.VITE_API_URL || '';

const EXAMPLE_TEXT =
  "I had always thought Jack Gisburn rather a cheap genius--though a good fellow enough--so it was no great surprise to me to hear that, in the height of his glory, he had dropped his painting.";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function WordSample({ label, color, words }) {
  const MAX = 40;
  const shown = words.slice(0, MAX);
  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
        {label}{words.length > MAX ? ` (showing ${MAX} of ${words.length})` : ''}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {shown.map((w, i) => (
          <code key={i} style={{
            fontSize: '12px',
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'var(--surface-2)',
            border: `1px solid ${color}`,
            color,
          }}>
            {w}
          </code>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vocabInfo, setVocabInfo] = useState(null);
  const debouncedText = useDebounce(text, 300);
  const abortRef = useRef(null);

  // ── Upload state ──
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const refreshVocabInfo = useCallback(() => {
    fetch(`${API}/api/vocab-info`)
      .then(r => r.json())
      .then(setVocabInfo)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshVocabInfo();
  }, [refreshVocabInfo]);

  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadResult(null);
    setUploadError(null);

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.txt') && !lower.endsWith('.pdf')) {
      setUploadError('Only .txt and .pdf files are supported.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('File exceeds the 10 MB limit.');
      e.target.value = '';
      return;
    }

    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      const r = await fetch(`${API}/api/upload`, { method: 'POST', body: form });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || `Server error ${r.status}`);
      setUploadResult(data);
      refreshVocabInfo();
    } catch (err) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (!debouncedText.trim()) {
      setResult(null);
      setError(null);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    fetch(`${API}/api/tokenize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: debouncedText }),
      signal: abortRef.current.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then(data => {
        setResult(data);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError('Could not reach the backend. Make sure the FastAPI server is running on port 8000.');
        setLoading(false);
      });
  }, [debouncedText]);

  const handleClear = () => {
    setText('');
    setResult(null);
    setError(null);
  };

  const handleExample = () => {
    setText(EXAMPLE_TEXT);
  };

  return (
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '32px 24px 64px',
      display: 'flex',
      flexDirection: 'column',
      gap: '28px',
      minHeight: '100vh',
    }}>

      {/* ── Header ── */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px' }}>🔤</span>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Tokenizer Demo
          </h1>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Learn about language model tokenisation
        </h2>
        <p style={{ maxWidth: '720px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
          Language models process text as <strong style={{ color: 'var(--text-primary)' }}>tokens</strong> — common sequences of characters.
          Enter any text below to compare how a{' '}
          <strong style={{ color: '#5c8fd9' }}>Simple regex tokeniser</strong> (vocabulary built from a{' '}
          corpus of classic literature and football books) handles it versus{' '}
          <strong style={{ color: '#9c7dce' }}>TikToken</strong> — OpenAI's production BPE tokeniser.
        </p>
        {vocabInfo && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 12px', borderRadius: '20px',
              background: '#1a2a3f', border: '1px solid #5c8fd9',
              fontSize: '12px', color: '#5c8fd9',
            }}>
              Simple vocab: {vocabInfo.simple_vocab_size.toLocaleString()} tokens
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: '20px',
              background: '#2a1a3f', border: '1px solid #9c7dce',
              fontSize: '12px', color: '#9c7dce',
            }}>
              TikToken ({vocabInfo.tiktoken_encoding}): {vocabInfo.tiktoken_vocab_size.toLocaleString()} tokens
            </span>
          </div>
        )}
      </header>

      {/* ── Input Area ── */}
      <div style={{
        background: 'var(--surface)',
        border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter text here to see how it gets tokenised…"
          rows={6}
          style={{
            width: '100%',
            padding: '16px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '15px',
            lineHeight: 1.7,
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '120px',
          }}
        />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {loading && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Tokenising…
              </span>
            )}
            {result && !loading && (
              <>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{result.character_count}</strong> characters
                </span>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span style={{ fontSize: '13px', color: '#5c8fd9' }}>
                  <strong>{result.simple.token_count}</strong> simple tokens
                </span>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span style={{ fontSize: '13px', color: '#9c7dce' }}>
                  <strong>{result.tiktoken.token_count}</strong> TikToken tokens
                </span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleClear}
              style={{
                padding: '6px 16px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Clear
            </button>
            <button
              onClick={handleExample}
              style={{
                padding: '6px 16px',
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
              Show example
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#2a0f0f',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--danger)',
          fontSize: '13px',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Two-column panels ── */}
      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}>
        <TokenizerPanel result={result?.simple ?? null} isSimple={true} />
        <TokenizerPanel result={result?.tiktoken ?? null} isSimple={false} />
      </div>

      {/* ── Expand the vocabulary (upload) ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>📄</span>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Expand the Simple vocabulary
          </h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.7, marginBottom: '14px' }}>
          Upload a <strong style={{ color: 'var(--text-primary)' }}>.txt</strong> or{' '}
          <strong style={{ color: 'var(--text-primary)' }}>.pdf</strong> file (max 10 MB).
          New words are reviewed against TikToken — words it recognises are{' '}
          <strong style={{ color: '#5c8fd9' }}>admitted</strong> into the Simple vocabulary,
          and the rest are saved to a backlog for a future BPE tokeniser.
        </p>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '8px 18px',
              background: uploading ? 'var(--surface-2)' : 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              cursor: uploading ? 'default' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {uploading ? 'Reviewing…' : 'Choose file & upload'}
          </button>
        </div>

        {uploadError && (
          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            background: '#2a0f0f',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--danger)',
            fontSize: '13px',
          }}>
            ⚠ {uploadError}
          </div>
        )}

        {uploadResult && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {uploadResult.candidate_count.toLocaleString()} new candidate(s)
              </span>
              <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#1a2a3f', border: '1px solid #5c8fd9', fontSize: '12px', color: '#5c8fd9' }}>
                {uploadResult.admitted_count.toLocaleString()} admitted
              </span>
              <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#2a1a3f', border: '1px solid #9c7dce', fontSize: '12px', color: '#9c7dce' }}>
                {uploadResult.rejected_count.toLocaleString()} saved for BPE
              </span>
              <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                New vocab size: {uploadResult.new_vocab_size.toLocaleString()}
              </span>
            </div>

            {uploadResult.admitted_count > 0 && (
              <WordSample label="Admitted into Simple vocab" color="#5c8fd9" words={uploadResult.admitted} />
            )}
            {uploadResult.rejected_count > 0 && (
              <WordSample label="Saved for future BPE" color="#9c7dce" words={uploadResult.rejected} />
            )}
          </div>
        )}
      </div>

      {/* ── Comparison insight ── */}
      {result && (
        <div style={{
          padding: '16px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>Comparison insight: </strong>
          The simple tokeniser produced{' '}
          <strong style={{ color: '#5c8fd9' }}>{result.simple.token_count} tokens</strong>
          {' '}vs TikToken's{' '}
          <strong style={{ color: '#9c7dce' }}>{result.tiktoken.token_count} tokens</strong>
          {' '}for {result.character_count} characters.
          {result.simple.tokens.filter(t => t.is_unk).length > 0 && (
            <span>
              {' '}{result.simple.tokens.filter(t => t.is_unk).length} word(s) were unknown to the simple tokeniser and mapped to{' '}
              <code style={{ fontSize: '12px', background: 'var(--tok-unk-bg)', color: 'var(--tok-unk-fg)', padding: '1px 5px', borderRadius: '3px' }}>&lt;UNK&gt;</code>.
              TikToken handles all words via BPE sub-word splitting.
            </span>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <footer style={{
        marginTop: 'auto',
        paddingTop: '24px',
        borderTop: '1px solid var(--border)',
        fontSize: '12px',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <span>
          Simple Tokeniser vocabulary built from a multi-book public-domain
          corpus · TikToken cl100k_base (GPT-4/3.5)
        </span>
        <span>Confidential | 7EDGE</span>
      </footer>
    </div>
  );
}
