import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';

interface AddTransactionFormProps {
  onAdd: (transaction: {
    type: 'debit' | 'credit';
    amount: number;
    category: string;
    description: string;
    date: string;
  }) => void | Promise<void>;
  categories: string[];
}

export function AddTransactionForm({ onAdd, categories }: AddTransactionFormProps) {
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !description) return;

    await onAdd({
      type,
      amount: parseFloat(amount),
      category,
      description,
      date,
    });

    setAmount('');
    setCategory('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="mb-4">Add Transaction</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('debit')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              type === 'debit'
                ? 'bg-red-600 text-white'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Expense (debit)
          </button>
          <button
            type="button"
            onClick={() => setType('credit')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              type === 'credit'
                ? 'bg-green-600 text-white'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Income (credit)
          </button>
        </div>

        <div>
          <label htmlFor="amount" className="block mb-2">Amount</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div>
          <label htmlFor="category" className="block mb-2">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            required
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block mb-2">Description</label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
            className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div>
          <label htmlFor="date" className="block mb-2">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Transaction
        </button>
      </form>
    </div>
  );
}
