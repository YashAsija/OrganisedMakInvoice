import React from 'react';
import { ClassicPDFTemplate } from './ClassicPDFTemplate';
import { ModernPDFTemplate } from './ModernPDFTemplate';

export const getPDFTemplate = (templateStyle?: string) => {
  const style = (templateStyle || '').toLowerCase();
  if (style.includes('modern')) {
    return ModernPDFTemplate;
  }
  return ClassicPDFTemplate;
};

export { ClassicPDFTemplate, ModernPDFTemplate };
