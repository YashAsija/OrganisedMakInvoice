import React from 'react';
import { ExpensesPage } from '../ExpensesPage';

export interface ExpensesTabProps {
  expenses?: any[];
  onSaveExpense?: (expense: any) => void;
  onDeleteExpense?: (id: string) => void;
  theme?: 'light' | 'dark';
  currencySymbol?: string;
  [key: string]: any;
}

export default function ExpensesTab(props: ExpensesTabProps) {
  return <ExpensesPage {...props} />;
}
