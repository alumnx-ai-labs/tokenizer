import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TokenDisplay from '../components/TokenDisplay';

describe('TokenDisplay', () => {
  it('returns null for null tokens', () => {
    const { container } = render(<TokenDisplay tokens={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null for empty token array', () => {
    const { container } = render(<TokenDisplay tokens={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a span for each token', () => {
    const tokens = [
      { token: 'hello', token_id: 1, is_unk: false },
      { token: 'world', token_id: 2, is_unk: false },
    ];
    render(<TokenDisplay tokens={tokens} />);
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('replaces space tokens with middle dot (·)', () => {
    render(<TokenDisplay tokens={[{ token: ' ', token_id: 1, is_unk: false }]} />);
    expect(screen.getByText('·')).toBeInTheDocument();
  });

  it('replaces spaces inside tokens with middle dots', () => {
    render(<TokenDisplay tokens={[{ token: ' hello', token_id: 1, is_unk: false }]} />);
    expect(screen.getByText('·hello')).toBeInTheDocument();
  });

  it('shows token ID in tooltip', () => {
    render(<TokenDisplay tokens={[{ token: 'hello', token_id: 42, is_unk: false }]} />);
    expect(screen.getByTitle(/42/)).toBeInTheDocument();
  });

  it('includes [UNK] in tooltip for unknown tokens', () => {
    render(<TokenDisplay tokens={[{ token: 'xyzzy', token_id: 0, is_unk: true }]} />);
    expect(screen.getByTitle(/\[UNK\]/)).toBeInTheDocument();
  });

  it('does not include [UNK] in tooltip for known tokens', () => {
    render(<TokenDisplay tokens={[{ token: 'hello', token_id: 1, is_unk: false }]} />);
    const span = screen.getByText('hello');
    expect(span.getAttribute('title')).not.toContain('[UNK]');
  });

  it('UNK tokens use the unk CSS variable for background', () => {
    render(<TokenDisplay tokens={[{ token: 'xyzzy', token_id: 0, is_unk: true }]} />);
    const span = screen.getByText('xyzzy');
    expect(span.style.background).toBe('var(--tok-unk-bg)');
  });

  it('non-UNK tokens use color-cycle CSS variables for background', () => {
    render(<TokenDisplay tokens={[{ token: 'hello', token_id: 1, is_unk: false }]} />);
    const span = screen.getByText('hello');
    expect(span.style.background).toMatch(/var\(--tok-\d-bg\)/);
  });

  it('cycles through 6 colors for consecutive tokens', () => {
    const tokens = Array.from({ length: 7 }, (_, i) => ({
      token: `tok${i}`,
      token_id: i,
      is_unk: false,
    }));
    render(<TokenDisplay tokens={tokens} />);
    const tok0 = screen.getByText('tok0');
    const tok6 = screen.getByText('tok6');
    // index 0 and index 6 both use color 0 (6 % 6 === 0)
    expect(tok0.style.background).toBe(tok6.style.background);
  });
});
