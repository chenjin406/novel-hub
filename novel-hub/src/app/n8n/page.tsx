'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Workflow {
  id: string;
  book_id: string | null;
  status: string;
  progress: number;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export default function N8NWorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWorkflow, setNewWorkflow] = useState({
    gutenbergId: '',
    translate: false,
    aiModel: 'gpt-3.5-turbo',
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    try {
      const response = await fetch('/api/n8n?action=workflows');
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setLoading(false);
    }
  }

  async function startWorkflow(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newWorkflow.gutenbergId) {
      alert('Please enter a Gutenberg ID');
      return;
    }

    try {
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'crawl-translate',
          gutenbergId: parseInt(newWorkflow.gutenbergId),
          translate: newWorkflow.translate,
          aiModel: newWorkflow.aiModel,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('Workflow started successfully!');
        setNewWorkflow({ gutenbergId: '', translate: false, aiModel: 'gpt-3.5-turbo' });
        fetchWorkflows(); // Refresh list
      } else {
        alert(`Failed to start workflow: ${result.error}`);
      }
    } catch (error) {
      alert('Failed to start workflow');
      console.error(error);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                📚 NovelHub
              </Link>
              <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                n8n Workflow Manager
              </h1>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Back to Library
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Workflow Form */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Create New Workflow
            </h2>
            
            <form onSubmit={startWorkflow} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Gutenberg Book ID
                </label>
                <input
                  type="number"
                  value={newWorkflow.gutenbergId}
                  onChange={(e) => setNewWorkflow({...newWorkflow, gutenbergId: e.target.value})}
                  placeholder="e.g., 12345"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  required
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  Find book IDs at gutenberg.org/browse/languages/zh
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  AI Model
                </label>
                <select
                  value={newWorkflow.aiModel}
                  onChange={(e) => setNewWorkflow({...newWorkflow, aiModel: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="translate"
                  checked={newWorkflow.translate}
                  onChange={(e) => setNewWorkflow({...newWorkflow, translate: e.target.checked})}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="translate" className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                  Translate to English
                </label>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Start Workflow
              </button>
            </form>
          </div>

          {/* Workflow Stats */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Workflow Statistics
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Total Workflows</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{workflows.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Running</span>
                <span className="text-sm font-medium text-blue-600">{workflows.filter(w => w.status === 'running').length}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Completed</span>
                <span className="text-sm font-medium text-green-600">{workflows.filter(w => w.status === 'completed').length}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Failed</span>
                <span className="text-sm font-medium text-red-600">{workflows.filter(w => w.status === 'failed').length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Workflows */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Workflows
            </h2>
            <button
              onClick={fetchWorkflows}
              className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Refresh
            </button>
          </div>

          {workflows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
              <p className="text-zinc-600 dark:text-zinc-400">
                No workflows yet. Create your first workflow above!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(workflow.status)}`}>
                        {workflow.status}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Workflow {workflow.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-500">
                          Started {formatDate(workflow.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {workflow.status === 'running' && (
                        <div className="w-24">
                          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                            <span>Progress</span>
                            <span>{workflow.progress}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                            <div
                              className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                              style={{ width: `${workflow.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {workflow.error && (
                        <div className="max-w-xs">
                          <p className="text-xs text-red-600 dark:text-red-400 truncate" title={workflow.error}>
                            {workflow.error}
                          </p>
                        </div>
                      )}
                      
                      <button
                        onClick={() => {
                          // TODO: Add detailed view
                          alert(`Workflow ${workflow.id}\nStatus: ${workflow.status}\nProgress: ${workflow.progress}%`);
                        }}
                        className="rounded-md px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}