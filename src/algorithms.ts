import { Point, ObjectiveFunction, Constraint, IterationStep, LineSearchStep, Algorithm } from "./types";

// Analytical calculations for functions

export const Rosenbrock: ObjectiveFunction = {
  id: "rosenbrock",
  name: "Rosenbrock (香蕉函数)",
  formula: "f(x, y) = (1 - x)^2 + 100 * (y - x^2)^2",
  evaluate: (x, y) => Math.pow(1 - x, 2) + 100 * Math.pow(y - x * x, 2),
  gradient: (x, y) => ({
    x: -2 * (1 - x) - 400 * x * (y - x * x),
    y: 200 * (y - x * x),
  }),
  hessian: (x, y) => [
    [2 - 400 * y + 1200 * x * x, -400 * x],
    [-400 * x, 200],
  ],
  defaultStart: { x: -1.2, y: 1.0 },
  bounds: { xMin: -2.0, xMax: 2.0, yMin: -0.5, yMax: 2.5 },
};

export const Booth: ObjectiveFunction = {
  id: "booth",
  name: "Booth (平底椭圆函数)",
  formula: "f(x, y) = (x + 2y - 7)^2 + (2x + y - 5)^2",
  evaluate: (x, y) => Math.pow(x + 2 * y - 7, 2) + Math.pow(2 * x + y - 5, 2),
  gradient: (x, y) => ({
    x: 10 * x + 8 * y - 34,
    y: 8 * x + 10 * y - 38,
  }),
  hessian: () => [
    [10, 8],
    [8, 10],
  ],
  defaultStart: { x: -4.0, y: -3.0 },
  bounds: { xMin: -5.0, xMax: 5.0, yMin: -5.0, yMax: 5.0 },
};

export const Beale: ObjectiveFunction = {
  id: "beale",
  name: "Beale (不规则平原函数)",
  formula: "f(x, y) = (1.5 - x + x*y)^2 + (2.25 - x + x*y^2)^2 + (2.625 - x + x*y^3)^2",
  evaluate: (x, y) => {
    const term1 = 1.5 - x + x * y;
    const term2 = 2.25 - x + x * y * y;
    const term3 = 2.625 - x + x * Math.pow(y, 3);
    return term1 * term1 + term2 * term2 + term3 * term3;
  },
  gradient: (x, y) => {
    const t1 = 1.5 - x + x * y;
    const t2 = 2.25 - x + x * y * y;
    const t3 = 2.625 - x + x * Math.pow(y, 3);
    return {
      x: 2 * t1 * (y - 1) + 2 * t2 * (y * y - 1) + 2 * t3 * (Math.pow(y, 3) - 1),
      y: 2 * t1 * x + 2 * t2 * (2 * x * y) + 2 * t3 * (3 * x * y * y),
    };
  },
  hessian: (x, y) => {
    // Finite difference approximation for Hessian to keep Beale calculation bug-free and clean
    const eps = 1e-5;
    const grad = Beale.gradient;
    const g0 = grad(x, y);
    const gx = grad(x + eps, y);
    const gy = grad(x, y + eps);
    return [
      [(gx.x - g0.x) / eps, (gy.x - g0.x) / eps],
      [(gx.y - g0.y) / eps, (gy.y - g0.y) / eps],
    ];
  },
  defaultStart: { x: -3.0, y: -2.0 },
  bounds: { xMin: -4.5, xMax: 4.5, yMin: -4.5, yMax: 4.5 },
};

export const Himmelblau: ObjectiveFunction = {
  id: "himmelblau",
  name: "Himmelblau (多峰函数)",
  formula: "f(x, y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2",
  evaluate: (x, y) => Math.pow(x * x + y - 11, 2) + Math.pow(x + y * y - 7, 2),
  gradient: (x, y) => ({
    x: 4 * x * (x * x + y - 11) + 2 * (x + y * y - 7),
    y: 2 * (x * x + y - 11) + 4 * y * (x + y * y - 7),
  }),
  hessian: (x, y) => [
    [12 * x * x + 4 * y - 42, 4 * x + 4 * y],
    [4 * x + 4 * y, 4 * x + 12 * y * y - 26],
  ],
  defaultStart: { x: -0.2, y: 0.2 },
  bounds: { xMin: -5.0, xMax: 5.0, yMin: -5.0, yMax: 5.0 },
};

