import { SimulationInputs, AntifragileProjectionResult, AntifragileAnnualData } from '../../types';

interface Deposit {
    amount: number;
    monthsAged: number; // Quantos meses o dinheiro ficou investido
}

/**
 * Calcula o Imposto de Renda Regressivo (FIFO)
 * Com base na idade dos aportes
 */
export function calculateRegressiveTax(deposits: Deposit[], currentTotalBalance: number): number {
    const totalInvested = deposits.reduce((acc, dep) => acc + dep.amount, 0);
    const totalProfit = Math.max(0, currentTotalBalance - totalInvested);

    if (totalProfit <= 0) return 0;

    // Calcula o lucro proporcional de cada aporte (simplificado para o escopo)
    let totalTax = 0;

    deposits.forEach(dep => {
        // Proporção do lucro que este aporte gerou
        const depositProfit = totalProfit * (dep.amount / totalInvested);

        let taxRate = 0.225; // Até 180 dias (6 meses)
        if (dep.monthsAged > 6 && dep.monthsAged <= 12) taxRate = 0.20;
        else if (dep.monthsAged > 12 && dep.monthsAged <= 24) taxRate = 0.175;
        else if (dep.monthsAged > 24) taxRate = 0.15; // Acima de 720 dias

        totalTax += depositProfit * taxRate;
    });

    return totalTax;
}

export function simulateAntifragilePortfolio(inputs: SimulationInputs): AntifragileProjectionResult {
    let currentGrossBalanceBrl = inputs.initialAmountBrl;
    let accumulatedUsd = 0;
    let currentDollarRate = inputs.currentDollarRate;

    const annualData: AntifragileAnnualData[] = [];
    const monthlyRateBrl = Math.pow(1 + inputs.annualRateBrl, 1 / 12) - 1;

    let totalCashInvested = inputs.initialAmountBrl;

    // A tabela Regressiva de IR baseada em meses 
    const getApparentIRRate = (month: number) => {
        if (month <= 6) return 0.225;
        if (month <= 12) return 0.20;
        if (month <= 23) return 0.175;
        return 0.15;
    };

    for (let year = 1; year <= inputs.years; year++) {
        const startOfYearBalance = currentGrossBalanceBrl;
        const startOfYearCashInvested = totalCashInvested;

        // Simula os 12 meses do ano
        for (let month = 1; month <= 12; month++) {
            const absoluteMonth = ((year - 1) * 12) + month;

            // Mês 1 não tem aporte extra
            const currentAporte = absoluteMonth === 1 ? 0 : inputs.monthlyContributionBrl;

            const valueWithAporte = currentGrossBalanceBrl + currentAporte;

            // Juros compostos mensais
            currentGrossBalanceBrl = valueWithAporte * (1 + monthlyRateBrl);

            totalCashInvested += currentAporte;
        }

        // --- Mecânica de Dolarização Anual (Fim do ano) ---
        // 1. Calcula o Lucro Bruto e Líquido Acumulado Total se fizesse o saque global agora
        const totalGrossProfit = currentGrossBalanceBrl - totalCashInvested;
        const irRate = getApparentIRRate(year * 12);
        const totalNetProfit = totalGrossProfit * (1 - irRate);
        const hypotheticalFinalBrl = totalCashInvested + totalNetProfit;

        // O Lucro Líquido Realizado SOMENTE neste ano
        // (Isso impede sacar de lucros já sacados ou contabilizados no passado)
        const yearGrossGrowth = currentGrossBalanceBrl - startOfYearBalance - (totalCashInvested - startOfYearCashInvested);
        const yearNetGrowth = yearGrossGrowth * (1 - irRate);

        let extractedForDollar = 0;

        if (yearNetGrowth > 0) {
            // 3. Aplica a Porcentagem de Dolarização sobre o Lucro Líquido gerado no ano
            extractedForDollar = yearNetGrowth * inputs.dollarizationPercentage;

            // Retira a parte bruta equivalente da carteira
            // Para poder sacar X liquido, e assumindo que o IR já incidiu no X bruto "imaginário" correspondente:
            // A redução no saldo investido tira o peso. Para ficar exato com a expectativa do usuário (50% do lucro líquido gerado):
            // O usuário visualiza extrair do saldo final, então vamos subtrair o valor sacado do balanço bruto corrente.
            const grossExtraction = extractedForDollar / (1 - irRate);
            currentGrossBalanceBrl -= grossExtraction;

            // Converte o montante em BRL sacado para USD na cotação projetada
            const dollarsBought = extractedForDollar / currentDollarRate;
            accumulatedUsd += dollarsBought;
        }

        // === Aplica Rendimento e Apreciação Cambial Internacional ===
        // (Rendimentos em Dólar e valorização cambial ao final do ano)
        if (accumulatedUsd > 0) {
            accumulatedUsd = accumulatedUsd * (1 + inputs.annualRateUsd);
            currentDollarRate = currentDollarRate * (1 + inputs.dollarAppreciationRate);
        }

        // Para o registro final da tabela deste ano, qual é o saldo real LÍQUIDO neste instante em BRL?
        // (O saldo que o cara bateria o olho e veria na conta)
        const currentTotalGrossProfit = currentGrossBalanceBrl - totalCashInvested;
        const currentNetBalanceBrl = totalCashInvested + (currentTotalGrossProfit * (1 - irRate));

        // Registra os dados do ano para reportar de volta
        annualData.push({
            year,
            balanceBrl: currentNetBalanceBrl, // Equivalente na visão tradicional ao `finalNet` do simulador simples
            balanceUsd: accumulatedUsd,
            extractedForDollarization: extractedForDollar,
            totalInvestedBrl: totalCashInvested,
            netProfitBrl: totalNetProfit, // Como o user citou: os 27k antes do saque. Esse é o Liquid Profit puro.
        });
    }

    // Calcula os saldos da linha de chegada 
    const finalIRRate = getApparentIRRate(inputs.years * 12);
    const finalGrossProfit = currentGrossBalanceBrl - totalCashInvested;
    const finalNetBalanceBrl = totalCashInvested + (finalGrossProfit * (1 - finalIRRate));

    // Visão Tripla no Resultado Final
    return {
        finalPatrimonyBrl: finalNetBalanceBrl,
        finalPatrimonyUsd: accumulatedUsd,
        equivalentTotalBrl: finalNetBalanceBrl + (accumulatedUsd * currentDollarRate),
        annualData
    };
}
