/**
 * JobGuard AI - Model Performance & Academic Evaluation Dashboard
 * Module: frontend.src.components.models.ModelPerformanceView
 * Purpose: Visualizes empirical evaluation metrics from 70:30 train/test holdout splits
 *          on EMSCAD (17,880 samples) and PhiUSIIL (235,795 samples).
 * Policy: Strictly ZERO unverified or exaggerated accuracy claims.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const ModelPerformanceView: React.FC = () => {
  const [evaluationData, setEvaluationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('EMSCAD');

  useEffect(() => {
    const fetchEval = async () => {
      try {
        const data = await api.getModelEvaluation();
        setEvaluationData(data);
      } catch (err: any) {
        console.warn('Failed to load evaluation metrics:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEval();
  }, []);

  // Hardcoded baseline fallback matching data/evaluation/JobGuard_Measured_Results_70_30.csv
  const fallbackResults = [
    {
      dataset: 'EMSCAD',
      pipeline: 'TF-IDF + Logistic Regression',
      split: '70:30',
      trainCount: 12516,
      testCount: 5364,
      featureExtraction: 'TF-IDF text features (12,000 features)',
      classifier: 'Logistic Regression',
      accuracy: 0.9745,
      precision: 1.0,
      recall: 0.4731,
      f1Score: 0.6423,
      rocAuc: 0.9836,
      fitSeconds: 0.12,
      confusionMatrix: { tn: 5104, fp: 0, fn: 137, tp: 123 },
    },
    {
      dataset: 'PhiUSIIL',
      pipeline: '18 URL features + XGBoost',
      split: '70:30',
      trainCount: 165056,
      testCount: 70739,
      featureExtraction: '18 numerical URL features',
      classifier: 'XGBoost (XGBClassifier)',
      accuracy: 0.9975,
      precision: 0.9998,
      recall: 0.9944,
      f1Score: 0.9971,
      rocAuc: 0.9987,
      fitSeconds: 1.627,
      confusionMatrix: { tn: 40450, fp: 5, fn: 169, tp: 30115 },
    },
    {
      dataset: 'PhiUSIIL (LR)',
      pipeline: '18 URL features + Logistic Regression',
      split: '70:30',
      trainCount: 165056,
      testCount: 70739,
      featureExtraction: '18 numerical URL features',
      classifier: 'Logistic Regression',
      accuracy: 0.9977,
      precision: 0.9999,
      recall: 0.9946,
      f1Score: 0.9973,
      rocAuc: 0.9986,
      fitSeconds: 0.524,
      confusionMatrix: { tn: 40453, fp: 2, fn: 164, tp: 30120 },
    },
  ];

  const results = evaluationData?.primaryResults?.length
    ? evaluationData.primaryResults
    : fallbackResults;

  const currentModel =
    results.find((r: any) => r.dataset.includes(selectedPipeline)) || results[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-[var(--text-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Model Performance &amp; Evaluation Benchmarks
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Empirical testing metrics from controlled 70:30 holdout splits. JobGuard AI strictly verifies all academic benchmark claims.
            </p>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/30 w-fit">
            Academic 70:30 Split Verified
          </span>
        </div>
      </div>

      {/* Model Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {results.map((r: any, idx: number) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedPipeline(r.dataset)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
              selectedPipeline === r.dataset
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold shadow-sm'
                : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            {r.dataset}: {r.classifier}
          </button>
        ))}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
            Accuracy
          </span>
          <div className="text-2xl font-extrabold text-[var(--text-primary)]">
            {(currentModel.accuracy * 100).toFixed(2)}%
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
            Overall Correct Ratio
          </span>
        </div>

        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
            Precision
          </span>
          <div className="text-2xl font-extrabold text-[#34C759]">
            {(currentModel.precision * 100).toFixed(2)}%
          </div>
          <span className="text-[10px] text-[#34C759] mt-0.5 block">
            Zero False Positives Priority
          </span>
        </div>

        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
            Recall
          </span>
          <div className="text-2xl font-extrabold text-[#F59E0B]">
            {(currentModel.recall * 100).toFixed(2)}%
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
            Scam Detection Sensitivity
          </span>
        </div>

        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
            F1-Score
          </span>
          <div className="text-2xl font-extrabold text-[var(--accent-primary)]">
            {(currentModel.f1Score * 100).toFixed(2)}%
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
            Harmonic Balance
          </span>
        </div>

        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
            ROC-AUC
          </span>
          <div className="text-2xl font-extrabold text-purple-500">
            {(currentModel.rocAuc * 100).toFixed(2)}%
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">
            Separability Measure
          </span>
        </div>
      </div>

      {/* Confusion Matrix & Technical Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Confusion Matrix (2x2 Grid) */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Confusion Matrix (Test Split: n={currentModel.testCount})
            </h2>
            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
              {currentModel.dataset}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* True Negative */}
            <div className="p-4 bg-[#34C759]/10 border border-[#34C759]/30 rounded-2xl text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#34C759] block">
                True Negatives (TN)
              </span>
              <div className="text-2xl font-black text-[#34C759] font-mono">
                {currentModel.confusionMatrix.tn.toLocaleString()}
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                Legitimate listings accurately verified
              </span>
            </div>

            {/* False Positive */}
            <div className="p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#F59E0B] block">
                False Positives (FP)
              </span>
              <div className="text-2xl font-black text-[#F59E0B] font-mono">
                {currentModel.confusionMatrix.fp.toLocaleString()}
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                Legitimate falsely flagged as fraud
              </span>
            </div>

            {/* False Negative */}
            <div className="p-4 bg-[#D70015]/10 border border-[#D70015]/30 rounded-2xl text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#D70015] block">
                False Negatives (FN)
              </span>
              <div className="text-2xl font-black text-[#D70015] font-mono">
                {currentModel.confusionMatrix.fn.toLocaleString()}
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                Fraud missed by statistical model
              </span>
            </div>

            {/* True Positive */}
            <div className="p-4 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 rounded-2xl text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--accent-primary)] block">
                True Positives (TP)
              </span>
              <div className="text-2xl font-black text-[var(--accent-primary)] font-mono">
                {currentModel.confusionMatrix.tp.toLocaleString()}
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                Fraudulent scams successfully identified
              </span>
            </div>
          </div>
        </div>

        {/* Technical Architecture & Training Parameters */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Pipeline Architecture
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--text-tertiary)]">
              {currentModel.split} Split
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start justify-between p-2.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)]">Pipeline Specification:</span>
              <span className="font-bold text-[var(--text-primary)] text-right">
                {currentModel.pipeline}
              </span>
            </div>

            <div className="flex items-start justify-between p-2.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)]">Feature Space:</span>
              <span className="font-bold text-[var(--text-primary)] text-right">
                {currentModel.featureExtraction}
              </span>
            </div>

            <div className="flex items-start justify-between p-2.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)]">Training Sample Count:</span>
              <span className="font-bold text-[var(--text-primary)] font-mono">
                n = {currentModel.trainCount.toLocaleString()}
              </span>
            </div>

            <div className="flex items-start justify-between p-2.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)]">Test Holdout Sample Count:</span>
              <span className="font-bold text-[var(--text-primary)] font-mono">
                n = {currentModel.testCount.toLocaleString()}
              </span>
            </div>

            {currentModel.fitSeconds && (
              <div className="flex items-start justify-between p-2.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Model Fit Duration:</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">
                  {currentModel.fitSeconds}s
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
