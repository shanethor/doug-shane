/**
 * Training Data Export — exports corrected extraction examples for model fine-tuning.
 * 
 * Joins acord_extraction_runs with acord_field_corrections to produce
 * "final corrected records" for each form instance.
 * 
 * Output format: JSONL with fields:
 *   - form_type, form_version, timestamps
 *   - raw_ocr_text, layout_info (if stored)
 *   - model_output (raw AI output)
 *   - final_corrected_output (after applying corrections)
 *   - corrections_applied (list of changes)
 */

import { supabase } from "@/integrations/supabase/client";

export interface TrainingExample {
  extraction_run_id: string;
  form_type: string;
  form_version: string | null;
  created_at: string;
  raw_ocr_text: string | null;
  model_output: Record<string, any>;
  final_corrected_output: Record<string, any>;
  corrections_applied: Array<{
    field_path: string;
    original_value: string | null;
    corrected_value: string;
    corrected_at: string;
  }>;
}

/**
 * Export training data for a given form type.
 * Optionally filter by date range.
 */
export async function exportTrainingData(
  formType?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<TrainingExample[]> {
  // Fetch extraction runs
  let query = supabase
    .from("acord_extraction_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (formType) query = query.eq("form_type", formType);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data: runs, error: runsError } = await query;
  if (runsError || !runs) {
    console.error("Failed to fetch extraction runs:", runsError);
    return [];
  }

  // Fetch all corrections for these runs
  const runIds = runs.map(r => r.id);
  if (runIds.length === 0) return [];

  const { data: corrections, error: corrError } = await supabase
    .from("acord_field_corrections")
    .select("*")
    .in("extraction_run_id", runIds)
    .order("corrected_at", { ascending: true });

  if (corrError) {
    console.error("Failed to fetch corrections:", corrError);
  }

  // Group corrections by run ID
  const correctionsByRun: Record<string, typeof corrections> = {};
  for (const c of (corrections || [])) {
    if (!correctionsByRun[c.extraction_run_id]) {
      correctionsByRun[c.extraction_run_id] = [];
    }
    correctionsByRun[c.extraction_run_id]!.push(c);
  }

  // Build training examples
  return runs.map(run => {
    const runCorrections = correctionsByRun[run.id] || [];
    
    // Start with model output, apply corrections to get final
    const finalOutput = { ...(run.final_output as Record<string, any> || run.model_output as Record<string, any> || {}) };
    for (const c of runCorrections) {
      finalOutput[c.field_path] = c.corrected_value;
    }

    return {
      extraction_run_id: run.id,
      form_type: run.form_type,
      form_version: run.form_version,
      created_at: run.created_at,
      raw_ocr_text: run.raw_ocr_text,
      model_output: run.model_output as Record<string, any> || {},
      final_corrected_output: finalOutput,
      corrections_applied: runCorrections.map(c => ({
        field_path: c.field_path,
        original_value: c.original_value,
        corrected_value: c.corrected_value,
        corrected_at: c.corrected_at,
      })),
    };
  });
}

/**
 * Generate JSONL string from training examples.
 */
export function toJSONL(examples: TrainingExample[]): string {
  return examples.map(ex => JSON.stringify(ex)).join("\n");
}

/**
 * Get accuracy metrics: correction rates per form type and field.
 */
export async function getAccuracyMetrics(
  formType?: string,
  daysBack: number = 30
): Promise<{
  form_type: string;
  total_runs: number;
  runs_with_corrections: number;
  correction_rate: number;
  field_correction_counts: Record<string, number>;
  total_corrections: number;
}[]> {
  const dateFrom = new Date(Date.now() - daysBack * 86400000).toISOString();

  // Get runs
  let runsQuery = supabase
    .from("acord_extraction_runs")
    .select("id, form_type")
    .gte("created_at", dateFrom);
  if (formType) runsQuery = runsQuery.eq("form_type", formType);
  
  const { data: runs } = await runsQuery;
  if (!runs || runs.length === 0) return [];

  // Get corrections
  const runIds = runs.map(r => r.id);
  const { data: corrections } = await supabase
    .from("acord_field_corrections")
    .select("extraction_run_id, form_type, field_path")
    .in("extraction_run_id", runIds);

  // Group by form type
  const byType: Record<string, {
    runIds: Set<string>;
    correctedRunIds: Set<string>;
    fieldCounts: Record<string, number>;
    totalCorrections: number;
  }> = {};

  for (const run of runs) {
    if (!byType[run.form_type]) {
      byType[run.form_type] = { runIds: new Set(), correctedRunIds: new Set(), fieldCounts: {}, totalCorrections: 0 };
    }
    byType[run.form_type].runIds.add(run.id);
  }

  for (const c of (corrections || [])) {
    const group = byType[c.form_type];
    if (!group) continue;
    group.correctedRunIds.add(c.extraction_run_id);
    group.fieldCounts[c.field_path] = (group.fieldCounts[c.field_path] || 0) + 1;
    group.totalCorrections++;
  }

  return Object.entries(byType).map(([ft, g]) => ({
    form_type: ft,
    total_runs: g.runIds.size,
    runs_with_corrections: g.correctedRunIds.size,
    correction_rate: g.runIds.size > 0 ? Math.round((g.correctedRunIds.size / g.runIds.size) * 100) : 0,
    field_correction_counts: g.fieldCounts,
    total_corrections: g.totalCorrections,
  }));
}
