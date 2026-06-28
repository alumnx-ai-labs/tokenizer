"""
Unit tests for the pure tokenizer utility functions in main.py.
These tests do NOT require the HTTP server or external corpus files.
"""
import sys
import os

# Add the backend directory to sys.path so we can import main.py directly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from main import _tokenize_regex


# ──────────────────────────────────────────────────────────
# _tokenize_regex
# ──────────────────────────────────────────────────────────

class TestTokenizeRegex:
    def test_empty_string_returns_empty_list(self):
        assert _tokenize_regex("") == []

    def test_whitespace_only_returns_empty_list(self):
        assert _tokenize_regex("   \t\n  ") == []

    def test_single_word(self):
        assert _tokenize_regex("hello") == ["hello"]

    def test_simple_sentence_splits_on_spaces(self):
        result = _tokenize_regex("hello world")
        assert result == ["hello", "world"]

    def test_comma_is_separate_token(self):
        result = _tokenize_regex("hello, world")
        assert "," in result
        assert "hello" in result
        assert "world" in result

    def test_period_is_separate_token(self):
        result = _tokenize_regex("end.")
        assert "." in result
        assert "end" in result

    def test_double_dash_is_single_token(self):
        result = _tokenize_regex("genius--though")
        assert "--" in result
        assert "genius" in result
        assert "though" in result

    def test_exclamation_mark_is_separate_token(self):
        result = _tokenize_regex("Wow!")
        assert "!" in result
        assert "Wow" in result

    def test_question_mark_is_separate_token(self):
        result = _tokenize_regex("Why?")
        assert "?" in result
        assert "Why" in result

    def test_colon_is_separate_token(self):
        result = _tokenize_regex("note: here")
        assert ":" in result

    def test_semicolon_is_separate_token(self):
        result = _tokenize_regex("one; two")
        assert ";" in result

    def test_parentheses_are_separate_tokens(self):
        result = _tokenize_regex("(hello)")
        assert "(" in result
        assert ")" in result
        assert "hello" in result

    def test_single_quote_is_separate_token(self):
        result = _tokenize_regex("it's")
        assert "'" in result

    def test_double_quote_is_separate_token(self):
        result = _tokenize_regex('"word"')
        assert '"' in result
        assert "word" in result

    def test_underscore_is_separate_token(self):
        result = _tokenize_regex("snake_case")
        assert "_" in result

    def test_no_empty_strings_in_output(self):
        result = _tokenize_regex("  hello   world  ")
        assert "" not in result
        assert all(t.strip() != "" for t in result)

    def test_multiple_spaces_collapsed(self):
        result = _tokenize_regex("a  b")
        assert "" not in result

    def test_newline_removed_from_tokens(self):
        result = _tokenize_regex("line1\nline2")
        assert "\n" not in result
        assert "line1" in result
        assert "line2" in result

    def test_realistic_sentence(self):
        text = "I had always thought Jack Gisburn rather a cheap genius--though a good fellow enough--so it was no great surprise to me"
        result = _tokenize_regex(text)
        assert "I" in result
        assert "Jack" in result
        assert "Gisburn" in result
        assert "--" in result
        assert "genius" in result
        assert len(result) > 10

    def test_all_punctuation_types(self):
        text = "a,b.c:d;e?f_g!h(i)j\"k'l--m"
        result = _tokenize_regex(text)
        for punct in [",", ".", ":", ";", "?", "_", "!", "(", ")", '"', "'", "--"]:
            assert punct in result, f"Expected '{punct}' to be a token"
