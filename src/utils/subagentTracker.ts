/**
 * Comprehensive tracking system for subagent tool calls using hooks and message stream.
 * Direct port of research_agent/utils/subagent_tracker.py
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  HookCallback,
  HookInput,
  PreToolUseHookInput,
  PostToolUseHookInput,
  SyncHookJSONOutput,
} from '@anthropic-ai/claude-agent-sdk';
import type { TranscriptWriter } from './transcript';
import type { ProgressDisplay } from './progressDisplay';

/**
 * Record of a single tool call.
 * Port of Python's ToolCallRecord dataclass.
 */
interface ToolCallRecord {
  timestamp: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId: string;
  subagentType: string;
  parentToolUseId: string | null;
  toolOutput?: unknown;
  error?: string;
}

/**
 * Information about a subagent execution session.
 * Port of Python's SubagentSession dataclass.
 */
interface SubagentSession {
  subagentType: string;
  parentToolUseId: string;
  spawnedAt: string;
  description: string;
  promptPreview: string;
  subagentId: string;        // Unique identifier like "RESEARCHER-1"
  toolCalls: ToolCallRecord[];
}

/**
 * Tracks all tool calls made by subagents using both hooks and message stream parsing.
 *
 * This tracker:
 * 1. Monitors the message stream to detect subagent spawns via Task tool
 * 2. Uses hooks (PreToolUse/PostToolUse) to capture all tool invocations
 * 3. Associates tool calls with their originating subagent
 * 4. Logs tool usage to console and transcript files
 */
export class SubagentTracker {
  // Map: parentToolUseId -> SubagentSession
  private sessions: Map<string, SubagentSession> = new Map();

  // Map: toolUseId -> ToolCallRecord (for efficient lookup in post hook)
  private toolCallRecords: Map<string, ToolCallRecord> = new Map();

  // Current execution context (from message stream)
  private _currentParentId: string | null = null;

  // Counter for each subagent type to create unique IDs
  private subagentCounters: Map<string, number> = new Map();

  private transcriptWriter: TranscriptWriter | null;
  private progressDisplay: ProgressDisplay | null;

  // Tool call detail log (JSONL format)
  private toolLogFile: fs.WriteStream | null = null;

  // Track when each Task tool was started (for duration reporting)
  private taskStartTimes: Map<string, number> = new Map();

  constructor(
    transcriptWriter: TranscriptWriter | null = null,
    sessionDir?: string,
    progressDisplay: ProgressDisplay | null = null,
  ) {
    this.transcriptWriter = transcriptWriter;
    this.progressDisplay = progressDisplay;
    if (sessionDir) {
      const toolLogPath = path.join(sessionDir, 'tool_calls.jsonl');
      this.toolLogFile = fs.createWriteStream(toolLogPath, { encoding: 'utf-8' });
    }
  }

  /**
   * Register a new subagent spawn detected from the message stream.
   * Returns the generated subagentId (e.g., 'RESEARCHER-1').
   */
  registerSubagentSpawn(
    toolUseId: string,
    subagentType: string,
    description: string,
    prompt: string,
  ): string {
    const count = (this.subagentCounters.get(subagentType) ?? 0) + 1;
    this.subagentCounters.set(subagentType, count);
    const subagentId = `${subagentType.toUpperCase()}-${count}`;

    const session: SubagentSession = {
      subagentType,
      parentToolUseId: toolUseId,
      spawnedAt: new Date().toISOString(),
      description,
      promptPreview: prompt.length > 200 ? prompt.slice(0, 200) + '...' : prompt,
      subagentId,
      toolCalls: [],
    };

    this.sessions.set(toolUseId, session);
    this.taskStartTimes.set(toolUseId, Date.now());

    if (this.progressDisplay) {
      this.progressDisplay.agentStarted(subagentId, subagentType, description);
    } else {
      // Fallback: plain log when no display is attached
      process.stderr.write(`[${subagentId}] ${description}\n`);
    }

    return subagentId;
  }

  /**
   * Update the current execution context from message stream.
   * Called with parent_tool_use_id from each SDKAssistantMessage.
   */
  setCurrentContext(parentToolUseId: string | null): void {
    this._currentParentId = parentToolUseId;
  }

