// Funds / ETFs universe (V06) — a research dataset for the explorer + fact sheet.
// A fund tradeable on the platform carries a `symbol` that resolves to a market
// instrument (so its Buy CTA opens the order ticket); research-only funds don't.
// Risk is an SRRI-style 1–7 band (read by rule + mark + text, never colour alone).
// Deterministic and mock.

import { instrumentOf } from './portfolio';

export type AssetClass = 'Equity' | 'Bond' | 'Mixed' | 'Commodity' | 'Money market';
export type FundRegion = 'Global' | 'US' | 'Europe' | 'Emerging' | 'Asia';

export interface Fund {
	ticker: string;
	name: string;
	assetClass: AssetClass;
	region: FundRegion;
	/** SRRI-style risk band, 1 (lowest) – 7 (highest). */
	riskBand: number;
	/** Ongoing charge / TER, in bps (e.g. 20 = 0.20%). */
	ongoingChargeBps: number;
	/** Fund size (AUM) in EUR minor units. */
	fundSizeEurMinor: number;
	/** Trailing 1-year return, in bps (can be negative). */
	oneYearReturnBps: number;
	objective: string;
	topHoldings: string[];
}

export const FUNDS: Fund[] = [
	{
		ticker: 'IWDA',
		name: 'iShares Core MSCI World',
		assetClass: 'Equity',
		region: 'Global',
		riskBand: 5,
		ongoingChargeBps: 20,
		fundSizeEurMinor: 8900000000000,
		oneYearReturnBps: 1820,
		objective:
			'Tracks the MSCI World index — large and mid-cap companies across 23 developed markets, accumulating.',
		topHoldings: ['Apple', 'Microsoft', 'Nvidia', 'Amazon', 'Meta']
	},
	{
		ticker: 'VWCE',
		name: 'Vanguard FTSE All-World',
		assetClass: 'Equity',
		region: 'Global',
		riskBand: 5,
		ongoingChargeBps: 22,
		fundSizeEurMinor: 1240000000000,
		oneYearReturnBps: 1650,
		objective:
			'Tracks the FTSE All-World index — developed and emerging markets in one accumulating fund.',
		topHoldings: ['Apple', 'Microsoft', 'Nvidia', 'Amazon', 'TSMC']
	},
	{
		ticker: 'SXR8',
		name: 'iShares Core S&P 500',
		assetClass: 'Equity',
		region: 'US',
		riskBand: 5,
		ongoingChargeBps: 7,
		fundSizeEurMinor: 7600000000000,
		oneYearReturnBps: 2210,
		objective: 'Tracks the S&P 500 — the 500 largest US listed companies, accumulating.',
		topHoldings: ['Apple', 'Microsoft', 'Nvidia', 'Amazon', 'Alphabet']
	},
	{
		ticker: 'IMEU',
		name: 'iShares Core MSCI Europe',
		assetClass: 'Equity',
		region: 'Europe',
		riskBand: 5,
		ongoingChargeBps: 12,
		fundSizeEurMinor: 480000000000,
		oneYearReturnBps: 1130,
		objective: 'Tracks the MSCI Europe index — large and mid-cap companies across developed Europe.',
		topHoldings: ['ASML', 'SAP', 'Nestlé', 'Novo Nordisk', 'LVMH']
	},
	{
		ticker: 'VFEM',
		name: 'Vanguard FTSE Emerging Markets',
		assetClass: 'Equity',
		region: 'Emerging',
		riskBand: 6,
		ongoingChargeBps: 22,
		fundSizeEurMinor: 210000000000,
		oneYearReturnBps: 940,
		objective: 'Tracks the FTSE Emerging index — companies across emerging markets.',
		topHoldings: ['TSMC', 'Tencent', 'Alibaba', 'Reliance', 'Samsung']
	},
	{
		ticker: 'VNRT',
		name: 'Vanguard FTSE North America',
		assetClass: 'Equity',
		region: 'US',
		riskBand: 5,
		ongoingChargeBps: 10,
		fundSizeEurMinor: 320000000000,
		oneYearReturnBps: 2090,
		objective: 'Tracks the FTSE North America index — US and Canadian large and mid-cap companies.',
		topHoldings: ['Apple', 'Microsoft', 'Nvidia', 'Amazon', 'Meta']
	},
	{
		ticker: 'AGGH',
		name: 'iShares Core Global Aggregate Bond',
		assetClass: 'Bond',
		region: 'Global',
		riskBand: 3,
		ongoingChargeBps: 10,
		fundSizeEurMinor: 640000000000,
		oneYearReturnBps: 340,
		objective:
			'Tracks the Bloomberg Global Aggregate Bond index, EUR-hedged — government and investment-grade corporate bonds.',
		topHoldings: ['US Treasuries', 'German Bunds', 'JGBs', 'French OATs', 'UK Gilts']
	},
	{
		ticker: 'IBGL',
		name: 'iShares Euro Government Bond 15-30yr',
		assetClass: 'Bond',
		region: 'Europe',
		riskBand: 2,
		ongoingChargeBps: 9,
		fundSizeEurMinor: 95000000000,
		oneYearReturnBps: 210,
		objective: 'Tracks long-dated euro-area government bonds.',
		topHoldings: ['German Bunds', 'French OATs', 'Italian BTPs', 'Spanish Bonos', 'Dutch DSLs']
	},
	{
		ticker: 'EUNA',
		name: 'iShares Euro Corporate Bond',
		assetClass: 'Bond',
		region: 'Europe',
		riskBand: 3,
		ongoingChargeBps: 20,
		fundSizeEurMinor: 130000000000,
		oneYearReturnBps: 410,
		objective: 'Tracks investment-grade euro-denominated corporate bonds.',
		topHoldings: ['EDF', 'BNP Paribas', 'Telefónica', 'Volkswagen', 'Enel']
	},
	{
		ticker: 'V60A',
		name: 'Vanguard LifeStrategy 60% Equity',
		assetClass: 'Mixed',
		region: 'Global',
		riskBand: 4,
		ongoingChargeBps: 25,
		fundSizeEurMinor: 88000000000,
		oneYearReturnBps: 980,
		objective: 'A ready-made 60% equity / 40% bond global portfolio, rebalanced automatically.',
		topHoldings: ['Global equity index', 'Global bond index', 'US equity', 'Euro govt bonds', 'EM equity']
	},
	{
		ticker: 'SGLN',
		name: 'iShares Physical Gold',
		assetClass: 'Commodity',
		region: 'Global',
		riskBand: 4,
		ongoingChargeBps: 12,
		fundSizeEurMinor: 1700000000000,
		oneYearReturnBps: 1520,
		objective: 'Backed by physical gold bullion held in a vault; tracks the spot gold price.',
		topHoldings: ['Physical gold bullion']
	},
	{
		ticker: 'ERNE',
		name: 'iShares Euro Ultrashort Bond',
		assetClass: 'Money market',
		region: 'Europe',
		riskBand: 1,
		ongoingChargeBps: 9,
		fundSizeEurMinor: 64000000000,
		oneYearReturnBps: 370,
		objective: 'Very short-dated euro investment-grade bonds — a cash-like, low-volatility holding.',
		topHoldings: ['Short-dated corporate bonds', 'Commercial paper', 'T-bills']
	}
];

export function getFunds(): Fund[] {
	return FUNDS;
}

export function getFund(ticker: string): Fund | undefined {
	return FUNDS.find((f) => f.ticker === ticker);
}

/** A fund is tradeable here when its ticker resolves to a market instrument (so its
 *  fact-sheet Buy CTA can open the order ticket); otherwise it's research-only. */
export function isFundTradeable(ticker: string): boolean {
	return !!instrumentOf(ticker);
}

export const ASSET_CLASSES: AssetClass[] = ['Equity', 'Bond', 'Mixed', 'Commodity', 'Money market'];
export const FUND_REGIONS: FundRegion[] = ['Global', 'US', 'Europe', 'Emerging', 'Asia'];
