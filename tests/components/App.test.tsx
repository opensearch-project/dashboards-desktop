import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { App } from '../../src/renderer/App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText(/OpenSearch Dashboards Desktop/)).toBeTruthy();
  });

  it('shows M1 foundation label', () => {
    render(<App />);
    expect(screen.getByText(/M1 Foundation/)).toBeTruthy();
  });

  it('shows chat placeholder message', () => {
    render(<App />);
    expect(screen.getByText(/Connect a model to start chatting/)).toBeTruthy();
  });

  it('shows M2 deferral note', () => {
    render(<App />);
    expect(screen.getByText(/agent runtime ships in M2/)).toBeTruthy();
  });
});
