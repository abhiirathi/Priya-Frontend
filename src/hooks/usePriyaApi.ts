import { useCallback } from 'react';
import type { Persona, RunInfo } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:8000';

export function usePriyaApi() {
  // Start a new run
  const startRun = useCallback(
    async (persona: Persona, instruction: string, csvFile: File): Promise<{ run_id: string }> => {
      try {
        const formData = new FormData();
        formData.append('persona', persona);
        formData.append('instruction', instruction);
        formData.append('csv_file', csvFile);

        const response = await fetch(`${API_BASE}/run`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Start run failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[API] Start run response:', data);
        return { run_id: data.run_id };
      } catch (error) {
        console.error('[API] Start run error:', error);
        throw error;
      }
    },
    []
  );

  // Approve policy gate
  const approvePolicyGate = useCallback(async (runId: string): Promise<{ approved: boolean }> => {
    try {
      const response = await fetch(`${API_BASE}/approve/${runId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Approve failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[API] Approve response:', data);
      return { approved: data.approved };
    } catch (error) {
      console.error('[API] Approve error:', error);
      throw error;
    }
  }, []);

  // Escalation decision
  const escalationDecision = useCallback(
    async (runId: string, vendorId: string, decision: 'capture' | 'cancel'): Promise<{ ok: boolean }> => {
      try {
        const response = await fetch(`${API_BASE}/escalation/${runId}/${vendorId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ decision }),
        });

        if (!response.ok) {
          throw new Error(`Escalation decision failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[API] Escalation decision response:', data);
        return { ok: data.ok };
      } catch (error) {
        console.error('[API] Escalation decision error:', error);
        throw error;
      }
    },
    []
  );

  // Submit NL query
  const submitQuery = useCallback(async (runId: string, question: string): Promise<{ query_id: string }> => {
    try {
      const response = await fetch(`${API_BASE}/query/${runId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`Query submission failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[API] Query submission response:', data);
      return { query_id: data.query_id };
    } catch (error) {
      console.error('[API] Query submission error:', error);
      throw error;
    }
  }, []);

  // List runs
  const listRuns = useCallback(async (): Promise<RunInfo[]> => {
    try {
      const response = await fetch(`${API_BASE}/runs`);

      if (!response.ok) {
        throw new Error(`List runs failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[API] List runs response:', data);
      return data;
    } catch (error) {
      console.error('[API] List runs error:', error);
      throw error;
    }
  }, []);

  // Get run detail
  const getRun = useCallback(async (runId: string) => {
    try {
      const response = await fetch(`${API_BASE}/run/${runId}`);

      if (!response.ok) {
        throw new Error(`Get run failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[API] Get run response:', data);
      return data;
    } catch (error) {
      console.error('[API] Get run error:', error);
      throw error;
    }
  }, []);

  // Export audit CSV
  const exportAuditCsv = useCallback(async (runId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/run/${runId}/export`);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_${runId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('[API] Audit CSV exported');
    } catch (error) {
      console.error('[API] Export error:', error);
      throw error;
    }
  }, []);

  // Upload CSV
  const uploadCsv = useCallback(async (csvFile: File): Promise<{ file_path: string; vendor_count: number }> => {
    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch(`${API_BASE}/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload CSV failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[API] Upload CSV response:', data);
      return data;
    } catch (error) {
      console.error('[API] Upload CSV error:', error);
      throw error;
    }
  }, []);

  return {
    startRun,
    approvePolicyGate,
    escalationDecision,
    submitQuery,
    listRuns,
    getRun,
    exportAuditCsv,
    uploadCsv,
  };
}
