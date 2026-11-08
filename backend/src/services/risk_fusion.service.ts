/**
 * JobGuard AI - Consensus Risk Fusion & Threat Aggregation Engine
 * Module: backend.src.services.risk_fusion.service
 * Purpose: Dynamically fuses multi-engine evidence into a calibrated 0-100 risk score.
 * Formulation: Calibrated weighted consensus with dynamic normalization across active streams.
 * Policy: Never fabricates inactive model scores. Never allows ATS presence alone to mark a job safe.
 */

import { RiskBreakdown, RiskLevel } from '../types/index.js';

export class RiskFusionService {
  /**
   * Computes the calibrated composite risk score and forensic breakdown.
   *
   * @param H Rule / Payment / Advance-fee heuristic evidence (0.00 - 1.00)
   * @param M EMSCAD statistical text model probability (0.00 - 1.00 or null if text stream absent)
   * @param U PhiUSIIL 18-feature URL threat probability (0.00 - 1.00 or null if URL stream absent)
   * @param G Google Gemini contextual AI evidence (0.00 - 1.00 or null if offline)
   * @param hasCriticalAdvanceFee Boolean indicating hard advance-fee extortion pattern
   * @param hasBrandImpersonation Boolean indicating mismatch between claimed company and contact/URL domain
   */
  public static fuse(
    H: number,
    M: number | null,
    U: number | null,
    G: number | null,
    hasCriticalAdvanceFee: boolean,
    hasBrandImpersonation: boolean = false,
    isOfficialPortalVerified: boolean = false
  ): RiskBreakdown {
    const hasTextML = M !== null && M !== undefined;
    const hasUrl = U !== null && U !== undefined;
    const hasGemini = G !== null && G !== undefined;

    // Define baseline raw weights based on present streams
    let rawH = 0.35;
    let rawM = hasTextML ? 0.25 : 0.0;
    let rawU = hasUrl ? 0.15 : 0.0;
    let rawG = hasGemini ? 0.25 : 0.0;

    // Adjust balance for single-stream specialized modes
    if (!hasTextML && hasUrl) {
      // URL-focused scan: Rule indicators + URL model + Gemini domain assessment
      rawH = 0.25;
      rawU = 0.45;
      rawG = hasGemini ? 0.30 : 0.0;
    } else if (!hasTextML && !hasUrl) {
      // Company-focused or entity verification scan: Heuristic entity checks + Gemini verification
      rawH = 0.15;
      rawG = hasGemini ? 0.85 : 0.0;
    } else if (hasTextML && !hasUrl) {
      // Text-focused scan without URL: Heuristic rules + EMSCAD text model + Gemini reasoning
      rawH = 0.35;
      rawM = 0.35;
      rawG = hasGemini ? 0.30 : 0.0;
    }

    const totalRawWeight = rawH + rawM + rawU + rawG;
    const normH = totalRawWeight > 0 ? rawH / totalRawWeight : 1.0;
    const normM = totalRawWeight > 0 ? rawM / totalRawWeight : 0.0;
    const normU = totalRawWeight > 0 ? rawU / totalRawWeight : 0.0;
    const normG = totalRawWeight > 0 ? rawG / totalRawWeight : 0.0;

    const valM = hasTextML ? M : 0.0;
    const valU = hasUrl ? U : 0.0;
    const valG = hasGemini ? G : 0.0;

    let rawComposite = 100.0 * (normH * H + normM * valM + normU * valU + normG * valG);
    rawComposite = Math.max(0.0, Math.min(100.0, rawComposite));

    // Official Corporate Portal Calibration: A genuine corporate careers domain with zero red flags evaluates to Low Risk
    if (isOfficialPortalVerified && !hasBrandImpersonation && !hasCriticalAdvanceFee) {
      rawComposite = Math.min(rawComposite, 8.0);
    }

    const overridesApplied: string[] = [];

    // Impersonation Override: If claimed company mismatches application link or recruiter contact
    if (hasBrandImpersonation) {
      if (rawComposite < 75.0) {
        rawComposite = 75.0;
      }
      overridesApplied.push('Impersonation Warning: Claimed employer does not match application link or communication domain.');
    }

    // Critical Advance-Fee Override: Mandate High Risk (minimum 85)
    if (hasCriticalAdvanceFee) {
      if (rawComposite < 85.0) {
        rawComposite = 85.0;
      }
      overridesApplied.push('Critical Payment Demand: Advance-fee or equipment payment requirement detected.');
    }

    const finalScore = Math.round(rawComposite);

    let riskLevel: RiskLevel;
    if (finalScore >= 65) {
      riskLevel = 'High Risk';
    } else if (finalScore >= 35) {
      riskLevel = 'Moderate Risk';
    } else {
      riskLevel = 'Low Risk';
    }

    return {
      compositeScore: finalScore,
      riskLevel,
      formula: 'Dynamic Multi-Engine Consensus Fusion',
      weights: {
        heuristicRules: Math.round(normH * 100) / 100,
        textMLModel: hasTextML ? Math.round(normM * 100) / 100 : 0,
        urlPhishingModel: hasUrl ? Math.round(normU * 100) / 100 : 0,
        geminiReasoning: hasGemini ? Math.round(normG * 100) / 100 : 0,
      },
      components: {
        heuristicSubscore: Math.round(H * 100),
        textMLSubscore: hasTextML ? Math.round(valM * 100) : null as any,
        urlSubscore: hasUrl ? Math.round(valU * 100) : null,
        geminiSubscore: hasGemini ? Math.round(valG * 100) : null,
      },
      overridesApplied,
      hasAdvanceFeeOverride: hasCriticalAdvanceFee,
    };
  }
}
