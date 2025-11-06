/**
 * ML Pipeline System - نظام أنابيب التعلم الآلي
 *
 * نظام متقدم لبناء وإدارة وتنفيذ خطوط أنابيب التعلم الآلي
 * Advanced system for building, managing, and executing ML pipelines
 */

import { EventEmitter } from 'events';

/**
 * Pipeline Stage Types
 */
export enum PipelineStageType {
  DATA_LOADING = 'data_loading',
  PREPROCESSING = 'preprocessing',
  FEATURE_ENGINEERING = 'feature_engineering',
  MODEL_TRAINING = 'model_training',
  MODEL_EVALUATION = 'model_evaluation',
  MODEL_DEPLOYMENT = 'model_deployment',
  PREDICTION = 'prediction',
  POSTPROCESSING = 'postprocessing'
}

/**
 * Data Types
 */
export interface MLData {
  features: number[][];
  labels?: number[];
  metadata?: Record<string, any>;
}

/**
 * Model Configuration
 */
export interface ModelConfig {
  type: 'linear_regression' | 'logistic_regression' | 'neural_network' | 'decision_tree' | 'random_forest' | 'svm';
  hyperparameters: Record<string, any>;
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
}

/**
 * Pipeline Stage
 */
export interface PipelineStage {
  id: string;
  name: string;
  type: PipelineStageType;
  execute: (data: any) => Promise<any>;
  config?: Record<string, any>;
}

/**
 * Pipeline Metrics
 */
export interface PipelineMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mse?: number;
  mae?: number;
  r2Score?: number;
  executionTime: number;
  dataPoints: number;
}

/**
 * Pipeline Run Result
 */
export interface PipelineRunResult {
  success: boolean;
  output: any;
  metrics: PipelineMetrics;
  stageResults: Map<string, any>;
  errors: string[];
  warnings: string[];
}

/**
 * ML Pipeline System
 * نظام أنابيب التعلم الآلي
 */
export class MLPipeline extends EventEmitter {
  private stages: PipelineStage[] = [];
  private currentData: any = null;
  private metrics: PipelineMetrics | null = null;
  private isRunning = false;

  constructor(
    private name: string,
    private config: {
      parallelExecution?: boolean;
      cacheResults?: boolean;
      validateData?: boolean;
    } = {}
  ) {
    super();
  }

  /**
   * Add a stage to the pipeline
   */
  addStage(stage: PipelineStage): this {
    this.stages.push(stage);
    this.emit('stage_added', { stage });
    return this;
  }

  /**
   * Remove a stage from the pipeline
   */
  removeStage(stageId: string): boolean {
    const index = this.stages.findIndex(s => s.id === stageId);
    if (index !== -1) {
      const removed = this.stages.splice(index, 1)[0];
      this.emit('stage_removed', { stage: removed });
      return true;
    }
    return false;
  }

  /**
   * Data Loading Stage
   */
  addDataLoader(
    loader: (source: string) => Promise<MLData>
  ): this {
    return this.addStage({
      id: 'data_loader',
      name: 'Data Loader',
      type: PipelineStageType.DATA_LOADING,
      execute: async (source: string) => {
        const data = await loader(source);
        if (this.config.validateData) {
          this.validateData(data);
        }
        return data;
      }
    });
  }

  /**
   * Preprocessing Stage
   */
  addPreprocessing(
    preprocessor: (data: MLData) => Promise<MLData>
  ): this {
    return this.addStage({
      id: 'preprocessor',
      name: 'Data Preprocessor',
      type: PipelineStageType.PREPROCESSING,
      execute: preprocessor
    });
  }

  /**
   * Feature Engineering Stage
   */
  addFeatureEngineering(
    engineer: (data: MLData) => Promise<MLData>
  ): this {
    return this.addStage({
      id: 'feature_engineer',
      name: 'Feature Engineer',
      type: PipelineStageType.FEATURE_ENGINEERING,
      execute: engineer
    });
  }

