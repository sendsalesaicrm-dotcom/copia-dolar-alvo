import { SimulationInputs, AntifragileProjectionResult, AntifragileAnnualData, UsdLote } from '../../types';

/**
 * Arredonda um valor para 2 casas decimais (cêntimos/centavos).
 * Simula o comportamento transacional real de uma corretora,
 * evitando desvios de precisão de ponto flutuante em simulações longas.
 */
const roundToCent = (value: number): number => {
    return Math.round(value * 100) / 100;
};


export interface DepositLote {
    principal: number;
    grossValue: number;
    monthIn: number;
}

/**
 * Retorna a alíquota da Tabela Regressiva de IR baseada em dias.
 * Transforma meses em dias utilizando a base do ano civil (365 dias / 12 = ~30.4167 dias por mês).
 * Até 180 dias: 22,5%
 * 181 a 360 dias: 20%
 * 361 a 720 dias: 17,5%
 * Acima de 720 dias: 15%
 */
export function getIRRate(monthsAged: number): number {
    const daysAged = monthsAged * 30.4167; // Converte meses para dias reais do ano civil

    if (daysAged <= 180) return 0.225;
    if (daysAged <= 360) return 0.20;
    if (daysAged <= 720) return 0.175;
    return 0.15;
}

/**
 * Calcula a posição exata da carteira somando os lotes e calculando o IR proporcional a idade de cada lote.
 */
export function getPortfolioValuation(deposits: DepositLote[], currentAbsoluteMonth: number) {
    let totalPrincipal = 0;
    let totalGross = 0;
    let totalNet = 0;

    for (const dep of deposits) {
        if (dep.grossValue <= 0) continue; // lote completamente sacado

        const age = currentAbsoluteMonth - dep.monthIn + 1;
        const profit = dep.grossValue - dep.principal;
        const irRate = getIRRate(age);
        
        const netValue = dep.principal + Math.max(0, profit * (1 - irRate));
        
        totalPrincipal += dep.principal;
        totalGross += dep.grossValue;
        totalNet += netValue;
    }

    return { totalPrincipal, totalGross, totalNet };
}

export interface SimpleMonthlyData {
    month: number;
    initialValue: number;
    valuePlusContribution: number;
    grossValue: number;
    accumulatedYield: number;
    netValue: number;
}

export interface SimpleProjectionResult {
    finalValue: number;
    totalInvested: number;
    totalProfit: number;
    yield: number;
    monthlyData: SimpleMonthlyData[];
}

/**
 * Simula a carteira tradicional (sem dolarização), mantendo um histórico preciso de IR via FIFO
 */
export function simulateSimplePortfolio(inputs: SimulationInputs): SimpleProjectionResult {
    const totalMonths = inputs.years * 12;
    const monthlyRateBrl = Math.pow(1 + inputs.annualRateBrl, 1 / 12) - 1;
    
    const deposits: DepositLote[] = [];
    const monthlyData: SimpleMonthlyData[] = [];
    
    if (inputs.initialAmountBrl > 0) {
        deposits.push({ principal: inputs.initialAmountBrl, grossValue: inputs.initialAmountBrl, monthIn: 1 });
    }
    
    for (let absoluteMonth = 1; absoluteMonth <= totalMonths; absoluteMonth++) {
        const initialValue = deposits.reduce((sum, dep) => sum + dep.grossValue, 0);
        
        const currentAporte = inputs.monthlyContributionBrl;
        if (currentAporte > 0) {
            deposits.push({ principal: currentAporte, grossValue: currentAporte, monthIn: absoluteMonth });
        }
        
        const valuePlusContribution = initialValue + currentAporte;
        
        // Rende o mês para todos os lotes ativos
        for (const dep of deposits) {
            dep.grossValue = roundToCent(dep.grossValue * (1 + monthlyRateBrl));
        }
        
        // Calculo líquido da carteira após o rendimento deste mês
        const valuationEnd = getPortfolioValuation(deposits, absoluteMonth);
        
        monthlyData.push({
            month: absoluteMonth,
            initialValue: initialValue,
            valuePlusContribution: valuePlusContribution,
            grossValue: valuationEnd.totalGross,
            accumulatedYield: ((valuationEnd.totalGross / valuationEnd.totalPrincipal) - 1) * 100,
            netValue: valuationEnd.totalNet
        });
    }
    
    const finalValuation = getPortfolioValuation(deposits, totalMonths);
    
    return {
        finalValue: finalValuation.totalNet,
        totalInvested: finalValuation.totalPrincipal,
        totalProfit: finalValuation.totalNet - finalValuation.totalPrincipal,
        yield: ((finalValuation.totalNet / finalValuation.totalPrincipal) - 1) * 100,
        monthlyData
    };
}

/**
 * Simula a carteira Antifrágil (BRL + USD) extraindo ganhos usando FIFO
 */
