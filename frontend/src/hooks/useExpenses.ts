import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Expense } from '../types';

export interface ExpenseStats {
  totalExpenses: number;
  paidExpenses: number;
  pendingExpenses: number;
  thisMonthExpenses: number;
  count: number;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setExpenses([]);
        setLoading(false);
        return;
      }

      // Try fetching with userId first (matching existing App.tsx convention)
      let { data, error: fetchErr } = await supabase
        .from('expenses')
        .select('*')
        .eq('userId', user.id);

      // Fallback if userId column doesn't exist on expenses table
      if (fetchErr) {
        const fallback = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id);

        if (!fallback.error) {
          data = fallback.data;
          fetchErr = null;
        } else {
          // If both eq filters fail, select all and filter client-side
          const allRes = await supabase.from('expenses').select('*');
          if (!allRes.error && allRes.data) {
            data = allRes.data.filter((r: any) => r.userId === user.id || r.user_id === user.id);
            fetchErr = null;
          }
        }
      }

      if (fetchErr) {
        throw fetchErr;
      }

      // Normalize records so both expense_date and date, user_id and userId are available
      const normalized: Expense[] = (data || []).map((exp: any) => ({
        ...exp,
        id: exp.id,
        user_id: exp.user_id || exp.userId || user.id,
        userId: exp.userId || exp.user_id || user.id,
        expense_date: exp.expense_date || exp.date || new Date().toISOString().split('T')[0],
        date: exp.date || exp.expense_date || new Date().toISOString().split('T')[0],
        category: exp.category || 'General',
        vendor: exp.vendor || exp.payee || exp.description || 'General Payee',
        description: exp.description || null,
        amount: Number(exp.amount) || 0,
        payment_mode: exp.payment_mode || exp.paymentMode || 'Cash',
        reference_number: exp.reference_number || exp.referenceNumber || null,
        status: (exp.status === 'pending' || exp.status === 'Paid' || exp.status === 'paid')
          ? (String(exp.status).toLowerCase() === 'pending' ? 'pending' : 'paid')
          : 'paid',
      }));

      // Sort descending by date
      normalized.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());

      setExpenses(normalized);
    } catch (err: any) {
      console.error('Error fetching expenses from Supabase:', err);
      setError(err?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const createExpense = async (payload: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'userId' | 'date' | 'createdAt'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Initial payload containing client-generated ID + all possible fields
    const currentPayload: Record<string, any> = {
      id: generatedId,
      userId: user.id,
      user_id: user.id,
      date: payload.expense_date,
      expense_date: payload.expense_date,
      category: payload.category,
      vendor: payload.vendor,
      description: payload.description || null,
      amount: Number(payload.amount),
      payment_mode: payload.payment_mode,
      reference_number: payload.reference_number || null,
      status: payload.status,
    };

    let resultData: any = null;
    let lastError: any = null;

    // Retry loop that auto-prunes missing columns identified by Supabase while preserving id
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data, error } = await supabase
        .from('expenses')
        .insert(currentPayload)
        .select()
        .single();

      if (!error) {
        resultData = data || currentPayload;
        lastError = null;
        break;
      }

      lastError = error;
      const errorMsg = error.message || '';

      // Match missing column name from Supabase error message
      const match = errorMsg.match(/Could not find the '([^']+)' column/i) || 
                    errorMsg.match(/column "?([^"']+)"? of relation "?expenses"? does not exist/i);

      if (match && match[1]) {
        const missingCol = match[1];
        if (missingCol !== 'id') {
          console.warn(`Supabase expenses table missing column '${missingCol}'. Auto-pruning and retrying...`);
          delete currentPayload[missingCol];
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (lastError && !resultData) {
      // Minimal fallback insert with id, userId, date, category, amount
      const minPayload: any = {
        id: generatedId,
        userId: user.id,
        date: payload.expense_date,
        category: payload.category,
        amount: Number(payload.amount),
      };
      const minRes = await supabase.from('expenses').insert(minPayload).select().single();
      if (!minRes.error) {
        resultData = minRes.data || minPayload;
      } else {
        throw lastError;
      }
    }

    await fetchExpenses();
    return resultData as Expense;
  };

  const updateExpense = async (id: string, payload: Partial<Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'userId' | 'date' | 'createdAt'>>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const currentPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (payload.expense_date) {
      currentPayload.date = payload.expense_date;
      currentPayload.expense_date = payload.expense_date;
    }
    if (payload.category) currentPayload.category = payload.category;
    if (payload.vendor) currentPayload.vendor = payload.vendor;
    if (payload.description !== undefined) currentPayload.description = payload.description;
    if (payload.amount !== undefined) currentPayload.amount = Number(payload.amount);
    if (payload.payment_mode) currentPayload.payment_mode = payload.payment_mode;
    if (payload.reference_number) currentPayload.reference_number = payload.reference_number;
    if (payload.status) currentPayload.status = payload.status;

    let resultData: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      const { data, error } = await supabase
        .from('expenses')
        .update(currentPayload)
        .eq('id', id)
        .select()
        .single();

      if (!error) {
        resultData = data;
        lastError = null;
        break;
      }

      lastError = error;
      const errorMsg = error.message || '';

      const match = errorMsg.match(/Could not find the '([^']+)' column/i) || 
                    errorMsg.match(/column "?([^"']+)"? of relation "?expenses"? does not exist/i);

      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`Supabase update missing column '${missingCol}'. Auto-pruning...`);
        delete currentPayload[missingCol];
        if (Object.keys(currentPayload).length === 0) break;
      } else {
        break;
      }
    }

    if (lastError && !resultData) throw lastError;
    await fetchExpenses();
    return resultData as Expense;
  };

  const deleteExpense = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error: deleteErr } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;
    await fetchExpenses();
  };

  // Compute summary stats
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const paidExpenses = expenses
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const pendingExpenses = expenses
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const thisMonthExpenses = expenses
    .filter(e => {
      const d = new Date(e.expense_date || e.date || '');
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const stats: ExpenseStats = {
    totalExpenses,
    paidExpenses,
    pendingExpenses,
    thisMonthExpenses,
    count: expenses.length,
  };

  return {
    expenses,
    loading,
    error,
    stats,
    refetch: fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