  /**
   * Model Training Stage
   */
  addModelTraining(
    config: ModelConfig,
    trainer?: (data: MLData, config: ModelConfig) => Promise<any>
  ): this {
    return this.addStage({
      id: 'model_trainer',
      name: 'Model Trainer',
      type: PipelineStageType.MODEL_TRAINING,
      config,
      execute: async (data: MLData) => {
        if (trainer) {
          return await trainer(data, config);
        }
        return this.trainModel(data, config);
      }
    });
  }

  /**
   * Model Evaluation Stage
   */
  addModelEvaluation(
    evaluator?: (model: any, testData: MLData) => Promise<PipelineMetrics>
  ): this {
    return this.addStage({
      id: 'model_evaluator',
      name: 'Model Evaluator',
      type: PipelineStageType.MODEL_EVALUATION,
      execute: async ({ model, testData }: { model: any; testData: MLData }) => {
        if (evaluator) {
          this.metrics = await evaluator(model, testData);
        } else {
          this.metrics = await this.evaluateModel(model, testData);
        }
        return { model, metrics: this.metrics };
      }
    });
  }

  /**
   * Run the entire pipeline
   */
  async run(initialData: any): Promise<PipelineRunResult> {
    if (this.isRunning) {
      throw new Error('Pipeline is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();
    const stageResults = new Map<string, any>();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      this.emit('pipeline_started', { name: this.name, stages: this.stages.length });

      let data = initialData;

      for (const stage of this.stages) {
        try {
          this.emit('stage_started', { stage });
          const result = await stage.execute(data);
          stageResults.set(stage.id, result);
          data = result;
          this.emit('stage_completed', { stage, result });
        } catch (error) {
          const errorMsg = `Stage ${stage.name} failed: ${error}`;
          errors.push(errorMsg);
          this.emit('stage_failed', { stage, error });

          // Continue or stop based on configuration
          if (!this.config.parallelExecution) {
            throw error;
          }
        }
      }

      const executionTime = Date.now() - startTime;

      const result: PipelineRunResult = {
        success: errors.length === 0,
        output: data,
        metrics: this.metrics || {
          executionTime,
          dataPoints: 0
        },
        stageResults,
        errors,
        warnings
      };

      this.emit('pipeline_completed', result);
      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const result: PipelineRunResult = {
        success: false,
        output: null,
        metrics: { executionTime, dataPoints: 0 },
        stageResults,
        errors: [...errors, String(error)],
        warnings
      };

      this.emit('pipeline_failed', result);
      return result;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Train a model (simple implementation)
   */
  private async trainModel(data: MLData, config: ModelConfig): Promise<any> {
    // Simple mock implementation - في الإنتاج يتم استخدام TensorFlow.js أو ML libraries
    return {
      type: config.type,
      weights: new Array(data.features[0]?.length || 0).fill(Math.random()),
      bias: Math.random(),
      hyperparameters: config.hyperparameters,
      trained: true
    };
  }

  /**
   * Evaluate a model
   */
  private async evaluateModel(model: any, testData: MLData): Promise<PipelineMetrics> {
    const predictions = this.predict(model, testData.features);

    if (!testData.labels) {
      return {
        executionTime: 0,
        dataPoints: testData.features.length
      };
    }

    // Calculate metrics
    const mse = this.calculateMSE(predictions, testData.labels);
    const mae = this.calculateMAE(predictions, testData.labels);

    return {
      mse,
      mae,
      r2Score: this.calculateR2(predictions, testData.labels),
      executionTime: 0,
      dataPoints: testData.features.length
    };
  }

  /**
   * Make predictions
   */
  private predict(model: any, features: number[][]): number[] {
    return features.map(feature => {
      const sum = feature.reduce((acc, val, idx) => {
        return acc + (val * (model.weights[idx] || 0));
      }, model.bias || 0);
      return sum;
    });
  }

  /**
   * Calculate Mean Squared Error
   */
  private calculateMSE(predictions: number[], actual: number[]): number {
    const sum = predictions.reduce((acc, pred, idx) => {
      const error = pred - actual[idx];
      return acc + (error * error);
    }, 0);
    return sum / predictions.length;
  }

  /**
   * Calculate Mean Absolute Error
   */
  private calculateMAE(predictions: number[], actual: number[]): number {
    const sum = predictions.reduce((acc, pred, idx) => {
      return acc + Math.abs(pred - actual[idx]);
    }, 0);
    return sum / predictions.length;
  }

  /**
   * Calculate R² Score
   */
  private calculateR2(predictions: number[], actual: number[]): number {
    const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
    const ssRes = predictions.reduce((acc, pred, idx) => {
      const error = actual[idx] - pred;
      return acc + (error * error);
    }, 0);
    const ssTot = actual.reduce((acc, val) => {
      const error = val - mean;
      return acc + (error * error);
    }, 0);
    return 1 - (ssRes / ssTot);
  }

  /**
   * Validate data
   */
  private validateData(data: MLData): void {
    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('Invalid features data');
    }

    if (data.labels && data.labels.length !== data.features.length) {
      throw new Error('Features and labels length mismatch');
    }

    // Check for NaN or Infinity
    for (const feature of data.features) {
      if (feature.some(val => !isFinite(val))) {
        throw new Error('Features contain invalid values (NaN or Infinity)');
      }
    }
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    name: string;
    stages: number;
    metrics: PipelineMetrics | null;
    isRunning: boolean;
  } {
    return {
      name: this.name,
      stages: this.stages.length,
      metrics: this.metrics,
      isRunning: this.isRunning
    };
  }

  /**
   * Export pipeline configuration
   */
  export(): {
    name: string;
    stages: Array<{ id: string; name: string; type: PipelineStageType; config?: any }>;
    config: any;
  } {
    return {
      name: this.name,
      stages: this.stages.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        config: s.config
      })),
      config: this.config
    };
  }

  /**
   * Clear all stages
   */
  clear(): void {
    this.stages = [];
    this.currentData = null;
    this.metrics = null;
    this.emit('pipeline_cleared');
  }
}