export function simulateAntifragilePortfolio(inputs: SimulationInputs): AntifragileProjectionResult {
    const usdDeposits: UsdLote[] = [];
    let currentDollarRate = inputs.currentDollarRate;
    const monthlyRateBrl = Math.pow(1 + inputs.annualRateBrl, 1 / 12) - 1;
    let historicalInvestedBrl = 0;
    
    const deposits: DepositLote[] = [];
    const annualData: AntifragileAnnualData[] = [];
    
    if (inputs.initialAmountBrl > 0) {
        deposits.push({ principal: inputs.initialAmountBrl, grossValue: inputs.initialAmountBrl, monthIn: 1 });
        historicalInvestedBrl += inputs.initialAmountBrl;
    }

    for (let year = 1; year <= inputs.years; year++) {
        // 1. Rendimento do Saldo Antigo em USD (aplica juros individualmente a cada lote)
        for (const usdDep of usdDeposits) {
            usdDep.amount = roundToCent(usdDep.amount * (1 + inputs.annualRateUsd));
        }
        
        // 2. Apreciação Cambial ao longo deste ano (aplica-se a partir do Ano 2)
        if (year > 1) {
            currentDollarRate *= (1 + inputs.dollarAppreciationRate);
        }

        // 3. Geração de Lucro BRL
        // Obter Patrimônio Líquido Real ANTES de começar os meses deste ano
        // Se year == 1, valuation do mês 0 (tudo 0)
        const startOfYearValuation = getPortfolioValuation(deposits, ((year - 1) * 12));
        const startOfYearNet = startOfYearValuation.totalNet;
        let principalInjectedThisYear = 0;
        
        // Simular os 12 meses para engordar o BRL
        for (let month = 1; month <= 12; month++) {
            const absoluteMonth = ((year - 1) * 12) + month;
            
            const currentAporte = inputs.monthlyContributionBrl;
            if (currentAporte > 0) {
                deposits.push({ principal: currentAporte, grossValue: currentAporte, monthIn: absoluteMonth });
                principalInjectedThisYear += currentAporte;
                historicalInvestedBrl += currentAporte;
            }
            
            // Render
            for (const dep of deposits) {
                dep.grossValue = roundToCent(dep.grossValue * (1 + monthlyRateBrl));
            }
        }
        
        // Patrimônio do Fim do Ano ANTES do saque antifrágil
        const endOfYearAbsoluteMonth = year * 12;
        const preExtractionValuation = getPortfolioValuation(deposits, endOfYearAbsoluteMonth);
        const preExtractionNet = preExtractionValuation.totalNet;
        
        // A Dolarização recai sobre o CRESCIMENTO LÍQUIDO PURAMENTE DESTE ANO (Descontado todo capital aportado)
        const yearNetGrowth = preExtractionNet - (startOfYearNet + principalInjectedThisYear);
        let extractedForDollar = 0;
        
        if (yearNetGrowth > 0) {
            extractedForDollar = yearNetGrowth * inputs.dollarizationPercentage;
            let amountToExtractNet = extractedForDollar;
            
            // ----- Tira o valor líquido alvo da corretora usando fila FIFO ------
            for (let i = 0; i < deposits.length && amountToExtractNet > 0; i++) {
                const dep = deposits[i];
                if (dep.grossValue <= 0) continue;
                
                const age = endOfYearAbsoluteMonth - dep.monthIn + 1;
                const irRate = getIRRate(age);
                const profit = dep.grossValue - dep.principal;
                const availableNet = dep.principal + Math.max(0, profit * (1 - irRate));
                
                if (availableNet <= 0) continue;
                
                if (availableNet <= amountToExtractNet) {
                    // Saca tudo desse lote (Esgotou)
                    amountToExtractNet = roundToCent(amountToExtractNet - availableNet);
                    dep.principal = 0;
                    dep.grossValue = 0;
                } else {
                    // Saca uma fração percentual do lote, exaurindo o target
                    const fractionToConsume = amountToExtractNet / availableNet;
                    amountToExtractNet = 0; // zeramos o alvo
                    
                    dep.principal = roundToCent(dep.principal - dep.principal * fractionToConsume);
                    dep.grossValue = roundToCent(dep.grossValue - dep.grossValue * fractionToConsume);
                }
            }
            
            // 4 e 5. Converte e Atualiza Saldo
            // Converte os reais líquidos p/ Dólar pela cotação de agora e registra o lote
            const dollarsBought = roundToCent(extractedForDollar / currentDollarRate);
            usdDeposits.push({
                yearIn: year,
                investedBrl: roundToCent(extractedForDollar),
                buyRate: currentDollarRate,
                amount: dollarsBought,
            });
        }
        
        // Total de dólares acumulado (soma dos lotes)
        const totalUsdBalance = usdDeposits.reduce((sum, dep) => sum + dep.amount, 0);

        // Saldo Final BRL DEPOIS do Saque
        const postExtractionValuation = getPortfolioValuation(deposits, endOfYearAbsoluteMonth);
        
        annualData.push({
            year,
            balanceBrl: postExtractionValuation.totalNet,
            balanceUsd: totalUsdBalance,
            extractedForDollarization: extractedForDollar,
            totalInvestedBrl: historicalInvestedBrl,
            netProfitBrl: postExtractionValuation.totalNet - historicalInvestedBrl,
            yearlyGeneratedProfitBrl: Math.max(0, yearNetGrowth)
        });
    }
    
    // Calcula o saldo final final
    const finalValuation = getPortfolioValuation(deposits, inputs.years * 12);
    const finalUsdBalance = usdDeposits.reduce((sum, dep) => sum + dep.amount, 0);

    return {
        finalPatrimonyBrl: finalValuation.totalNet,
        finalPatrimonyUsd: finalUsdBalance,
        equivalentTotalBrl: finalValuation.totalNet + (finalUsdBalance * currentDollarRate),
        annualData,
        usdExtract: usdDeposits,
    };
}
