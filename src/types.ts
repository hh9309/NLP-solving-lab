/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export interface LineSearchStep {
  alpha: number;
  val: number;
}

export interface IterationStep {
  k: number;
  x: number;
  y: number;
  fx: number;
  gradX: number;
  gradY: number;
  dX: number; // search direction x
  dY: number; // search direction y
  alpha: number; // chosen step size
  lineSearchSteps?: LineSearchStep[]; // dynamic line search slice points
  isFeasible: boolean;
  kktViolation: number;
  activeConstraintNames: string[];
}

export interface ObjectiveFunction {
  id: string;
  name: string;
  formula: string;
  evaluate: (x: number, y: number) => number;
  gradient: (x: number, y: number) => Point;
  hessian: (x: number, y: number) => [[number, number], [number, number]];
  defaultStart: Point;
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
}

export interface Constraint {
  id: string;
  name: string;
  formula: string; // e.g. "x^2 + y^2 <= 4"
  evaluate: (x: number, y: number) => number; // should be <= 0 for feasible
  gradient: (x: number, y: number) => Point;
  multiplier: number; // Lagrange multiplier estimation at current state
}

export interface PseudoCodeLine {
  num: number;
  text: string;
  desc: string;
}

export interface Algorithm {
  id: string;
  name: string;
  description: string;
  pseudoCode: PseudoCodeLine[];
}