export const Ackley: ObjectiveFunction = {
  id: "ackley",
  name: "Ackley (多峰针状函数)",
  formula: "f(x, y) = -20*exp(-0.2*√(0.5*(x²+y²))) - exp(0.5*(cos(2πx)+cos(2πy))) + 20 + e",
  evaluate: (x, y) => {
    const r = Math.sqrt(0.5 * (x * x + y * y));
    const term1 = -20 * Math.exp(-0.2 * r);
    const term2 = -Math.exp(0.5 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y)));
    return term1 + term2 + 20 + Math.E;
  },
  gradient: (x, y) => {
    const r = Math.sqrt(0.5 * (x * x + y * y));
    if (r < 1e-12) {
      return { x: 0, y: 0 };
    }
    const term1_grad_coeff = (4 * Math.exp(-0.2 * r) * 0.5) / r; // coefficient from derivative
    const term2_val = Math.exp(0.5 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y)));
    return {
      x: term1_grad_coeff * x + Math.PI * Math.sin(2 * Math.PI * x) * term2_val,
      y: term1_grad_coeff * y + Math.PI * Math.sin(2 * Math.PI * y) * term2_val,
    };
  },
  hessian: (x, y) => {
    const eps = 1e-5;
    const grad = Ackley.gradient;
    const g0 = grad(x, y);
    const gx = grad(x + eps, y);
    const gy = grad(x, y + eps);
    return [
      [(gx.x - g0.x) / eps, (gy.x - g0.x) / eps],
      [(gx.y - g0.y) / eps, (gy.y - g0.y) / eps],
    ];
  },
  defaultStart: { x: 1.5, y: 1.5 },
  bounds: { xMin: -5.0, xMax: 5.0, yMin: -5.0, yMax: 5.0 },
};

export const Bowl: ObjectiveFunction = {
  id: "bowl",
  name: "Bowl (经典抛物面)",
  formula: "f(x, y) = x^2 + y^2",
  evaluate: (x, y) => x * x + y * y,
  gradient: (x, y) => ({ x: 2 * x, y: 2 * y }),
  hessian: () => [
    [2, 0],
    [0, 2],
  ],
  defaultStart: { x: 3.5, y: 3.5 },
  bounds: { xMin: -5.0, xMax: 5.0, yMin: -5.0, yMax: 5.0 },
};

export const Pyramid: ObjectiveFunction = {
  id: "pyramid",
  name: "Pyramid (尖峰锥形面)",
  formula: "f(x, y) = |x| + |y|",
  evaluate: (x, y) => Math.abs(x) + Math.abs(y),
  gradient: (x, y) => ({
    x: x === 0 ? 0 : x > 0 ? 1 : -1,
    y: y === 0 ? 0 : y > 0 ? 1 : -1,
  }),
  hessian: () => [
    [0, 0],
    [0, 0],
  ],
  defaultStart: { x: 3.0, y: 3.0 },
  bounds: { xMin: -5.0, xMax: 5.0, yMin: -5.0, yMax: 5.0 },
};

export const Maron: ObjectiveFunction = {
  id: "maron",
  name: "Maron (倾斜单峰槽)",
  formula: "f(x, y) = x^2 + x*y + y^2",
  evaluate: (x, y) => x * x + x * y + y * y,
  gradient: (x, y) => ({
    x: 2 * x + y,
    y: x + 2 * y,
  }),
  hessian: () => [
    [2, 1],
    [1, 2],
  ],
  defaultStart: { x: -3.0, y: 3.0 },
  bounds: { xMin: -5.0, xMax: 5.0, yMin: -5.0, yMax: 5.0 },
};

