import React, { createContext, useContext, useReducer, useEffect, ReactNode, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Goal, ScheduledTransaction } from '@/types';
import { setupAuthListener, getCurrentSession } from '@/services/authService';
import { recalculateGoalAmounts as recalculateGoalAmountsService } from '@/services/goalService';
import { getNextReferenceCode } from '@/utils/referenceCodeUtils';

// Use database types directly from Supabase
interface Category {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string | null;
  is_default: boolean | null;
}

interface AppState {
  transactions: Transaction[];
  categories: Category[];
  goals: Goal[];
  scheduledTransactions: ScheduledTransaction[];
  isLoading: boolean;
  error: string | null;
  user: any;
  userTimezone: string | undefined;
  hideValues: boolean;
  timeRange: string;
  customStartDate: Date | null;
  customEndDate: Date | null;
  filteredTransactions: Transaction[];
}

type AppAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_GOALS'; payload: Goal[] }
  | { type: 'SET_SCHEDULED_TRANSACTIONS'; payload: ScheduledTransaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL'; payload: Goal }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'ADD_SCHEDULED_TRANSACTION'; payload: ScheduledTransaction }
  | { type: 'UPDATE_SCHEDULED_TRANSACTION'; payload: ScheduledTransaction }
  | { type: 'DELETE_SCHEDULED_TRANSACTION'; payload: string }
  | { type: 'SET_USER'; payload: any }
  | { type: 'SET_USER_TIMEZONE'; payload: string | undefined }
  | { type: 'TOGGLE_HIDE_VALUES' }
  | { type: 'SET_TIME_RANGE'; payload: string }
  | { type: 'SET_CUSTOM_DATE_RANGE'; payload: { start: Date | null; end: Date | null } }
  | { type: 'SET_FILTERED_TRANSACTIONS'; payload: Transaction[] };

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  user: any;
  userTimezone: string | undefined;
  hideValues: boolean;
  toggleHideValues: () => void;
  logout: () => Promise<void>;
  setCustomDateRange: (start: Date | null, end: Date | null) => void;
  // Data access
  transactions: Transaction[];
  categories: Category[];
  goals: Goal[];
  scheduledTransactions: ScheduledTransaction[];
  filteredTransactions: Transaction[];
  isLoading: boolean;
  // Time range properties
  timeRange: string;
  setTimeRange: (range: string) => void;
  customStartDate: Date | null;
  customEndDate: Date | null;
  // Data fetching methods
  getTransactions: () => Promise<Transaction[]>;
  getGoals: () => Promise<Goal[]>;
  recalculateGoalAmounts: () => Promise<boolean>;
  updateUserProfile: (data: any) => Promise<void>;
  // Transaction actions
  addTransaction: (transaction: Omit<Transaction, 'id' | 'created_at'>) => Promise<Transaction>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  // Category actions
  addCategory: (category: Omit<Category, 'id' | 'created_at'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  // Goal actions
  addGoal: (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>, categoryId?: string, type?: 'income' | 'expense') => Promise<void>;
  updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  // Scheduled Transaction actions
  addScheduledTransaction: (transaction: Omit<ScheduledTransaction, 'id' | 'created_at'>) => Promise<void>;
  updateScheduledTransaction: (id: string, transaction: Partial<ScheduledTransaction>) => Promise<void>;
  deleteScheduledTransaction: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  transactions: [],
  categories: [],
  goals: [],
  scheduledTransactions: [],
  isLoading: true, // Start with loading true
  error: null,
  user: null,
  userTimezone: undefined,
  hideValues: false,
  timeRange: '30days',
  customStartDate: null,
  customEndDate: null,
  filteredTransactions: [],
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_GOALS':
      return { ...state, goals: action.payload };
    case 'SET_SCHEDULED_TRANSACTIONS':
      return { ...state, scheduledTransactions: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_USER_TIMEZONE':
      return { ...state, userTimezone: action.payload };
    case 'TOGGLE_HIDE_VALUES':
      return { ...state, hideValues: !state.hideValues };
    case 'SET_TIME_RANGE':
      return { ...state, timeRange: action.payload };
    case 'SET_CUSTOM_DATE_RANGE':
      return { ...state, customStartDate: action.payload.start, customEndDate: action.payload.end };
    case 'SET_FILTERED_TRANSACTIONS':
      return { ...state, filteredTransactions: action.payload };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(t => 
          t.id === action.payload.id ? action.payload : t
        )
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.payload)
      };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(c => 
          c.id === action.payload.id ? action.payload : c
        )
      };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload)
      };
    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.payload] };
    case 'UPDATE_GOAL':
      return {
        ...state,
        goals: state.goals.map(g => 
          g.id === action.payload.id ? action.payload : g
        )
      };
    case 'DELETE_GOAL':
      return {
        ...state,
        goals: state.goals.filter(g => g.id !== action.payload)
      };
    case 'ADD_SCHEDULED_TRANSACTION':
      return { ...state, scheduledTransactions: [...state.scheduledTransactions, action.payload] };
    case 'UPDATE_SCHEDULED_TRANSACTION':
      return {
        ...state,
        scheduledTransactions: state.scheduledTransactions.map(st => 
          st.id === action.payload.id ? action.payload : st
        )
      };
    case 'DELETE_SCHEDULED_TRANSACTION':
      return {
        ...state,
        scheduledTransactions: state.scheduledTransactions.filter(st => st.id !== action.payload)
      };
    default:
      return state;
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper function to get current user with better error handling
  const getCurrentUser = async () => {
    try {
      const session = await getCurrentSession();
      if (!session?.user) {
        throw new Error('User not authenticated');
      }
      return session.user;
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  };

  // Helper function to transform database types to proper types
  const transformTransaction = (dbTransaction: any): Transaction => {
    return {
      id: dbTransaction.id,
      type: dbTransaction.type as 'income' | 'expense',
      amount: dbTransaction.amount,
      category: dbTransaction.category?.name || 'Unknown',
      categoryIcon: dbTransaction.category?.icon || 'circle',
      categoryColor: dbTransaction.category?.color || '#607D8B',
      description: dbTransaction.description || '',
      date: dbTransaction.date,
      goalId: dbTransaction.goal_id,
      category_id: dbTransaction.category_id,
      goal_id: dbTransaction.goal_id,
      user_id: dbTransaction.user_id,
      created_at: dbTransaction.created_at,
      status: dbTransaction.status || 'pending', // Adicionar campo status
      creatorName: dbTransaction.name || undefined,
      conta_id: dbTransaction.conta_id || undefined,
      formato: dbTransaction.formato || undefined,
    };
  };

  const transformCategory = (dbCategory: any): Category => ({
    ...dbCategory,
    type: dbCategory.type as 'income' | 'expense',
  });

  const transformGoal = (dbGoal: any): Goal => ({
    id: dbGoal.id,
    name: dbGoal.name,
    targetAmount: dbGoal.target_amount,
    currentAmount: dbGoal.current_amount || 0,
    startDate: dbGoal.start_date,
    endDate: dbGoal.end_date,
    deadline: dbGoal.deadline,
    color: dbGoal.color || '#3B82F6',
    type: dbGoal.type as 'income' | 'expense',
    transactions: [],
    target_amount: dbGoal.target_amount,
    current_amount: dbGoal.current_amount,
    start_date: dbGoal.start_date,
    end_date: dbGoal.end_date,
    category_id: dbGoal.category_id,
    user_id: dbGoal.user_id,
    created_at: dbGoal.created_at,
    updated_at: dbGoal.updated_at,
    conta_id: dbGoal.conta_id,
  });

  const transformScheduledTransaction = (dbScheduledTransaction: any): ScheduledTransaction => {
    const categoryName = dbScheduledTransaction.category?.name || 'Outros';
    const categoryIcon = dbScheduledTransaction.category?.icon || 'DollarSign';
    const categoryColor = dbScheduledTransaction.category?.color || '#6B7280';
    return {
      id: dbScheduledTransaction.id,
      type: dbScheduledTransaction.type as 'income' | 'expense',
      amount: dbScheduledTransaction.amount,
      category: categoryName,
      categoryIcon: categoryIcon,
      categoryColor: categoryColor,
      description: dbScheduledTransaction.description || '',
      scheduledDate: dbScheduledTransaction.scheduled_date,
      recurrence: dbScheduledTransaction.recurrence as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly',
      goalId: dbScheduledTransaction.goal_id,
      status: dbScheduledTransaction.status as 'pending' | 'paid' | 'overdue' | 'upcoming',
      paidDate: dbScheduledTransaction.paid_date,
      paidAmount: dbScheduledTransaction.paid_amount,
      lastExecutionDate: dbScheduledTransaction.last_execution_date,
      nextExecutionDate: dbScheduledTransaction.next_execution_date,
      category_id: dbScheduledTransaction.category_id,
      goal_id: dbScheduledTransaction.goal_id,
      user_id: dbScheduledTransaction.user_id,
      scheduled_date: dbScheduledTransaction.scheduled_date,
      paid_date: dbScheduledTransaction.paid_date,
      last_execution_date: dbScheduledTransaction.last_execution_date,
      next_execution_date: dbScheduledTransaction.next_execution_date,
      created_at: dbScheduledTransaction.created_at,
    };
  };

  // Filter transactions based on time range
  const filterTransactionsByTimeRange = (transactions: Transaction[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    if (state.timeRange === 'custom' && state.customStartDate && state.customEndDate) {
      startDate = state.customStartDate;
      endDate = state.customEndDate;
    } else {
      switch (state.timeRange) {
        case 'today':
          startDate = today;
          endDate = today;
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = yesterday;
          endDate = yesterday;
          break;
        case '7days':
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
          startDate = sevenDaysAgo;
          endDate = today;
          break;
        case '14days':
          const fourteenDaysAgo = new Date(today);
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
          startDate = fourteenDaysAgo;
          endDate = today;
          break;
        case '30days':
        default:
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
          startDate = thirtyDaysAgo;
          endDate = today;
          break;
      }
    }
    
    if (!startDate || !endDate) return transactions;
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionDateOnly = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
      return transactionDateOnly >= startDate && transactionDateOnly <= endDate;
    });
  };

  // Update filtered transactions when transactions or time range changes
  useEffect(() => {
    console.log('🔄 [FILTER DEBUG] AppContext: Filtering transactions...', {
      totalTransactions: state.transactions.length,
      timeRange: state.timeRange,
      customStartDate: state.customStartDate?.toLocaleDateString(),
      customEndDate: state.customEndDate?.toLocaleDateString(),
      timestamp: new Date().toISOString()
    });
    
    const filtered = filterTransactionsByTimeRange(state.transactions);
    
    console.log('📊 [FILTER DEBUG] AppContext: Filtered result:', {
      filteredCount: filtered.length,
      recentTransactions: filtered.slice(0, 3).map(t => ({ 
        id: t.id, 
        amount: t.amount, 
        date: t.date, 
        type: t.type,
        description: t.description 
      })),
      timestamp: new Date().toISOString()
    });
    
    dispatch({ type: 'SET_FILTERED_TRANSACTIONS', payload: filtered });
  }, [state.transactions, state.timeRange, state.customStartDate, state.customEndDate]);

  // Setup auth state listener and initial session check
  useEffect(() => {
    let mounted = true;
    let realtimeSubscription: any = null;
    
    // console.log('AppContext: Setting up auth listener and checking session');
    
    const handleAuthChange = async (session: any) => {
      if (!mounted) return;
      
      // console.log('AppContext: Auth state changed', { 
      //   hasSession: !!session, 
      //   userEmail: session?.user?.email,
      //   userId: session?.user?.id 
      // });
      
      if (session?.user) {
        dispatch({ type: 'SET_USER', payload: session.user });
        
        // Only load data if we haven't initialized yet or user changed
        if (!isInitialized || state.user?.id !== session.user.id) {
          // console.log('AppContext: Loading user data for:', session.user.email);
          await loadUserData(session.user);
          
          // Setup realtime subscription for transactions
          setupRealtimeSubscription(session.user.id);
        }
      } else {
        // console.log('AppContext: No session, clearing user data');
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
        dispatch({ type: 'SET_CATEGORIES', payload: [] });
        dispatch({ type: 'SET_GOALS', payload: [] });
        dispatch({ type: 'SET_SCHEDULED_TRANSACTIONS', payload: [] });
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsInitialized(true);
        
        // Cleanup realtime subscription
        if (realtimeSubscription) {
          realtimeSubscription.unsubscribe();
          realtimeSubscription = null;
        }
      }
    };

    const setupRealtimeSubscription = (userId: string) => {
      console.log('🔄 Setting up realtime subscription for user:', userId);
      
      // Clean up existing subscription
      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
      }
      
      realtimeSubscription = supabase
        .channel('transactions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'poupeja_transactions',
            filter: `user_id=eq.${userId}`
          },
          async (payload) => {
            console.log('🔄 Real-time transaction change detected:', payload);
            
            // Reload transactions to get fresh data with category info
            try {
              const { data, error } = await supabase
                .from('poupeja_transactions')
                .select(`
                  *,
                  category:poupeja_categories(id, name, icon, color, type)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

              if (!error && data) {
                const transformedTransactions = data.map((item: any) => ({
                  id: item.id,
                  type: item.type as 'income' | 'expense',
                  amount: item.amount,
                  category: item.category?.name || "Outros",
                  categoryIcon: item.category?.icon || "circle",
                  categoryColor: item.category?.color || "#607D8B",
                  description: item.description || "",
                  date: item.date,
                  goalId: item.goal_id || undefined,
                  creatorName: item.name || undefined,
                  conta_id: item.conta_id || undefined,
                  formato: item.formato || undefined,
                }));
                
                console.log('🔄 Updated transactions from realtime:', transformedTransactions.length);
                dispatch({ type: 'SET_TRANSACTIONS', payload: transformedTransactions });
              }
            } catch (error) {
              console.error('Error reloading transactions after realtime change:', error);
            }
          }
        )
        .subscribe();
    };

    // Set up auth state listener
    const { data: { subscription } } = setupAuthListener(handleAuthChange);

    // Check for existing session
    const checkInitialSession = async () => {
      try {
        // console.log('AppContext: Checking initial session');
        const session = await getCurrentSession();
        
        if (session?.user) {
          // console.log('AppContext: Found existing session for:', session.user.email);
          await handleAuthChange(session);
        } else {
          // console.log('AppContext: No existing session found');
          await handleAuthChange(null);
        }
      } catch (error) {
        console.error('AppContext: Error during initialization:', error);
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsInitialized(true);
      }
    };

    checkInitialSession();

    return () => {
      mounted = false;
      // console.log('AppContext: Cleaning up auth listener');
      subscription.unsubscribe();
      
      // Cleanup realtime subscription
      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
      }
    };
  }, []);

  // Load user data function with better error handling
  const loadUserData = async (user: any) => {
    if (!user?.id) {
      console.error('AppContext: Cannot load data - no user ID');
      return;
    }
    
    try {
      // console.log('AppContext: Loading user data for:', user.email);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Verify user session before making requests
      const session = await getCurrentSession();
      if (!session?.user) {
        throw new Error('Session expired or invalid');
      }
      
      // Load all data in parallel
      const [transactionsRes, categoriesRes, goalsRes, scheduledRes] = await Promise.all([
        supabase.from('poupeja_transactions')
          .select(`
            *,
            category:poupeja_categories(id, name, icon, color, type)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('poupeja_categories').select('*').eq('user_id', user.id),
        supabase.from('poupeja_goals').select('*').eq('user_id', user.id),
        supabase.from('poupeja_scheduled_transactions')
          .select(`
            *,
            category:poupeja_categories(id, name, icon, color, type)
          `)
          .eq('user_id', user.id)
      ]);

      if (transactionsRes.error) {
        console.error('Error loading transactions:', transactionsRes.error);
        throw transactionsRes.error;
      }
      if (categoriesRes.error) {
        console.error('Error loading categories:', categoriesRes.error);
        throw categoriesRes.error;
      }
      if (goalsRes.error) {
        console.error('Error loading goals:', goalsRes.error);
        throw goalsRes.error;
      }
      if (scheduledRes.error) {
        console.error('Error loading scheduled transactions:', scheduledRes.error);
        throw scheduledRes.error;
      }

      // Store categories first, then transform transactions
      const categories = (categoriesRes.data || []).map(transformCategory);
      dispatch({ type: 'SET_CATEGORIES', payload: categories });
      
      // Build dependent map to determine if we should show creator name
      const txRows = (transactionsRes.data || []);
      const userIds = Array.from(new Set(txRows.map((t: any) => t.user_id).filter(Boolean)));
      let depMap = new Map<string, boolean>();
      if (userIds.length > 0) {
        try {
          console.log("DEBUG AppContext: Tentando buscar poupeja_users para userIds:", userIds);
          const { data: usersRows, error: usersError } = await (supabase as any)
            .from('poupeja_users')
            .select('id, dependente, fuso')
            .in('id', userIds);
          
          if (usersError) {
            console.error("DEBUG AppContext: ERRO ao buscar poupeja_users:", usersError);
            console.error("DEBUG AppContext: Verifique permissões RLS para poupeja_users");
          } else {
            console.log("DEBUG AppContext: poupeja_users dados obtidos:", usersRows);
          }
          
          (usersRows || []).forEach((u: any) => depMap.set(String(u.id), u.dependente === true));
          
          // Store timezone for current user
          const currentUserData = (usersRows || []).find((u: any) => u.id === user.id);
          if (currentUserData?.fuso) {
            dispatch({ type: 'SET_USER_TIMEZONE', payload: currentUserData.fuso });
          }
        } catch (error) {
          console.error("DEBUG AppContext: EXCEPTION ao acessar poupeja_users:", error);
        }
      }

      const transactions = txRows.map((row: any) => {
        const base = transformTransaction(row);
        const creatorName = row.name ? row.name : undefined;
        console.log(`DEBUG AppContext: TX ${row.id} - name: ${row.name}, final: ${creatorName}`);
        return { ...base, creatorName } as Transaction;
      });
      dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
      
      const goals = (goalsRes.data || []).map(transformGoal);
      dispatch({ type: 'SET_GOALS', payload: goals });
      
      const scheduledTransactions = (scheduledRes.data || []).map(transformScheduledTransaction);
      dispatch({ type: 'SET_SCHEDULED_TRANSACTIONS', payload: scheduledTransactions });
      
      console.log('AppContext: User data loaded successfully', {
        transactions: transactions.length,
        categories: categories.length,
        goals: goals.length,
        scheduled: scheduledTransactions.length
      });
      
    } catch (error) {
      console.error('AppContext: Error loading user data:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      setIsInitialized(true);
    }
  };

  const toggleHideValues = useCallback(() => {
    dispatch({ type: 'TOGGLE_HIDE_VALUES' });
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    dispatch({ type: 'SET_USER', payload: null });
  }, []);

  const setTimeRange = useCallback((range: string) => {
    dispatch({ type: 'SET_TIME_RANGE', payload: range });
  }, []);

  const setCustomDateRange = useCallback((start: Date | null, end: Date | null) => {
    dispatch({ type: 'SET_CUSTOM_DATE_RANGE', payload: { start, end } });
  }, []);

  // Data fetching methods (memoized to prevent unnecessary re-renders)
  const getTransactions = useCallback(async (): Promise<Transaction[]> => {
    try {
      console.log('AppContext: Fetching transactions...');
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from('poupeja_transactions')
        .select(`
          *,
          category:poupeja_categories(id, name, icon, color, type)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
  
      if (error) throw error;
      
      // Determine dependent status for users in these transactions
      const txRows = (data || []);
      const userIds = Array.from(new Set(txRows.map((t: any) => t.user_id).filter(Boolean)));
      let depMap = new Map<string, boolean>();
      if (userIds.length > 0) {
        try {
          console.log("DEBUG getTransactions: Tentando buscar poupeja_users para userIds:", userIds);
          const { data: usersRows, error: usersError } = await (supabase as any)
            .from('poupeja_users')
            .select('id, dependente')
            .in('id', userIds);
          
          if (usersError) {
            console.error("Error fetching users:", usersError);
          }
          
          (usersRows || []).forEach((u: any) => depMap.set(String(u.id), u.dependente === true));
        } catch (error) {
          console.error("Exception accessing users:", error);
        }
      }
      const transactions = txRows.map((row: any) => {
        const base = transformTransaction(row);
        const creatorName = row.name ? row.name : undefined;
        return { ...base, creatorName } as Transaction;
      });
      console.log('AppContext: Transactions fetched successfully:', transactions.length);
      dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }, []); // Empty dependencies as this function is self-contained

  const getGoals = useCallback(async (): Promise<Goal[]> => {
    try {
      console.log('AppContext: Fetching goals...');
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from('poupeja_goals')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const goals = (data || []).map(transformGoal);
      console.log('AppContext: Goals fetched successfully:', goals.length);
      dispatch({ type: 'SET_GOALS', payload: goals });
      return goals;
    } catch (error) {
      console.error('Error fetching goals:', error);
      throw error;
    }
  }, []); // Empty dependencies as this function is self-contained

  const recalculateGoalAmounts = async (): Promise<boolean> => {
    try {
      console.log('Recalculating goal amounts...');
      // Primeiro, recalcular os valores usando o serviço
      const success = await recalculateGoalAmountsService();
      if (success) {
        // Depois, buscar as metas atualizadas
        await getGoals();
      }
      return success;
    } catch (error) {
      console.error('Error recalculating goal amounts:', error);
      return false;
    }
  };

  const updateUserProfile = async (data: any): Promise<void> => {
    try {
      console.log('AppContext: updateUserProfile called with data:', data);
      
      // Import userService and use it for proper mapping
      const { updateUserProfile: updateUserProfileService } = await import('@/services/userService');
      const result = await updateUserProfileService(data);
      
      if (!result) {
        throw new Error('Failed to update user profile');
      }
      
      console.log('AppContext: Profile updated successfully:', result);
    } catch (error) {
      console.error('AppContext: Error updating user profile:', error);
      throw error;
    }
  };

  // Transaction actions
  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'created_at'>) => {
    try {
      console.log('AppContext: Adding transaction...', transaction);
      const user = await getCurrentUser();
      
      // Generate reference code
      const referenceCode = await getNextReferenceCode();
      console.log('Generated reference code:', referenceCode);
      
      // Determine name and phone from provided data or fetch from view
      const nameValue = (transaction as any).name ?? transaction.creatorName;
      let phoneValue = (transaction as any).phone;

      if (!phoneValue && nameValue) {
        try {
          const { data: viewRow, error: viewError } = await (supabase as any)
            .from('view_cadastros_unificados')
            .select('phone')
            .eq('id', user.id)
            .eq('primeiro_name', nameValue)
            .maybeSingle();
          if (!viewError && (viewRow as any)?.phone) {
            phoneValue = (viewRow as any).phone as string;
          } else if (viewError) {
            console.warn('AppContext: Could not fetch phone from view:', viewError);
          }
        } catch (e) {
          console.warn('AppContext: Exception while fetching phone from view:', e);
        }
      }

      const { data, error } = await supabase
        .from('poupeja_transactions')
        .insert({ 
          type: transaction.type,
          amount: transaction.amount,
          category_id: transaction.category_id,
          description: transaction.description,
          date: transaction.date,
          goal_id: transaction.goalId,
          user_id: user.id,
          reference_code: referenceCode,
          conta_id: (transaction as any).conta_id,
          name: nameValue,
          phone: phoneValue,
          status: (transaction as any).status, // Adicionar campo status
          formato: 'transacao',
        })
        .select(`
          *,
          category:poupeja_categories(id, name, icon, color, type)
        `)
        .single();
  
      if (error) throw error;
      const transformedTransaction = transformTransaction(data);
      console.log('✅ [ADD DEBUG] AppContext: Transaction added successfully:', transformedTransaction);
      console.log('📅 [ADD DEBUG] Transaction date vs current filter:', {
        transactionDate: transformedTransaction.date,
        currentRange: `${state.customStartDate?.toLocaleDateString()} - ${state.customEndDate?.toLocaleDateString()}`,
        timeRange: state.timeRange
      });
      dispatch({ type: 'ADD_TRANSACTION', payload: transformedTransaction });
      
      // Se a transação estiver associada a uma meta, recalcular os valores das metas
      if (transaction.goalId) {
        console.log('AppContext: Recalculating goal amounts...');
        await recalculateGoalAmounts();
      }
      
      return transformedTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };
  
  const updateTransaction = async (id: string, transaction: Partial<Transaction>) => {
    try {
      const user = await getCurrentUser();

      const nameValue = (transaction as any).name ?? transaction.creatorName;
      let phoneValue = (transaction as any).phone;

      if (!phoneValue && nameValue) {
        try {
          const { data: viewRow, error: viewError } = await (supabase as any)
            .from('view_cadastros_unificados')
            .select('phone')
            .eq('id', user.id)
            .eq('primeiro_name', nameValue)
            .maybeSingle();
          if (!viewError && (viewRow as any)?.phone) {
            phoneValue = (viewRow as any).phone as string;
          } else if (viewError) {
            console.warn('AppContext: Could not fetch phone from view (update):', viewError);
          }
        } catch (e) {
          console.warn('AppContext: Exception while fetching phone from view (update):', e);
        }
      }

      const { data, error } = await supabase
        .from('poupeja_transactions')
        .update({
          type: transaction.type,
          amount: transaction.amount,
          category_id: transaction.category_id,
          description: transaction.description,
          date: transaction.date,
          goal_id: transaction.goalId,
          conta_id: transaction.conta_id,
          name: nameValue,
          phone: phoneValue,
        })
        .eq('id', id)
        .select(`
          *,
          category:poupeja_categories(id, name, icon, color, type)
        `)
        .single();
  
      if (error) throw error;
      const transformedTransaction = transformTransaction(data);
      dispatch({ type: 'UPDATE_TRANSACTION', payload: transformedTransaction });
      
      // Se a transação estiver associada a uma meta, recalcular os valores das metas
      if (transaction.goalId) {
        await recalculateGoalAmounts();
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };
  
  const deleteTransaction = async (id: string) => {
    try {
      // Primeiro, obter a transação para verificar se está associada a uma meta
      const { data: transactionData } = await supabase
        .from('poupeja_transactions')
        .select('goal_id')
        .eq('id', id)
        .single();
        
      const hasGoal = transactionData?.goal_id;
      
      // Agora excluir a transação
      const { error } = await supabase
        .from('poupeja_transactions')
        .delete()
        .eq('id', id);
  
      if (error) throw error;
      dispatch({ type: 'DELETE_TRANSACTION', payload: id });
      
      // Se a transação estava associada a uma meta, recalcular os valores das metas
      if (hasGoal) {
        await recalculateGoalAmounts();
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  // Category actions
  const addCategory = async (category: Omit<Category, 'id' | 'created_at'>) => {
    try {
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from('poupeja_categories')
        .insert({ ...category, user_id: user.id })
        .select()
        .single();
  
      if (error) throw error;
      const transformedCategory = transformCategory(data);
      dispatch({ type: 'ADD_CATEGORY', payload: transformedCategory });
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    try {
      const { data, error } = await supabase
        .from('poupeja_categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();
  
      if (error) throw error;
      const transformedCategory = transformCategory(data);
      dispatch({ type: 'UPDATE_CATEGORY', payload: transformedCategory });
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('poupeja_categories')
        .delete()
        .eq('id', id);
  
      if (error) throw error;
      dispatch({ type: 'DELETE_CATEGORY', payload: id });
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  // Goal actions
  const addGoal = async (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>, categoryId?: string, type: 'income' | 'expense' = 'income') => {
    try {
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from('poupeja_goals')
        .insert({ 
          name: goal.name,
          target_amount: goal.targetAmount || goal.target_amount,
          current_amount: goal.currentAmount || goal.current_amount || 0,
          start_date: goal.startDate || goal.start_date,
          end_date: goal.endDate || goal.end_date,
          deadline: goal.deadline,
          color: goal.color,
          category_id: categoryId,
          type: type,
          user_id: user.id,
          conta_id: (goal as any).conta_id,
        })
        .select()
        .single();
  
      if (error) throw error;
      const transformedGoal = transformGoal(data);
      dispatch({ type: 'ADD_GOAL', payload: transformedGoal });
    } catch (error) {
      console.error('Error adding goal:', error);
      throw error;
    }
  };

  const updateGoal = async (id: string, goal: Partial<Goal>) => {
    try {
      const { data, error } = await supabase
        .from('poupeja_goals')
        .update({
          name: goal.name,
          target_amount: goal.targetAmount || goal.target_amount,
          current_amount: goal.currentAmount || goal.current_amount,
          start_date: goal.startDate || goal.start_date,
          end_date: goal.endDate || goal.end_date,
          deadline: goal.deadline,
          color: goal.color,
          conta_id: (goal as any).conta_id,
        })
        .eq('id', id)
        .select()
        .single();
  
      if (error) throw error;
      const transformedGoal = transformGoal(data);
      dispatch({ type: 'UPDATE_GOAL', payload: transformedGoal });
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('poupeja_goals')
        .delete()
        .eq('id', id);
  
      if (error) throw error;
      dispatch({ type: 'DELETE_GOAL', payload: id });
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  };

  // Scheduled Transaction actions
  const addScheduledTransaction = async (transaction: Omit<ScheduledTransaction, 'id' | 'created_at'>) => {
    try {
      const user = await getCurrentUser();
      
      // Generate numeric reference code if not provided
      const referenceCode = transaction.reference_code || await getNextReferenceCode();
      
      // For reminders, always set amount to 0
      const finalAmount = transaction.type === 'reminder' ? 0 : transaction.amount;
      
      const { data, error } = await supabase
        .from('poupeja_scheduled_transactions')
        .insert({ 
          type: transaction.type,
          amount: finalAmount,
          category_id: transaction.category_id,
          description: transaction.description,
          scheduled_date: transaction.scheduledDate || transaction.scheduled_date,
          recurrence: transaction.recurrence,
          goal_id: transaction.goalId || transaction.goal_id,
          status: transaction.status,
          reference_code: referenceCode,
          user_id: user.id,
          phone: transaction.phone,
          situacao: transaction.situacao,
        })
        .select()
        .single();
  
      if (error) throw error;
      const transformedTransaction = transformScheduledTransaction(data);
      dispatch({ type: 'ADD_SCHEDULED_TRANSACTION', payload: transformedTransaction });
    } catch (error) {
      console.error('Error adding scheduled transaction:', error);
      throw error;
    }
  };

  const updateScheduledTransaction = async (id: string, transaction: Partial<ScheduledTransaction>) => {
    try {
      const { data, error } = await supabase
        .from('poupeja_scheduled_transactions')
        .update({
          type: transaction.type,
          amount: transaction.amount,
          category_id: transaction.category_id,
          description: transaction.description,
          scheduled_date: transaction.scheduledDate || transaction.scheduled_date,
          recurrence: transaction.recurrence,
          goal_id: transaction.goalId || transaction.goal_id,
          status: transaction.status,
        })
        .eq('id', id)
        .select()
        .single();
  
      if (error) throw error;
      const transformedTransaction = transformScheduledTransaction(data);
      dispatch({ type: 'UPDATE_SCHEDULED_TRANSACTION', payload: transformedTransaction });
    } catch (error) {
      console.error('Error updating scheduled transaction:', error);
      throw error;
    }
  };

  const deleteScheduledTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('poupeja_scheduled_transactions')
        .delete()
        .eq('id', id);
  
      if (error) throw error;
      dispatch({ type: 'DELETE_SCHEDULED_TRANSACTION', payload: id });
    } catch (error) {
      console.error('Error deleting scheduled transaction:', error);
      throw error;
    }
  };

  const value: AppContextType = useMemo(() => ({
    state,
    dispatch,
    user: state.user,
    userTimezone: state.userTimezone,
    hideValues: state.hideValues,
    toggleHideValues,
    logout,
    setCustomDateRange,
    // Data access
    transactions: state.transactions,
    categories: state.categories,
    goals: state.goals,
    scheduledTransactions: state.scheduledTransactions,
    filteredTransactions: state.filteredTransactions,
    isLoading: state.isLoading,
    // Time range
    timeRange: state.timeRange,
    setTimeRange,
    customStartDate: state.customStartDate,
    customEndDate: state.customEndDate,
    // Data fetching methods
    getTransactions,
    getGoals,
    recalculateGoalAmounts,
    updateUserProfile,
    // Actions
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    addGoal,
    updateGoal,
    deleteGoal,
    addScheduledTransaction,
    updateScheduledTransaction,
    deleteScheduledTransaction,
  }), [
    state.user?.id,
    state.isLoading,
    state.userTimezone,
    state.transactions,
    state.categories,
    state.goals,
    state.scheduledTransactions,
    state.hideValues,
    state.timeRange,
    state.customStartDate,
    state.customEndDate,
    toggleHideValues,
    logout,
    setCustomDateRange,
    setTimeRange,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Export useAppContext as an alias for useApp for compatibility
export const useAppContext = useApp;
