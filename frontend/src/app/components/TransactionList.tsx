import { format } from 'date-fns';
import { Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export interface Transaction {
  id: string;
  type: 'debit' | 'credit';
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, onDelete }: TransactionListProps) {
  const sortedTransactions = [...transactions].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2>Recent Transactions</h2>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {sortedTransactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No transactions yet. Add your first transaction to get started.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'credit' ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{transaction.description}</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="px-2 py-0.5 bg-secondary rounded text-[14px]">{transaction.category}</span>
                      <span>•</span>
                      <span className="text-[14px]">{format(new Date(transaction.date), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-medium ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
                  </p>
                  <button
                    onClick={() => onDelete(transaction.id)}
                    className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
