import { CSSProperties } from "react";

export const v2Theme = {
  colors: {
    // Primary colors
    primary: {
      light: '#667eea',
      DEFAULT: '#667eea',
      dark: '#764ba2',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    
    // Background colors
    background: {
      DEFAULT: '#000000',
      dark: '#000000',
      light: '#0a0a0a',
      card: 'rgba(20, 20, 20, 0.8)',
      cardLight: 'rgba(30, 30, 30, 0.6)',
      glass: 'rgba(0, 0, 0, 0.5)',
      glassLight: 'rgba(255, 255, 255, 0.1)',
    },
    
    // Text colors
    text: {
      DEFAULT: '#ffffff',
      muted: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.4)',
      inverse: '#000000',
    },
    
    // Accent colors
    accent: {
      red: '#ff6b6b',
      orange: '#ff8e53',
      yellow: '#ffd93d',
      green: '#22c55e',
      blue: '#3b82f6',
      purple: '#667eea',
      pink: '#ff6b9d',
    },
    
    // Border colors
    border: {
      DEFAULT: 'rgba(255, 255, 255, 0.1)',
      light: 'rgba(255, 255, 255, 0.15)',
      heavy: 'rgba(255, 255, 255, 0.2)',
    },
    
    // Status colors
    status: {
      success: '#22c55e',
      warning: '#ff8e53',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
  },
  
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
    xl: '0 12px 32px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px rgba(102, 126, 234, 0.3)',
    glowStrong: '0 0 30px rgba(102, 126, 234, 0.5)',
  },
  
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
    },
    
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.6,
    },
  },
  
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  
  effects: {
    blur: {
      sm: 'blur(4px)',
      md: 'blur(8px)',
      lg: 'blur(12px)',
      xl: 'blur(20px)',
      '2xl': 'blur(40px)',
    },
    
    backdrop: 'blur(20px)',
    backdropLight: 'blur(10px)',
  },
};

export const getV2Styles = () => {
  return `
    :root {
      --v2-bg-primary: ${v2Theme.colors.background.DEFAULT};
      --v2-bg-secondary: ${v2Theme.colors.background.light};
      --v2-bg-card: ${v2Theme.colors.background.card};
      --v2-bg-glass: ${v2Theme.colors.background.glass};
      --v2-bg-glass-light: ${v2Theme.colors.background.glassLight};
      
      --v2-text-primary: ${v2Theme.colors.text.DEFAULT};
      --v2-text-muted: ${v2Theme.colors.text.muted};
      --v2-text-disabled: ${v2Theme.colors.text.disabled};
      
      --v2-primary: ${v2Theme.colors.primary.DEFAULT};
      --v2-primary-gradient: ${v2Theme.colors.primary.gradient};
      
      --v2-border: ${v2Theme.colors.border.DEFAULT};
      --v2-border-light: ${v2Theme.colors.border.light};
      
      --v2-radius-sm: ${v2Theme.borderRadius.sm};
      --v2-radius-md: ${v2Theme.borderRadius.md};
      --v2-radius-lg: ${v2Theme.borderRadius.lg};
      --v2-radius-xl: ${v2Theme.borderRadius.xl};
      --v2-radius-full: ${v2Theme.borderRadius.full};
      
      --v2-shadow-glow: ${v2Theme.shadows.glow};
      --v2-shadow-glow-strong: ${v2Theme.shadows.glowStrong};
      
      --v2-backdrop-blur: ${v2Theme.effects.backdrop};
      --v2-backdrop-blur-light: ${v2Theme.effects.backdropLight};
      
      --v2-font-sans: ${v2Theme.typography.fontFamily.sans};
    }
    
    .v2-theme {
      font-family: var(--v2-font-sans);
      background: var(--v2-bg-primary);
      color: var(--v2-text-primary);
    }
    
    .v2-glass {
      background: var(--v2-bg-glass);
      backdrop-filter: var(--v2-backdrop-blur);
      border: 1px solid var(--v2-border);
    }
    
    .v2-card {
      background: var(--v2-bg-card);
      backdrop-filter: var(--v2-backdrop-blur);
      border: 1px solid var(--v2-border);
      border-radius: var(--v2-radius-lg);
    }
    
    .v2-glass-light {
      background: var(--v2-bg-glass-light);
      backdrop-filter: var(--v2-backdrop-blur-light);
      border: 1px solid var(--v2-border-light);
    }
    
    .v2-primary-gradient {
      background: var(--v2-primary-gradient);
    }
    
    .v2-glow {
      box-shadow: var(--v2-shadow-glow);
    }
    
    .v2-glow-strong {
      box-shadow: var(--v2-shadow-glow-strong);
    }
  `;
};

export const applyV2Theme = () => {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = getV2Styles();
    document.head.appendChild(style);
  }
};