/**
 * JobGuard AI - Model Performance & Academic Evaluation Telemetry Service
 * Module: backend.src.services.evaluation.service
 * Purpose: Parses real measured benchmark evaluation results from CSV files
 *          generated during 70:30 train/test splits on EMSCAD and PhiUSIIL datasets.
 * Policy: Strictly ZERO invented or unverified ML performance claims.
 */

import fs from 'fs';
import path from 'path';

export interface ModelEvaluationRecord {
  dataset: string;
  pipeline: string;
  split: string;
  trainCount: number;
  testCount: number;
  featureExtraction: string;
  classifier: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  fitSeconds?: number;
  featureCount?: number;
  confusionMatrix: {
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  };
}

export class EvaluationService {
  /**
   * Retrieves measured evaluation metrics for the production models.
   */
  public static async getEvaluationMetrics(): Promise<{
    primaryResults: ModelEvaluationRecord[];
    emscadComparisons: any[];
  }> {
    const rootDir = process.cwd();
    const primaryCsvPath = path.resolve(rootDir, 'data/evaluation/JobGuard_Measured_Results_70_30.csv');
    const compCsvPath = path.resolve(rootDir, 'data/evaluation/EMSCAD_controlled_comparison.csv');

    const primaryResults: ModelEvaluationRecord[] = [];
    const emscadComparisons: any[] = [];

    // Parse primary results
    if (fs.existsSync(primaryCsvPath)) {
      const content = fs.readFileSync(primaryCsvPath, 'utf8');
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

      // Skip header (line 0)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Parse CSV with potential quotes in confusion matrix
        const match = line.match(
          /^([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]*),([^,]*),"?\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]"?/
        );

        if (match) {
          primaryResults.push({
            dataset: match[1].trim(),
            pipeline: match[2].trim(),
            split: match[3].trim(),
            trainCount: parseInt(match[6], 10),
            testCount: parseInt(match[7], 10),
            featureExtraction: match[8].trim(),
            classifier: match[9].trim(),
            accuracy: parseFloat(match[10]),
            precision: parseFloat(match[11]),
            recall: parseFloat(match[12]),
            f1Score: parseFloat(match[13]),
            rocAuc: parseFloat(match[14]),
            fitSeconds: match[15] ? parseFloat(match[15]) : undefined,
            featureCount: match[16] ? parseFloat(match[16]) : undefined,
            confusionMatrix: {
              tn: parseInt(match[17], 10),
              fp: parseInt(match[18], 10),
              fn: parseInt(match[19], 10),
              tp: parseInt(match[20], 10),
            },
          });
        }
      }
    }

    // Parse EMSCAD controlled comparison
    if (fs.existsSync(compCsvPath)) {
      const compContent = fs.readFileSync(compCsvPath, 'utf8');
      const compLines = compContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

      for (let i = 1; i < compLines.length; i++) {
        const parts = compLines[i].split(',');
        if (parts.length >= 13) {
          emscadComparisons.push({
            dataset: parts[0].replace(/"/g, '').trim(),
            model: parts[1].replace(/"/g, '').trim(),
            evaluation: parts[2].trim(),
            threshold: parseFloat(parts[3]),
            accuracy: parseFloat(parts[4]),
            precision: parseFloat(parts[5]),
            recall: parseFloat(parts[6]),
            f1Score: parseFloat(parts[7]),
            rocAuc: parseFloat(parts[8]),
            confusionMatrix: {
              tn: parseInt(parts[9], 10),
              fp: parseInt(parts[10], 10),
              fn: parseInt(parts[11], 10),
              tp: parseInt(parts[12], 10),
            },
          });
        }
      }
    }

    return { primaryResults, emscadComparisons };
  }
}
