import { useState, useCallback } from 'react';
import { InvoiceTemplate } from '../types';

export function useTemplateHistory(initialTemplate: InvoiceTemplate) {
  const upgradeTemplate = (template: InvoiceTemplate) => {
    if (!template?.config?.table?.columns) return template;
    const upgraded = JSON.parse(JSON.stringify(template)) as InvoiceTemplate;
    const columns = upgraded.config.table.columns;
    type ColType = InvoiceTemplate['config']['table']['columns'][0];
    if (!columns.find((c: ColType) => c.id === 'hsn')) {
      columns.push({ id: 'hsn', visible: false, label: 'HSN/SAC', type: 'Text', order: 3 });
    }
    if (!columns.find((c: ColType) => c.id === 'tax')) {
      columns.push({ id: 'tax', visible: false, label: 'Tax %', type: 'Number', order: 6 });
    }
    const desiredOrder = ['sr', 'name', 'hsn', 'qty', 'rate', 'tax', 'amount'];
    columns.forEach((col: ColType) => {
      const idx = desiredOrder.indexOf(col.id);
      if (idx !== -1) col.order = idx + 1;
    });
    upgraded.config.table.columns = columns.sort((a: ColType, b: ColType) => a.order - b.order);
    return upgraded;
  };

  const [history, setHistory] = useState<InvoiceTemplate[]>([upgradeTemplate(initialTemplate)]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const currentTemplate = history[currentIndex];

  const updateTemplate = useCallback((newTemplate: InvoiceTemplate) => {
    setHistory(prev => {
      // Discard future history if we're making a new change after an undo
      const past = prev.slice(0, currentIndex + 1);
      return [...past, newTemplate];
    });
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (canUndo) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [canRedo]);

  return {
    template: currentTemplate,
    updateTemplate,
    undo,
    redo,
    canUndo,
    canRedo
  };
}
