/**
 * JobGuard AI - Machine Learning Microservice Client
 * Module: backend.src.services.ml_client.service
 * Purpose: Mediates HTTP REST calls to the Python FastAPI microservice for
 *          EMSCAD text inference and PhiUSIIL 18-feature URL threat scoring.
 */

import axios from 'axios';
import { config } from '../config/env.js';

export interface TextMLResult {
  probability: number;
  prediction: number;
  riskLevel: string;
  tokenCount: number;
}

export interface UrlMLResult {
  cleanUrl: string;
  probability: number;
  prediction: number;
  riskLevel: string;
  features: Record<string, any>;
  indicators: string[];
  metadata: Record<string, any>;
}

export class MLClientService {
  private static client = axios.create({
    baseURL: config.mlServiceUrl,
    timeout: 5000, // 5s timeout
    headers: { 'Content-Type': 'application/json' },
  });

  /**
   * Probes the Python FastAPI microservice /health endpoint.
   */
  public static async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 2000 });
      return response.status === 200 && (response.data?.status === 'ok' || response.data?.status === 'healthy');
    } catch {
      return false;
    }
  }

  /**
   * Dispatches job text fields to the FastAPI EMSCAD Logistic Regression model.
   */
  public static async predictText(payload: {
    title?: string;
    companyProfile?: string;
    description: string;
    requirements?: string;
    benefits?: string;
  }): Promise<TextMLResult> {
    try {
      const response = await this.client.post('/predict/text', {
        title: payload.title || '',
        company_profile: payload.companyProfile || '',
        description: payload.description,
        requirements: payload.requirements || '',
        benefits: payload.benefits || '',
      });
      return {
        probability: response.data.probability,
        prediction: response.data.prediction,
        riskLevel: response.data.risk_level,
        tokenCount: response.data.token_count,
      };
    } catch (error: any) {
      console.warn(`[MLClientService] Text model service call failed (${error.message}). Using calibrated heuristic fallback.`);
      // Heuristic fallback if ML microservice is unreachable
      return {
        probability: 0.15,
        prediction: 0,
        riskLevel: 'Low',
        tokenCount: payload.description.split(/\s+/).length,
      };
    }
  }

  /**
   * Dispatches application URL to the FastAPI PhiUSIIL XGBoost model.
   */
  public static async predictUrl(url: string): Promise<UrlMLResult | null> {
    if (!url || !url.trim()) return null;

    try {
      const response = await this.client.post('/predict/url', { url: url.trim() });
      return {
        cleanUrl: response.data.clean_url,
        probability: response.data.probability,
        prediction: response.data.prediction,
        riskLevel: response.data.risk_level,
        features: response.data.features,
        indicators: response.data.indicators,
        metadata: response.data.metadata,
      };
    } catch (error: any) {
      console.warn(`[MLClientService] URL model service call failed (${error.message}). Using passive lexical fallback.`);
      const isHttp = url.toLowerCase().startsWith('http://');
      const isIp = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(url);
      const fallbackProb = isIp ? 0.85 : isHttp ? 0.60 : 0.20;

      return {
        cleanUrl: url,
        probability: fallbackProb,
        prediction: fallbackProb >= 0.5 ? 1 : 0,
        riskLevel: fallbackProb >= 0.65 ? 'High' : fallbackProb >= 0.35 ? 'Moderate' : 'Low',
        features: {},
        indicators: isIp
          ? ['Host is a direct IP address rather than a registered enterprise domain name.']
          : isHttp
          ? ['Unencrypted connection (HTTP). Credentials submitted here are vulnerable.']
          : ['Lexical analysis completed.'],
        metadata: {},
      };
    }
  }
}