export const functionsList = [Rosenbrock, Bowl, Pyramid, Maron, Booth, Himmelblau];

// Available constraints
export const CircularConstraint: Constraint = {
  id: "circle",
  name: "圆形可行域 (x² + y² ≤ 4)",
  formula: "x^2 + y^2 - 4 <= 0",
  evaluate: (x, y) => x * x + y * y - 4,
  gradient: (x, y) => ({ x: 2 * x, y: 2 * y }),
  multiplier: 0,
};

export const ParabolicConstraint: Constraint = {
  id: "parabola",
  name: "抛物线可行域 (y ≥ x² - 1)",
  formula: "x^2 - y - 1 <= 0",
  evaluate: (x, y) => x * x - y - 1,
  gradient: (x, y) => ({ x: 2 * x, y: -1 }),
  multiplier: 0,
};

export const LinearConstraint: Constraint = {
  id: "linear",
  name: "线性可行域 (x + y ≤ 1.5)",
  formula: "x + y - 1.5 <= 0",
  evaluate: (x, y) => x + y - 1.5,
  gradient: () => ({ x: 1, y: 1 }),
  multiplier: 0,
};

export const constraintsList = [CircularConstraint, ParabolicConstraint, LinearConstraint];

// Pseudo codes definitions
export const algorithmsList: Algorithm[] = [
  {
    id: "gd",
    name: "梯度下降法 (Gradient Descent)",
    description: "经典一阶最速下降，沿着梯度反方向搜索。在陡峭谷底容易发生“Z”字型锯齿震荡。",
    pseudoCode: [
      { num: 1, text: "计算梯度 d_k = -∇f(x_k)", desc: "获取当前位置下降速度最快的方向" },
      { num: 2, text: "线搜索确定步长 α_k", desc: "采用 Armijo 准则回溯，寻找满足充分下降的步长" },
      { num: 3, text: "更新状态 x_{k+1} = x_k + α_k * d_k", desc: "迈出优化步伐" },
      { num: 4, text: "检验收敛 ‖∇f(x_k)‖ < tol", desc: "判断梯度是否足够接近零，达到平坦驻点" },
    ],
  },
  {
    id: "newton",
    name: "阻尼牛顿法 (Damped Newton)",
    description: "二阶优化算法，利用 Hessian 矩阵考虑曲面弯曲率，具有局部二次收敛速度。若非正定则进行正则化修正。",
    pseudoCode: [
      { num: 1, text: "计算梯度 g_k 与 Hessian H_k", desc: "获取曲面的一阶斜率与二阶弯曲率信息" },
      { num: 2, text: "求解牛顿方向 H_k * d_k = -g_k", desc: "通过解线性方程组，将步子指向局部极小估计值" },
      { num: 3, text: "正则化修正 (若 Hessian 非正定)", desc: "若特征值非正，添加 H_k' = H_k + εI 以确保方向仍为下降方向" },
      { num: 4, text: "线搜索确定步长 α_k 并更新", desc: "通过回溯确保全局收敛，防止大步跨越导致发散" },
    ],
  },
  {
    id: "bfgs",
    name: "拟牛顿法 (BFGS)",
    description: "最著名的拟牛顿法。无需计算二阶导数，仅通过一阶梯度信息动态更新逆 Hessian 矩阵的近似，兼顾计算开销与二次收敛速度。",
    pseudoCode: [
      { num: 1, text: "计算拟牛顿方向 d_k = -B_k * ∇f(x_k)", desc: "利用当前的逆 Hessian 近似矩阵 B_k 计算搜索方向" },
      { num: 2, text: "Armijo 回溯线搜索确定 α_k", desc: "寻找充分下降步长，并更新位置 x_{k+1} = x_k + α_k * d_k" },
      { num: 3, text: "计算变位 s_k = Δx 和变度 y_k = Δg", desc: "捕获本次迭代产生的自变量变化与梯度变化" },
      { num: 4, text: "BFGS 公式更新近似逆矩阵 B_{k+1}", desc: "融入新的一阶曲率特征，更新二阶弯曲度近似 B_k" },
    ],
  },
  {
    id: "penalty",
    name: "罚函数法 (Penalty Method)",
    description: "专治带约束的非线性规划。将约束违背量乘以罚因子加上目标函数中，从而化约束为无约束优化。随着罚因子逐步增大，约束边界逐渐收紧。",
    pseudoCode: [
      { num: 1, text: "构造罚函数 F(x, y) = f(x) + μ * Σ max(0, g_i(x))^2", desc: "向越界区域施加平方惩罚，μ 为罚因子" },
      { num: 2, text: "求解无约束子问题 x_k = argmin F(x, μ_k)", desc: "使用梯度下降或拟牛顿法，在当前惩罚下寻找极小值" },
      { num: 3, text: "递增罚因子 μ_{k+1} = ρ * μ_k", desc: "逐渐将越界轨迹强势“驱逐”回可行域内部" },
      { num: 4, text: "满足约束容差及收敛条件", desc: "最终轨迹停靠在可行域边界或其内部" },
    ],
  },
];

