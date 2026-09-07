/**
 * UI-Only Detection Priority & Cleanup/Inspection Order Engine
 *
 * Provides model-aware operational intelligence metadata (Hazard, Location Risk,
 * Priority 0-100, Recommended Action) on top of verified model detections.
 *
 * NOTE: This is currently a presentation / simulation layer.
 * Model detections (bounding boxes, class, confidence) remain untouched.
 */

import { Detection } from '../types/detection';

export type PrioritySeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SimulatedPriorityData {
  hazard: 'Very High' | 'High' | 'Medium' | 'Low' | 'Context-Dependent';
  locationRisk: 'High' | 'Medium' | 'Low' | 'Context-based';
  priority: number; // 0 - 100
  severity: PrioritySeverity;
  severityLabel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  severityColor: string;
  recommendedAction: string;
  actionCategory: 'Inspect' | 'Cleanup' | 'Review';
  isHuman: boolean;
  priorityOrderText: string;
}

export interface PrioritizedDetection {
  detection: Detection;
  priorityData: SimulatedPriorityData;
  rank: number;
}

/**
 * Returns deterministic simulated priority intelligence for a given detection
 * based on the active specialist model and real detection confidence.
 */
export function getSimulatedPriority(
  detection: Detection,
  selectedModelOrTarget: string = 'pipeline'
): SimulatedPriorityData {
  const normTarget = (selectedModelOrTarget || '').toLowerCase();
  const normClass = (detection.class_name || '').toLowerCase();
  const conf = Math.max(0, Math.min(1, detection.confidence || 0.5));

  // Determine model context
  const isPipelineModel = normTarget.includes('pipeline') || normTarget === 'model_1';
  const isHumanModel = normTarget.includes('human') || normTarget === 'model_2' || normClass === 'human';
  const isHardwareModel =
    normTarget.includes('hardware') ||
    normTarget === 'model_3' ||
    ['cap', 'clip', 'key', 'niddle', 'needle', 'scissor', 'scissors'].includes(normClass);

  let hazard: SimulatedPriorityData['hazard'] = 'Medium';
  let locationRisk: SimulatedPriorityData['locationRisk'] = 'Context-based';
  let priority = 50;
  let recommendedAction = 'Inspect / Assess Anomaly';
  let actionCategory: SimulatedPriorityData['actionCategory'] = 'Inspect';
  let isHuman = false;

  if (isPipelineModel || normClass === 'pipeline') {
    // Model 1: Pipeline Specialist
    hazard = conf >= 0.85 ? 'Very High' : 'High';
    locationRisk = conf >= 0.85 ? 'High' : 'Medium';
    // Matches prompt example: 94% conf -> 92, 81% conf -> 78
    priority = Math.min(99, Math.max(68, Math.round(conf * 105 - 7)));
    recommendedAction = conf >= 0.85 ? 'Inspect / Assess Immediately' : 'Inspect / Verify';
    actionCategory = 'Inspect';
    isHuman = false;
  } else if (isHumanModel) {
    // Model 2: Human Specialist (Must NEVER be marked as cleanup target)
    hazard = 'Context-Dependent';
    locationRisk = 'Medium';
    // Matches prompt example: ~58 priority for typical detection
    priority = Math.min(65, Math.max(45, Math.round(conf * 25 + 35)));
    recommendedAction = 'Operator Review';
    actionCategory = 'Review';
    isHuman = true;
  } else if (isHardwareModel) {
    // Model 3: Hardware Specialist (Object-specific context)
    isHuman = false;
    actionCategory = 'Cleanup';

    if (normClass === 'clip') {
      hazard = 'Medium';
      locationRisk = 'Medium';
      priority = Math.min(79, Math.max(60, Math.round(conf * 20 + 55))); // ~71
      recommendedAction = 'Inspect / Remove if Confirmed';
    } else if (normClass === 'scissor' || normClass === 'scissors') {
      hazard = 'High';
      locationRisk = 'High';
      priority = Math.min(88, Math.max(65, Math.round(conf * 22 + 60))); // ~78
      recommendedAction = 'Inspect / Retrieve Obstruction';
    } else if (normClass === 'niddle' || normClass === 'needle') {
      hazard = 'High';
      locationRisk = 'Medium';
      priority = Math.min(84, Math.max(62, Math.round(conf * 20 + 58))); // ~74
      recommendedAction = 'Cautious Retrieval Required';
    } else if (normClass === 'key') {
      hazard = 'Medium';
      locationRisk = 'Medium';
      priority = Math.min(72, Math.max(50, Math.round(conf * 20 + 48))); // ~64
      recommendedAction = 'Log & Retrieve / Debris Removal';
    } else if (normClass === 'cap') {
      hazard = 'Low';
      locationRisk = 'Low';
      priority = Math.min(58, Math.max(35, Math.round(conf * 20 + 32))); // ~48
      recommendedAction = 'Environmental Cleanup';
    } else {
      // Fallback hardware / marine debris
      hazard = 'Medium';
      locationRisk = 'Medium';
      priority = Math.min(69, Math.max(40, Math.round(conf * 25 + 40)));
      recommendedAction = 'Inspect / Assess Debris';
    }
  } else {
    // Unsupported / Unknown class
    hazard = 'Context-Dependent';
    locationRisk = 'Context-based';
    priority = 50;
    recommendedAction = 'Priority context unavailable';
    actionCategory = 'Review';
  }

  // Determine visual severity from priority (0 - 100)
  // 80–100 → Critical / Very High (🔴)
  // 60–79  → High (🟠)
  // 40–59  → Medium (🟡)
  // 0–39   → Low (🟢)
  let severity: PrioritySeverity = 'medium';
  let severityLabel: SimulatedPriorityData['severityLabel'] = 'MEDIUM';
  let severityColor = '#eab308'; // yellow

  if (priority >= 80) {
    severity = 'critical';
    severityLabel = 'CRITICAL';
    severityColor = '#f43f5e'; // red
  } else if (priority >= 60) {
    severity = 'high';
    severityLabel = 'HIGH';
    severityColor = '#f97316'; // orange
  } else if (priority >= 40) {
    severity = 'medium';
    severityLabel = 'MEDIUM';
    severityColor = '#eab308'; // yellow
  } else {
    severity = 'low';
    severityLabel = 'LOW';
    severityColor = '#10b981'; // green
  }

  const priorityOrderText = `${detection.id} → ${detection.class_name} — Priority ${priority}`;

  return {
    hazard,
    locationRisk,
    priority,
    severity,
    severityLabel,
    severityColor,
    recommendedAction,
    actionCategory,
    isHuman,
    priorityOrderText,
  };
}

/**
 * Sorts real detections by simulated Priority descending for Cleanup / Inspection Order.
 */
export function getSortedDetectionsByPriority(
  detections: Detection[],
  selectedModelOrTarget: string = 'pipeline'
): PrioritizedDetection[] {
  const list = detections.map((det) => ({
    detection: det,
    priorityData: getSimulatedPriority(det, selectedModelOrTarget),
    rank: 0,
  }));

  // Sort by priority descending. If equal, higher confidence wins.
  list.sort((a, b) => {
    if (b.priorityData.priority !== a.priorityData.priority) {
      return b.priorityData.priority - a.priorityData.priority;
    }
    return b.detection.confidence - a.detection.confidence;
  });

  // Assign 1-indexed ranks
  return list.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}