  /**
   * Log tool use to console, transcript, and JSONL detail log.
   */
  private _logToolUse(
    agentLabel: string,
    toolName: string,
    toolInput?: Record<string, unknown>,
  ): void {
    const message = `\n[${agentLabel}] → ${toolName}`;
    if (this.transcriptWriter) {
      this.transcriptWriter.write(message);
    } else {
      process.stdout.write(message + '\n');
    }

    // Transcript file only: add input details
    if (this.transcriptWriter && toolInput) {
      const detail = this._formatToolInput(toolInput);
      if (detail) {
        this.transcriptWriter.writeToFile(`    Input: ${detail}\n`);
      }
    }
  }

  /**
   * Format tool input for human-readable logging.
   * Mirrors Python's _format_tool_input() logic exactly.
   */
  private _formatToolInput(
    toolInput: Record<string, unknown>,
    maxLength = 100,
  ): string {
    if (!toolInput || Object.keys(toolInput).length === 0) return '';

    // WebSearch: show query
    if ('query' in toolInput) {
      const q = String(toolInput['query']);
      return `query='${q.length <= maxLength ? q : q.slice(0, maxLength) + '...'}'`;
    }

    // Write: show file path and content size
    if ('file_path' in toolInput && 'content' in toolInput) {
      const filename = path.basename(String(toolInput['file_path']));
      return `file='${filename}' (${String(toolInput['content']).length} chars)`;
    }

    // Read/Glob: show path or pattern
    if ('file_path' in toolInput) {
      return `path='${toolInput['file_path']}'`;
    }
    if ('pattern' in toolInput) {
      return `pattern='${toolInput['pattern']}'`;
    }

    // Task: show subagent spawn
    if ('subagent_type' in toolInput) {
      return `spawn=${toolInput['subagent_type']} (${toolInput['description'] ?? ''})`;
    }

    // Fallback: generic (truncated)
    return JSON.stringify(toolInput).slice(0, maxLength);
  }

  /**
   * Write structured log entry to JSONL file.
   */
  private _logToJsonl(logEntry: Record<string, unknown>): void {
    if (this.toolLogFile) {
      this.toolLogFile.write(JSON.stringify(logEntry) + '\n');
    }
  }

  /**
   * Hook callback for PreToolUse events — captures tool calls before execution.
   *
   * Port of Python's pre_tool_use_hook(). Arrow function to preserve `this` binding.
   *
   * Deviation: Python receives (hook_input: dict, tool_use_id: str, context).
   * TypeScript receives (input: HookInput, toolUseId: string | undefined, options).
   * The tool_use_id is available both as second arg and as input.tool_use_id.
   */
  preToolUseHook: HookCallback = async (
    input: HookInput,
    toolUseId: string | undefined,
    _options: { signal: AbortSignal },
  ): Promise<SyncHookJSONOutput> => {
    const preInput = input as PreToolUseHookInput;
    const toolName = preInput.tool_name;
    const toolInput = preInput.tool_input as Record<string, unknown>;
    // Prefer the explicit second-arg toolUseId; fall back to the field on the input
    const effectiveToolUseId = toolUseId ?? preInput.tool_use_id;
    const timestamp = new Date().toISOString();

    const isSubagent =
      this._currentParentId !== null && this.sessions.has(this._currentParentId);

    if (isSubagent) {
      const session = this.sessions.get(this._currentParentId!)!;
      const agentId = session.subagentId;
      const agentType = session.subagentType;

      const record: ToolCallRecord = {
        timestamp,
        toolName,
        toolInput,
        toolUseId: effectiveToolUseId,
        subagentType: agentType,
        parentToolUseId: this._currentParentId,
      };
      session.toolCalls.push(record);
      this.toolCallRecords.set(effectiveToolUseId, record);

      this._logToolUse(agentId, toolName, toolInput);
      this._logToJsonl({
        event: 'tool_call_start',
        timestamp,
        tool_use_id: effectiveToolUseId,
        agent_id: agentId,
        agent_type: agentType,
        tool_name: toolName,
        tool_input: toolInput,
        parent_tool_use_id: this._currentParentId,
      });
    } else if (toolName !== 'Task') {
      // Main agent tool call — skip Task (handled by spawn message)
      this._logToolUse('MAIN AGENT', toolName, toolInput);
      this._logToJsonl({
        event: 'tool_call_start',
        timestamp,
        tool_use_id: effectiveToolUseId,
        agent_id: 'MAIN_AGENT',
        agent_type: 'lead',
        tool_name: toolName,
        tool_input: toolInput,
      });
    }

    // Python equivalent: return {'continue_': True}
    // TypeScript SyncHookJSONOutput uses 'continue' (not 'continue_')
    return { continue: true };
  };