/**
 * Create a simple ML pipeline
 */
export function createMLPipeline(name: string): MLPipeline {
  return new MLPipeline(name, {
    parallelExecution: false,
    cacheResults: true,
    validateData: true
  });
}

/**
 * Utility: Normalize data
 */
export function normalizeData(data: number[][]): number[][] {
  const features = data[0].length;
  const mins = new Array(features).fill(Infinity);
  const maxs = new Array(features).fill(-Infinity);

  // Find min/max for each feature
  for (const row of data) {
    row.forEach((val, idx) => {
      mins[idx] = Math.min(mins[idx], val);
      maxs[idx] = Math.max(maxs[idx], val);
    });
  }

  // Normalize
  return data.map(row => {
    return row.map((val, idx) => {
      const range = maxs[idx] - mins[idx];
      return range === 0 ? 0 : (val - mins[idx]) / range;
    });
  });
}

/**
 * Utility: Split data into train/test sets
 */
export function trainTestSplit(
  data: MLData,
  testSize: number = 0.2
): { train: MLData; test: MLData } {
  const totalSize = data.features.length;
  const testCount = Math.floor(totalSize * testSize);
  const trainCount = totalSize - testCount;

  // Shuffle indices
  const indices = Array.from({ length: totalSize }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const trainIndices = indices.slice(0, trainCount);
  const testIndices = indices.slice(trainCount);

  return {
    train: {
      features: trainIndices.map(i => data.features[i]),
      labels: data.labels ? trainIndices.map(i => data.labels![i]) : undefined,
      metadata: data.metadata
    },
    test: {
      features: testIndices.map(i => data.features[i]),
      labels: data.labels ? testIndices.map(i => data.labels![i]) : undefined,
      metadata: data.metadata
    }
  };
}
