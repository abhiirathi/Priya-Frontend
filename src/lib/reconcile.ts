import type {
  BankTransaction,
  DashboardMetrics,
  PineLabsTransaction,
  ReconciliationRow
} from '../types';

const HIGH_RISK_THRESHOLD = 30;

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

export function reconcileTransactions(
  pineLabsRows: PineLabsTransaction[],
  bankRows: BankTransaction[]
): ReconciliationRow[] {
  const bankByUtr = new Map(bankRows.map((row) => [row.utr, row]));

  return pineLabsRows.map((payment) => {
    const bankMatch = bankByUtr.get(payment.utr);
    const pineLabsComparable = payment.net_amount;
    const bankAmount = bankMatch?.amount_credited ?? 0;
    const variance = Number((bankAmount - pineLabsComparable).toFixed(2));
    const variancePercent = pineLabsComparable === 0
      ? 0
      : Number(((Math.abs(variance) / pineLabsComparable) * 100).toFixed(2));

    const delayed =
      bankMatch &&
      parseDate(bankMatch.credit_date).getTime() > parseDate(payment.expected_settlement_date).getTime();

    let status: ReconciliationRow['status'] = 'reconciled';

    if (!bankMatch || payment.status === 'PAYMENT_FAILED') {
      status = 'unreconciled';
    } else if (variancePercent > HIGH_RISK_THRESHOLD) {
      status = 'high-risk';
    } else if (delayed) {
      status = 'delayed';
    } else if (variance !== 0) {
      status = 'unreconciled';
    }

    return {
      orderId: payment.order_id,
      utr: payment.utr,
      hospitalId: payment.hospital_id,
      hospitalName: payment.hospital_name,
      pineLabsAmount: pineLabsComparable,
      bankAmount,
      variance,
      variancePercent,
      expectedSettlementDate: payment.expected_settlement_date,
      actualCreditDate: bankMatch?.credit_date ?? null,
      status,
      rail: payment.rail
    };
  });
}

export function buildMetrics(rows: ReconciliationRow[]): DashboardMetrics {
  const totalTransactions = rows.length;
  const reconciledCount = rows.filter((row) => row.status === 'reconciled').length;
  const unreconciledCount = rows.filter((row) => row.status === 'unreconciled').length;
  const delayedCount = rows.filter((row) => row.status === 'delayed').length;
  const highRiskCount = rows.filter((row) => row.status === 'high-risk').length;
  const totalPineLabsVolume = rows.reduce((sum, row) => sum + row.pineLabsAmount, 0);
  const totalBankVolume = rows.reduce((sum, row) => sum + row.bankAmount, 0);

  const toPercent = (count: number) =>
    totalTransactions === 0 ? 0 : Number(((count / totalTransactions) * 100).toFixed(1));

  return {
    totalTransactions,
    reconciledCount,
    unreconciledCount,
    delayedCount,
    highRiskCount,
    reconciledPercent: toPercent(reconciledCount),
    unreconciledPercent: toPercent(unreconciledCount),
    delayedPercent: toPercent(delayedCount),
    totalPineLabsVolume,
    totalBankVolume
  };
}

export function groupByHospital(rows: ReconciliationRow[]) {
  return Object.values(
    rows.reduce<Record<string, { hospital: string; reconciled: number; unreconciled: number; delayed: number; highRisk: number }>>(
      (acc, row) => {
        if (!acc[row.hospitalId]) {
          acc[row.hospitalId] = {
            hospital: row.hospitalName,
            reconciled: 0,
            unreconciled: 0,
            delayed: 0,
            highRisk: 0
          };
        }

        if (row.status === 'reconciled') acc[row.hospitalId].reconciled += 1;
        if (row.status === 'unreconciled') acc[row.hospitalId].unreconciled += 1;
        if (row.status === 'delayed') acc[row.hospitalId].delayed += 1;
        if (row.status === 'high-risk') acc[row.hospitalId].highRisk += 1;
        return acc;
      },
      {}
    )
  );
}

export function groupByRail(rows: ReconciliationRow[]) {
  return Object.values(
    rows.reduce<Record<string, { rail: string; count: number; value: number }>>((acc, row) => {
      if (!acc[row.rail]) {
        acc[row.rail] = { rail: row.rail, count: 0, value: 0 };
      }
      acc[row.rail].count += 1;
      acc[row.rail].value += row.pineLabsAmount;
      return acc;
    }, {})
  );
}

export function buildTrend(rows: ReconciliationRow[]) {
  return Object.values(
    rows.reduce<Record<string, { date: string; pineLabs: number; bank: number }>>((acc, row) => {
      if (!acc[row.expectedSettlementDate]) {
        acc[row.expectedSettlementDate] = { date: row.expectedSettlementDate, pineLabs: 0, bank: 0 };
      }
      acc[row.expectedSettlementDate].pineLabs += row.pineLabsAmount;
      acc[row.expectedSettlementDate].bank += row.bankAmount;
      return acc;
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));
}
