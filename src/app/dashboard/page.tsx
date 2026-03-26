'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getInsforgeClient } from '@/lib/insforgeClient';

const STAGES = ['New', 'Qualified', 'Proposal', 'Won', 'Lost'] as const;

type Lead = {
  id: string;
  owner_id: string;
  full_name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
};

type Deal = {
  id: string;
  owner_id: string;
  lead_id?: string | null;
  title: string;
  value: number | string;
  stage: string;
};

type Task = {
  id: string;
  owner_id: string;
  deal_id?: string | null;
  title: string;
  due_date?: string | null;
  completed: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const insforge = useMemo(() => getInsforgeClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // create lead inputs
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');

  // create deal inputs
  const [leadIdForDeal, setLeadIdForDeal] = useState<string | null>(null);
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState('0');
  const [dealStage, setDealStage] = useState<(typeof STAGES)[number]>('New');

  // create task inputs
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorText(null);
      try {
        const { data, error } = await insforge.auth.getCurrentUser();
        if (error) throw error;
        const user = data?.user;
        if (!user?.id) {
          router.push('/login');
          return;
        }
        setUserId(user.id);
        const profile = user.profile as { name?: string | null } | undefined;
        const email = user.email ? String(user.email).trim() : '';
        setUserEmail(email);
        setUserDisplayName(
          (profile?.name && String(profile.name).trim()) || email || user.id
        );
        await Promise.all([refreshLeads(user.id), refreshDeals(user.id)]);
      } catch (err: any) {
        setErrorText(err?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId || !selectedDealId) {
      setTasks([]);
      return;
    }
    (async () => {
      const { data, error } = await insforge.database
        .from('tasks')
        .select('*')
        .eq('owner_id', userId)
        .eq('deal_id', selectedDealId)
        .order('created_at', { ascending: false });
      if (error) {
        setErrorText(error.message);
        return;
      }
      setTasks((data as Task[]) || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedDealId]);

  async function refreshLeads(uid: string) {
    const { data, error } = await insforge.database
      .from('leads')
      .select('*')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setLeads((data as Lead[]) || []);
  }

  async function refreshDeals(uid: string) {
    const { data, error } = await insforge.database
      .from('deals')
      .select('*')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const nextDeals = (data as Deal[]) || [];
    setDeals(nextDeals);
    setSelectedDealId((cur) => {
      if (!cur) return cur;
      const exists = nextDeals.some((d) => d.id === cur);
      return exists ? cur : null;
    });
  }

  async function onCreateLead(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setErrorText(null);

    const payload = {
      owner_id: userId,
      full_name: fullName.trim(),
      company: company.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      source: source.trim() || null,
    };
    if (!payload.full_name) {
      setErrorText('Please enter a lead name (full_name)');
      return;
    }

    const { error } = await insforge.database.from('leads').insert([payload]);
    if (error) {
      setErrorText(error.message);
      return;
    }

    setFullName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setSource('');
    await refreshLeads(userId);
  }

  async function onCreateDeal(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (!leadIdForDeal) {
      setErrorText('Select a lead to create a deal');
      return;
    }

    const title = dealTitle.trim() || 'New Deal';
    const value = Number(dealValue);
    if (!Number.isFinite(value) || value < 0) {
      setErrorText('Enter a valid deal amount (value)');
      return;
    }

    const payload = {
      owner_id: userId,
      lead_id: leadIdForDeal,
      title,
      value,
      stage: dealStage,
    };

    const { error } = await insforge.database.from('deals').insert([payload]);
    if (error) {
      setErrorText(error.message);
      return;
    }

    setDealTitle('');
    setDealValue('0');
    setDealStage('New');
    await refreshDeals(userId);
  }

  async function moveDealStage(dealId: string, stage: string) {
    if (!userId) return;
    setErrorText(null);
    const { error } = await insforge.database
      .from('deals')
      .update({ stage })
      .eq('id', dealId)
      .eq('owner_id', userId);
    if (error) {
      setErrorText(error.message);
      return;
    }
    await refreshDeals(userId);
  }

  async function onToggleTask(taskId: string, completed: boolean) {
    if (!userId) return;
    setErrorText(null);
    const { error } = await insforge.database
      .from('tasks')
      .update({ completed })
      .eq('id', taskId)
      .eq('owner_id', userId);
    if (error) {
      setErrorText(error.message);
      return;
    }
    if (selectedDealId) {
      // Refresh tasks for the selected deal
      const { data, error: tErr } = await insforge.database
        .from('tasks')
        .select('*')
        .eq('owner_id', userId)
        .eq('deal_id', selectedDealId)
        .order('created_at', { ascending: false });
      if (!tErr) setTasks((data as Task[]) || []);
    }
  }

  async function onCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!userId || !selectedDealId) return;
    setErrorText(null);

    const payload = {
      owner_id: userId,
      deal_id: selectedDealId,
      title: taskTitle.trim(),
      due_date: taskDueDate ? taskDueDate : null,
      completed: false,
    };
    if (!payload.title) {
      setErrorText('Please enter a task title');
      return;
    }

    const { error } = await insforge.database.from('tasks').insert([payload]);
    if (error) {
      setErrorText(error.message);
      return;
    }

    setTaskTitle('');
    setTaskDueDate('');

    const { data, error: tErr } = await insforge.database
      .from('tasks')
      .select('*')
      .eq('owner_id', userId)
      .eq('deal_id', selectedDealId)
      .order('created_at', { ascending: false });
    if (!tErr) setTasks((data as Task[]) || []);
  }

  async function onSignOut() {
    await insforge.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-gray-600">Loading...</div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">CRM dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Leads / Deals / Tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-0.5 min-w-0 max-w-[260px]">
            <span className="text-sm text-gray-900 truncate w-full text-right" title={userDisplayName}>
              {userDisplayName}
            </span>
            {userEmail && userEmail !== userDisplayName ? (
              <span className="text-xs text-gray-500 truncate w-full text-right" title={userEmail}>
                {userEmail}
              </span>
            ) : null}
          </div>
          <a
            href="/forgot-password"
            className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 text-sm"
          >
            Reset password
          </a>
          <button
            type="button"
            onClick={onSignOut}
            className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </header>

      {errorText ? (
        <div className="mb-5 text-red-700 bg-red-50 p-3 rounded text-sm">{errorText}</div>
      ) : null}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-bold mb-4">New lead</h2>
          <form onSubmit={onCreateLead} className="grid gap-3">
            <input
              className="px-3 py-2 rounded border border-gray-300"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="full_name (required)"
            />
            <input
              className="px-3 py-2 rounded border border-gray-300"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="company (optional)"
            />
            <input
              className="px-3 py-2 rounded border border-gray-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email (optional)"
              type="email"
            />
            <input
              className="px-3 py-2 rounded border border-gray-300"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="phone (optional)"
            />
            <input
              className="px-3 py-2 rounded border border-gray-300"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="source (optional)"
            />
            <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800">
              Create lead
            </button>
          </form>

          <div className="mt-6">
            <h3 className="font-bold text-sm mb-2">Your leads</h3>
            <div className="grid gap-3">
              {leads.slice(0, 8).map((l) => (
                <div key={l.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="font-semibold">
                    {l.full_name}
                    {l.company ? <span className="text-gray-500 font-normal"> · {l.company}</span> : null}
                  </div>
                  <div className="text-gray-500 text-sm mt-1">
                    {l.email || '—'} {l.phone ? `· ${l.phone}` : ''}
                  </div>
                </div>
              ))}
              {leads.length === 0 ? <div className="text-gray-500 text-sm">No leads yet</div> : null}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-bold mb-4">New deal</h2>
          <form onSubmit={onCreateDeal} className="grid gap-3">
            <select
              className="px-3 py-2 rounded border border-gray-300"
              value={leadIdForDeal ?? ''}
              onChange={(e) => {
                const v = e.target.value || null;
                setLeadIdForDeal(v);
                const lead = leads.find((x) => x.id === v);
                if (lead) setDealTitle(`${lead.full_name}${lead.company ? ` - ${lead.company}` : ''}`);
              }}
            >
              <option value="" disabled>
                Select a lead
              </option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.full_name}
                  {l.company ? ` - ${l.company}` : ''}
                </option>
              ))}
            </select>

            <input
              className="px-3 py-2 rounded border border-gray-300"
              value={dealTitle}
              onChange={(e) => setDealTitle(e.target.value)}
              placeholder="title"
            />

            <input
              className="px-3 py-2 rounded border border-gray-300"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              placeholder="value"
              type="number"
            />

            <select
              className="px-3 py-2 rounded border border-gray-300"
              value={dealStage}
              onChange={(e) => setDealStage(e.target.value as any)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800" disabled={leads.length === 0}>
              Create deal
            </button>
          </form>

          <div className="mt-6">
            <h3 className="font-bold text-sm mb-2">Stage board</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              {STAGES.map((stage) => {
                const stageDeals = deals.filter((d) => d.stage === stage);
                return (
                  <div key={stage} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="font-bold text-sm mb-2">{stage}</div>
                    <div className="grid gap-3">
                      {stageDeals.slice(0, 3).map((d) => (
                        <div
                          key={d.id}
                          className={`border rounded-lg p-3 cursor-pointer hover:bg-gray-100 ${
                            selectedDealId === d.id ? 'border-gray-900' : 'border-gray-200'
                          }`}
                          onClick={() => setSelectedDealId(d.id)}
                          role="button"
                        >
                          <div className="font-semibold text-sm">{d.title}</div>
                          <div className="text-gray-500 text-xs mt-1">
                            {Number(d.value).toLocaleString()} · {d.lead_id ? 'Has lead' : 'No lead'}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {STAGES.map((s) => (
                              <button
                                key={`${d.id}-${s}`}
                                type="button"
                                disabled={s === stage}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveDealStage(d.id, s);
                                }}
                                className="text-xs px-2 py-1 rounded border border-gray-300 disabled:opacity-60 bg-white"
                              >
                                {s === stage ? 'Current' : `Move to ${s}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {stageDeals.length === 0 ? <div className="text-gray-500 text-xs">None</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-bold mb-2">Tasks</h2>
        <div className="text-gray-500 text-sm mb-3">Select a deal, then add follow-up tasks here.</div>

        {!selectedDealId ? (
          <div className="text-gray-500 text-sm">No deal selected</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={onCreateTask} className="grid gap-3">
              <input
                className="px-3 py-2 rounded border border-gray-300"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="title"
              />
              <input
                className="px-3 py-2 rounded border border-gray-300"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                placeholder="due_date（YYYY-MM-DD）"
                type="date"
              />
              <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800">
                Add task
              </button>
            </form>

            <div>
              <h3 className="font-bold text-sm mb-2">Tasks for this deal</h3>
              <div className="grid gap-3">
                {tasks.map((t) => (
                  <div key={t.id} className="border border-gray-200 rounded-lg p-3 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={(e) => onToggleTask(t.id, e.target.checked)}
                      className="mt-1"
                    />
                    <div>
                      <div
                        className={`font-semibold ${
                          t.completed ? 'line-through text-gray-500' : ''
                        }`}
                      >
                        {t.title}
                      </div>
                      <div className="text-gray-500 text-sm mt-1">
                        {t.due_date ? `Due: ${t.due_date}` : 'No due date'}
                      </div>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 ? <div className="text-gray-500 text-sm">No tasks yet</div> : null}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

