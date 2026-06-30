import { useState, useEffect, useRef } from 'react';
import TokenizerPanel from './components/TokenizerPanel';
import AnalyticsDashboard from './components/AnalyticsDashboard';
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

export default function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vocabInfo, setVocabInfo] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const debouncedText = useDebounce(text, 300);
  const abortRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/vocab-info`)
      .then(r => r.json())
      .then(setVocabInfo)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!debouncedText.trim()) {
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    Promise.resolve().then(() => {
      setLoading(true);
      setError(null);
    });

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
  }, [debouncedText, refreshKey]);

  const handleClear = () => {
    setText('');
    setResult(null);
    setError(null);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      event.target.value = '';
      return;
    }

    // Reset input so the same file can be uploaded again
    event.target.value = '';

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API}/api/extract-text`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      const data = await response.json();
      if (data.text) {
        setText(data.text);
      } else {
        setError('Could not extract text from the file.');
      }
    } catch {
      setError('Error uploading file. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleTokensAdded = () => {
    setRefreshKey(k => k + 1);
    fetch(`${API}/api/vocab-info`)
      .then(r => r.json())
      .then(setVocabInfo)
      .catch(() => {});
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
          <strong style={{ color: '#5c8fd9' }}>Simple regex tokeniser</strong> (vocabulary built from{' '}
          <em>combined books corpus</em>) handles it versus{' '}
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
          onChange={e => {
            const val = e.target.value;
            setText(val);
            if (!val.trim()) {
              setResult(null);
              setError(null);
            }
          }}
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
            {/* Hidden file input */}
            <input
              type="file"
              accept=".txt,.pdf"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
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
              Upload file
            </button>
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
        <TokenizerPanel result={result?.simple ?? null} isSimple={true} onTokensAdded={handleTokensAdded} />
        <TokenizerPanel result={result?.tiktoken ?? null} isSimple={false} />
      </div>

      {/* ── Analytics Dashboard ── */}
      {result && <AnalyticsDashboard result={result} />}

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
          Simple Tokeniser vocabulary built from{' '}
          <em>combined books corpus</em> · TikToken cl100k_base (GPT-4/3.5)
        </span>
        <span>Confidential | 7EDGE</span>
      </footer>
    </div>
  );
}