  /**
   * Hook callback for PostToolUse events — captures tool results.
   *
   * Port of Python's post_tool_use_hook(). Arrow function to preserve `this` binding.
   */
  postToolUseHook: HookCallback = async (
    input: HookInput,
    toolUseId: string | undefined,
    _options: { signal: AbortSignal },
  ): Promise<SyncHookJSONOutput> => {
    const postInput = input as PostToolUseHookInput;
    const toolResponse = postInput.tool_response;
    const effectiveToolUseId = toolUseId ?? postInput.tool_use_id;

    // If this is a Task tool completing, notify the progress display
    if (this.progressDisplay && this.sessions.has(effectiveToolUseId)) {
      const completedSession = this.sessions.get(effectiveToolUseId)!;
      this.progressDisplay.agentCompleted(completedSession.subagentId);
    }

    const record = this.toolCallRecords.get(effectiveToolUseId);
    if (!record) {
      return { continue: true };
    }

    record.toolOutput = toolResponse;

    // Check for errors in tool response
    const error =
      toolResponse != null &&
      typeof toolResponse === 'object' &&
      'error' in (toolResponse as Record<string, unknown>)
        ? String((toolResponse as Record<string, unknown>)['error'])
        : undefined;

    if (error) {
      record.error = error;
      const session = record.parentToolUseId
        ? this.sessions.get(record.parentToolUseId)
        : undefined;
      if (session) {
        process.stderr.write(
          `[${session.subagentId}] Tool ${record.toolName} error: ${error}\n`,
        );
      }
    }

    // Get agent info for logging
    const session = record.parentToolUseId
      ? this.sessions.get(record.parentToolUseId)
      : undefined;
    const agentId = session ? session.subagentId : 'MAIN_AGENT';
    const agentType = session ? session.subagentType : 'lead';

    this._logToJsonl({
      event: 'tool_call_complete',
      timestamp: new Date().toISOString(),
      tool_use_id: effectiveToolUseId,
      agent_id: agentId,
      agent_type: agentType,
      tool_name: record.toolName,
      success: error === undefined,
      error: error ?? null,
      output_size:
        toolResponse != null ? JSON.stringify(toolResponse).length : 0,
    });

    return { continue: true };
  };

  /**
   * Return a summary of everything tracked during this run.
   * Called after llm.send() completes to populate RunMetrics.
   */
  getSummary(): {
    subagentsSpawned: number;
    totalToolCalls: number;
    webSearchCount: number;
    revisionPasses: number;
    agentBreakdown: Array<{ agentId: string; agentType: string; toolCallCount: number; durationMs: number | null }>;
  } {
    const agentBreakdown = [...this.sessions.values()].map((session) => {
      const startTime = this.taskStartTimes.get(session.parentToolUseId);
      return {
        agentId:       session.subagentId,
        agentType:     session.subagentType,
        toolCallCount: session.toolCalls.length,
        durationMs:    startTime != null ? Date.now() - startTime : null,
      };
    });

    const totalToolCalls = agentBreakdown.reduce((s, a) => s + a.toolCallCount, 0);

    const webSearchCount = [...this.sessions.values()].reduce(
      (s, session) => s + session.toolCalls.filter((tc) => tc.toolName === 'WebSearch').length,
      0,
    );

    // Count writer spawns beyond the first as revision passes
    const writerSpawns = [...this.sessions.values()].filter((s) => s.subagentType === 'writer').length;
    const revisionPasses = Math.max(0, writerSpawns - 1);

    return {
      subagentsSpawned: this.sessions.size,
      totalToolCalls,
      webSearchCount,
      revisionPasses,
      agentBreakdown,
    };
  }

  close(): void {
    if (this.toolLogFile) {
      this.toolLogFile.end();
    }
  }
}
