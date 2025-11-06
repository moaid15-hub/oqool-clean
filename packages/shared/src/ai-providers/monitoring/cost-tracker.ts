/**
 * E**(9 'D*CDA) 'DE*B/E
 */
export class CostTracker {
  private costs: CostEntry[] = [];
  private budgets: Map<string, Budget> = new Map();
  private alerts: CostAlert[] = [];

  /**
   * *3,JD *CDA)
   */
  recordCost(entry: Omit<CostEntry, 'id' | 'timestamp'>): string {
    const costEntry: CostEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      ...entry
    };

    this.costs.push(costEntry);

    // 'D*-BB EF 'DEJ2'FJ'*
    this.checkBudgets(costEntry);

    // 'D'-*A'8 (".1 10000 3,D AB7
    if (this.costs.length > 10000) {
      this.costs = this.costs.slice(-10000);
    }

    return costEntry.id;
  }

  /**
   * 'D-5HD 9DI 'D*CDA) 'D%,E'DJ)
   */
  getTotalCost(filters?: CostFilters): number {
    const filteredCosts = this.filterCosts(filters);
    return filteredCosts.reduce((sum, entry) => sum + entry.cost, 0);
  }

  /**
   * 'D-5HD 9DI 'D*CDA) -3( 'DE2H/
   */
  getCostByProvider(filters?: CostFilters): Record<string, number> {
    const filteredCosts = this.filterCosts(filters);
    const costsByProvider: Record<string, number> = {};

    filteredCosts.forEach(entry => {
      costsByProvider[entry.provider] = (costsByProvider[entry.provider] || 0) + entry.cost;
    });

    return costsByProvider;
  }

  /**
   * 'D-5HD 9DI 'D*CDA) -3( 'DE41H9
   */
  getCostByProject(filters?: CostFilters): Record<string, number> {
    const filteredCosts = this.filterCosts(filters);
    const costsByProject: Record<string, number> = {};

    filteredCosts.forEach(entry => {
      if (entry.projectId) {
        costsByProject[entry.projectId] = (costsByProject[entry.projectId] || 0) + entry.cost;
      }
    });

    return costsByProject;
  }

  /**
   * *5AJ) 'D*C'DJA
   */
  private filterCosts(filters?: CostFilters): CostEntry[] {
    if (!filters) return this.costs;

    return this.costs.filter(entry => {
      if (filters.provider && entry.provider !== filters.provider) return false;
      if (filters.model && entry.model !== filters.model) return false;
      if (filters.projectId && entry.projectId !== filters.projectId) return false;
      if (filters.userId && entry.userId !== filters.userId) return false;

      if (filters.startDate && entry.timestamp < filters.startDate) return false;
      if (filters.endDate && entry.timestamp > filters.endDate) return false;

      if (filters.minCost !== undefined && entry.cost < filters.minCost) return false;
      if (filters.maxCost !== undefined && entry.cost > filters.maxCost) return false;

      return true;
    });
  }

  /**
   * %9/'/ EJ2'FJ)
   */
  setBudget(budget: Budget): void {
    this.budgets.set(budget.id, budget);
  }

  /**
   * 'D-5HD 9DI EJ2'FJ)
   */
  getBudget(budgetId: string): Budget | null {
    return this.budgets.get(budgetId) || null;
  }

  /**
   * 'D-5HD 9DI ,EJ9 'DEJ2'FJ'*
   */
  getAllBudgets(): Budget[] {
    return Array.from(this.budgets.values());
  }

  /**
   * 'D*-BB EF 'DEJ2'FJ'*
   */
  private checkBudgets(entry: CostEntry): void {
    this.budgets.forEach(budget => {
      if (!budget.active) return;

      // *-BB EF 'DAD'*1
      if (budget.provider && budget.provider !== entry.provider) return;
      if (budget.projectId && budget.projectId !== entry.projectId) return;

      // -3'( 'D*CDA) 'D-'DJ) DDEJ2'FJ)
      const currentCost = this.getTotalCost({
        provider: budget.provider,
        projectId: budget.projectId,
        startDate: budget.startDate,
        endDate: budget.endDate
      });

      const percentage = (currentCost / budget.limit) * 100;

      // %F4'! *F(JG'*
      if (percentage >= 100 && !this.hasAlert(budget.id, 'EXCEEDED')) {
        this.createAlert({
          budgetId: budget.id,
          type: 'EXCEEDED',
          message: `Budget ${budget.name} exceeded: ${currentCost.toFixed(4)}$ / ${budget.limit}$`,
          currentCost,
          limit: budget.limit,
          percentage: 100
        });
      } else if (
        percentage >= budget.warningThreshold &&
        !this.hasAlert(budget.id, 'WARNING')
      ) {
        this.createAlert({
          budgetId: budget.id,
          type: 'WARNING',
          message: `Budget ${budget.name} at ${percentage.toFixed(1)}%: ${currentCost.toFixed(4)}$ / ${budget.limit}$`,
          currentCost,
          limit: budget.limit,
          percentage
        });
      }
    });
  }

  /**
   * %F4'! *F(JG
   */
  private createAlert(alert: Omit<CostAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    this.alerts.push({
      id: this.generateId(),
      timestamp: new Date(),
      acknowledged: false,
      ...alert
    });

    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  /**
   * 'D*-BB EF H,H/ *F(JG
   */
  private hasAlert(budgetId: string, type: CostAlertType): boolean {
    return this.alerts.some(
      alert =>
        alert.budgetId === budgetId &&
        alert.type === type &&
        !alert.acknowledged &&
        Date.now() - alert.timestamp.getTime() < 3600000
    );
  }

  /**
   * 'D-5HD 9DI 'D*F(JG'*
   */
  getAlerts(acknowledged?: boolean): CostAlert[] {
    if (acknowledged === undefined) return [...this.alerts];
    return this.alerts.filter(alert => alert.acknowledged === acknowledged);
  }

  /**
   * 'D'9*1'A (*F(JG
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * *HDJ/ E91A A1J/
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  clearCosts(): void {
    this.costs = [];
  }

  exportCosts(): CostEntry[] {
    return [...this.costs];
  }
}

export interface CostEntry {
  id: string;
  timestamp: Date;
  provider: string;
  model: string;
  cost: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  projectId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface CostFilters {
  provider?: string;
  model?: string;
  projectId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  minCost?: number;
  maxCost?: number;
}

export interface Budget {
  id: string;
  name: string;
  limit: number;
  warningThreshold: number;
  active: boolean;
  provider?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
}

export type CostAlertType = 'WARNING' | 'EXCEEDED';

export interface CostAlert {
  id: string;
  timestamp: Date;
  budgetId: string;
  type: CostAlertType;
  message: string;
  currentCost: number;
  limit: number;
  percentage: number;
  acknowledged: boolean;
}