// Helper functions for 2x2 matrix operations
function invert2x2(matrix: [[number, number], [number, number]]): [[number, number], [number, number]] | null {
  const a = matrix[0][0];
  const b = matrix[0][1];
  const c = matrix[1][0];
  const d = matrix[1][1];
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) return null;
  return [
    [d / det, -b / det],
    [-c / det, a / det],
  ];
}

// Eigenvalues of 2x2 symmetric matrix
export function getEigenvalues(H: [[number, number], [number, number]]): [number, number] {
  const a = H[0][0];
  const b = H[0][1]; // symmetric, so H[0][1] === H[1][0]
  const d = H[1][1];

  // Characteristic equation: L^2 - (a+d)L + (ad - b^2) = 0
  // L = [(a+d) +- sqrt((a+d)^2 - 4(ad-b^2))] / 2
  //   = [(a+d) +- sqrt(a^2 + 2ad + d^2 - 4ad + 4b^2)] / 2
  //   = [(a+d) +- sqrt((a-d)^2 + 4b^2)] / 2
  const trace = a + d;
  const term = Math.sqrt(Math.pow(a - d, 2) + 4 * b * b);
  return [(trace + term) / 2, (trace - term) / 2];
}

// Optimization Runner
export function runOptimization(
  func: ObjectiveFunction,
  algId: string,
  startPoint: Point,
  activeConstraints: Constraint[],
  tol: number,
  maxIterations: number,
  penaltyMu: number = 10,
  lineSearchC = 0.1,
  lineSearchBeta = 0.5
): IterationStep[] {
  const steps: IterationStep[] = [];
  let currentX = startPoint.x;
  let currentY = startPoint.y;

  // For BFGS inverse Hessian approximation
  let bfgsH: [[number, number], [number, number]] = [
    [1, 0],
    [0, 1],
  ];

  // Helper to evaluate penalized objective
  const getPenalizedVal = (x: number, y: number, mu: number) => {
    let val = func.evaluate(x, y);
    if (algId === "penalty") {
      for (const cons of activeConstraints) {
        const g = cons.evaluate(x, y);
        if (g > 0) {
          val += mu * g * g;
        }
      }
    }
    return val;
  };

  // Helper to evaluate penalized gradient
  const getPenalizedGrad = (x: number, y: number, mu: number): Point => {
    const fGrad = func.gradient(x, y);
    if (algId !== "penalty") return fGrad;

    let gx = fGrad.x;
    let gy = fGrad.y;

    for (const cons of activeConstraints) {
      const g = cons.evaluate(x, y);
      if (g > 0) {
        const gGrad = cons.gradient(x, y);
        gx += 2 * mu * g * gGrad.x;
        gy += 2 * mu * g * gGrad.y;
      }
    }
    return { x: gx, y: gy };
  };

  // Initial step setup
  let k = 0;
  let converged = false;

  // Let's loop
  while (k < maxIterations && !converged) {
    // Current penalty parameter
    const currentMu = penaltyMu * Math.pow(1.5, Math.floor(k / 10));

    // Get value & gradient
    const fx = getPenalizedVal(currentX, currentY, currentMu);
    const grad = getPenalizedGrad(currentX, currentY, currentMu);
    const gradNorm = Math.sqrt(grad.x * grad.x + grad.y * grad.y);

    // KKT diagnosis
    const activeNames: string[] = [];
    let maxKktViolation = 0;

    for (const cons of activeConstraints) {
      const g = cons.evaluate(currentX, currentY);
      if (g >= -1e-3) {
        activeNames.push(cons.name);
      }
      if (g > 0) {
        maxKktViolation = Math.max(maxKktViolation, g);
      }
    }

    // Determine search direction
    let dX = 0;
    let dY = 0;

    if (algId === "gd") {
      dX = -grad.x;
      dY = -grad.y;
    } else if (algId === "newton") {
      // Calculate Hessian
      let H = func.hessian(currentX, currentY);

      // regularize if needed (especially for penalty/non-convex regions)
      const evs = getEigenvalues(H);
      const minEv = Math.min(evs[0], evs[1]);
      if (minEv < 1e-4) {
        const shift = 1e-3 - minEv;
        H[0][0] += shift;
        H[1][1] += shift;
      }

      const invH = invert2x2(H);
      if (invH) {
        dX = -(invH[0][0] * grad.x + invH[0][1] * grad.y);
        dY = -(invH[1][0] * grad.x + invH[1][1] * grad.y);
      } else {
        // Fallback to gradient descent direction if singular
        dX = -grad.x;
        dY = -grad.y;
      }
    } else if (algId === "bfgs") {
      // Direction d_k = -B_k * grad
      dX = -(bfgsH[0][0] * grad.x + bfgsH[0][1] * grad.y);
      dY = -(bfgsH[1][0] * grad.x + bfgsH[1][1] * grad.y);
    } else if (algId === "penalty") {
      // Penalty subproblem direction is gradient descent on penalized objective
      dX = -grad.x;
      dY = -grad.y;
    }

    // Ensure search direction is descent direction
    const dotProduct = dX * grad.x + dY * grad.y;
    if (dotProduct > 0 && algId !== "penalty") {
      // Not a descent direction! Reset to negative gradient
      dX = -grad.x;
      dY = -grad.y;
    }

    // Backtracking Line Search (Armijo condition)
    let alpha = 1.0;
    const searchDirectionNorm = Math.sqrt(dX * dX + dY * dY);

    // Limit step size for safety to prevent huge function explosions
    if (searchDirectionNorm > 5.0) {
      const scale = 5.0 / searchDirectionNorm;
      dX *= scale;
      dY *= scale;
    }

    const lineSearchSteps: LineSearchStep[] = [];
    const maxLineSearchIter = 15;
    let lsIter = 0;

    // Track original objective values along direction
    for (let aTest = 1.5; aTest >= 0.05; aTest -= 0.15) {
      lineSearchSteps.push({
        alpha: aTest,
        val: getPenalizedVal(currentX + aTest * dX, currentY + aTest * dY, currentMu),
      });
    }

    // Ensure lineSearchSteps contains the active tests
    lineSearchSteps.sort((a, b) => a.alpha - b.alpha);

    // Backtracking loop
    while (lsIter < maxLineSearchIter) {
      const nextX = currentX + alpha * dX;
      const nextY = currentY + alpha * dY;
      const newVal = getPenalizedVal(nextX, nextY, currentMu);
      const threshold = fx + lineSearchC * alpha * (grad.x * dX + grad.y * dY);

      if (newVal <= threshold || alpha < 1e-6) {
        break;
      }
      alpha *= lineSearchBeta;
      lsIter++;
    }

    // Save step information
    const isCurrentFeasible = activeConstraints.every((c) => c.evaluate(currentX, currentY) <= 1e-3);

    steps.push({
      k,
      x: currentX,
      y: currentY,
      fx,
      gradX: grad.x,
      gradY: grad.y,
      dX,
      dY,
      alpha,
      lineSearchSteps,
      isFeasible: isCurrentFeasible,
      kktViolation: maxKktViolation,
      activeConstraintNames: activeNames,
    });

    // Take step
    const prevX = currentX;
    const prevY = currentY;
    const prevGrad = { ...grad };

    currentX = currentX + alpha * dX;
    currentY = currentY + alpha * dY;

    // Post-step updates (e.g. BFGS Hessian updates)
    if (algId === "bfgs" && k > 0) {
      const nextGrad = getPenalizedGrad(currentX, currentY, currentMu);
      const sk = { x: currentX - prevX, y: currentY - prevY };
      const yk = { x: nextGrad.x - prevGrad.x, y: nextGrad.y - prevGrad.y };

      const skyk = sk.x * yk.x + sk.y * yk.y;
      if (skyk > 1e-10) {
        const rho = 1.0 / skyk;

        // B_{k+1} = (I - rho*s*y^T) B_k (I - rho*y*s^T) + rho*s*s^T
        const V00 = 1 - rho * sk.x * yk.x;
        const V01 = -rho * sk.x * yk.y;
        const V10 = -rho * sk.y * yk.x;
        const V11 = 1 - rho * sk.y * yk.y;

        // Compute B_k * (I - rho*y*s^T)
        // I - rho*y*s^T is:
        const W00 = 1 - rho * yk.x * sk.x;
        const W01 = -rho * yk.x * sk.y;
        const W10 = -rho * yk.y * sk.x;
        const W11 = 1 - rho * yk.y * sk.y;

        // Multiply: Temp = V * B_k
        const T00 = V00 * bfgsH[0][0] + V01 * bfgsH[1][0];
        const T01 = V00 * bfgsH[0][1] + V01 * bfgsH[1][1];
        const T10 = V10 * bfgsH[0][0] + V11 * bfgsH[1][0];
        const T11 = V10 * bfgsH[0][1] + V11 * bfgsH[1][1];

        // Temp2 = Temp * W
        const T2_00 = T00 * W00 + T01 * W10;
        const T2_01 = T00 * W01 + T01 * W11;
        const T2_10 = T10 * W00 + T11 * W10;
        const T2_11 = T10 * W01 + T11 * W11;

        // Add rho * s * s^T
        bfgsH = [
          [T2_00 + rho * sk.x * sk.x, T2_01 + rho * sk.x * sk.y],
          [T2_10 + rho * sk.y * sk.x, T2_11 + rho * sk.y * sk.y],
        ];
      }
    }

    // Convergence check
    if (gradNorm < tol || Math.abs(currentX - prevX) + Math.abs(currentY - prevY) < 1e-7) {
      converged = true;
    }

    k++;
  }

  // Final point append
  const finalMu = penaltyMu * Math.pow(1.5, Math.floor(k / 10));
  const activeNames: string[] = [];
  let maxKktViolation = 0;
  for (const cons of activeConstraints) {
    const g = cons.evaluate(currentX, currentY);
    if (g >= -1e-3) activeNames.push(cons.name);
    if (g > 0) maxKktViolation = Math.max(maxKktViolation, g);
  }

  steps.push({
    k,
    x: currentX,
    y: currentY,
    fx: getPenalizedVal(currentX, currentY, finalMu),
    gradX: 0,
    gradY: 0,
    dX: 0,
    dY: 0,
    alpha: 0,
    isFeasible: activeConstraints.every((c) => c.evaluate(currentX, currentY) <= 1e-3),
    kktViolation: maxKktViolation,
    activeConstraintNames: activeNames,
  });

  return steps;
}
