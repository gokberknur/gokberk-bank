// Investing market model (ADR-001: EUR-anchored, Nordnet-flavoured). A small,
// deterministic universe — instruments with key stats, the user's holdings, and a
// seeded daily price history per instrument so charts, sparklines, and the
// performance series are all reducible from one source. Prices are integer minor
// units in the INSTRUMENT's own currency; the portfolio math converts to EUR.

import { mulberry32 } from './prng';
import { TODAY, isoDate, daysBeforeToday } from './time';
import type { Currency } from './money';

export type InstrumentType = 'stock' | 'etf' | 'crypto';

export interface Instrument {
	symbol: string;
	name: string;
	exchange: string;
	currency: Currency;
	type: InstrumentType;
	sector: string;
	region: string;
	about: string;
	/** Latest price, minor units, instrument currency. */
	lastPriceMinor: number;
	/** Prior session close, minor units — day change is derived, never stored. */
	priorCloseMinor: number;
	/** 52-week range, minor units. */
	high52wMinor: number;
	low52wMinor: number;
	/** P/E ×100 (e.g. 3120 = 31.2), or null for ETFs/crypto. */
	peRatioX100: number | null;
	/** Market cap in EUR minor units (indicative). */
	marketCapEurMinor: number;
	/** Dividend yield in basis points (e.g. 145 = 1.45%), 0 if none. */
	dividendYieldBps: number;
	/** Beta ×100 (e.g. 112 = 1.12), or null. */
	betaX100: number | null;
	/** Whether fractional quantities are allowed (ETFs/crypto yes, some stocks no). */
	fractionalAllowed: boolean;
}

export interface Holding {
	symbol: string;
	/** Fractional allowed. */
	quantity: number;
	/** Average cost per share, minor units, instrument currency. */
	avgCostMinor: number;
}

export type OrderSide = 'buy' | 'sell';
export type OrderKind = 'market' | 'limit' | 'stop';
export type OrderTif = 'day' | 'gtc';
// `working` = a resting limit/stop; `queued` = a market order placed while the
// market is shut; `cancelled`/`rejected` are terminal management/exchange outcomes.
export type OrderStatus = 'filled' | 'working' | 'queued' | 'cancelled' | 'rejected';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
	filled: 'Filled',
	working: 'Working',
	queued: 'Queued',
	cancelled: 'Cancelled',
	rejected: 'Rejected'
};

export const ORDER_KIND_LABELS: Record<OrderKind, string> = {
	market: 'Market',
	limit: 'Limit',
	stop: 'Stop'
};

/** A working order can be managed (cancelled / modified); the rest are terminal. */
export function isOrderTerminal(status: OrderStatus): boolean {
	return status !== 'working' && status !== 'queued';
}

export interface Order {
	id: string;
	symbol: string;
	side: OrderSide;
	kind: OrderKind;
	quantity: number;
	/** Limit/stop price, minor units (instrument ccy), or null for market. */
	priceMinor: number | null;
	tif: OrderTif;
	status: OrderStatus;
	/** Estimated/filled total in the funding wallet currency (EUR), minor units. */
	totalEurMinor: number;
	/** ISO date placed. */
	placedAt: string;
	/** Realized P/L on an executed SELL (EUR minor, average-cost basis) — V12's P/L
	 *  split reads this; absent on buys/working orders. Display-only, no lot engine. */
	realizedPlEurMinor?: number;
}

export const INSTRUMENTS: readonly Instrument[] = [
	{ symbol: 'ASML', name: 'ASML Holding', exchange: 'AEX', currency: 'EUR', type: 'stock', sector: 'Technology', region: 'Europe', about: 'Dutch maker of photolithography systems essential to advanced semiconductor manufacturing.', lastPriceMinor: 92050, priorCloseMinor: 91240, high52wMinor: 105420, low52wMinor: 68830, peRatioX100: 3640, marketCapEurMinor: 36200000000000, dividendYieldBps: 95, betaX100: 118, fractionalAllowed: false },
	{ symbol: 'SAP', name: 'SAP SE', exchange: 'XETRA', currency: 'EUR', type: 'stock', sector: 'Technology', region: 'Europe', about: 'European enterprise software group; ERP, cloud, and business applications.', lastPriceMinor: 24530, priorCloseMinor: 24710, high52wMinor: 26090, low52wMinor: 16640, peRatioX100: 4480, marketCapEurMinor: 28600000000000, dividendYieldBps: 105, betaX100: 96, fractionalAllowed: false },
	{ symbol: 'MC', name: 'LVMH Moët Hennessy', exchange: 'Euronext Paris', currency: 'EUR', type: 'stock', sector: 'Consumer', region: 'Europe', about: 'Luxury goods conglomerate — fashion, wines & spirits, jewellery, retail.', lastPriceMinor: 68120, priorCloseMinor: 68940, high52wMinor: 81560, low52wMinor: 57010, peRatioX100: 2210, marketCapEurMinor: 34100000000000, dividendYieldBps: 195, betaX100: 104, fractionalAllowed: false },
	{ symbol: 'SIE', name: 'Siemens AG', exchange: 'XETRA', currency: 'EUR', type: 'stock', sector: 'Industrials', region: 'Europe', about: 'Industrial automation, digital industries, smart infrastructure and mobility.', lastPriceMinor: 18540, priorCloseMinor: 18420, high52wMinor: 19920, low52wMinor: 13180, peRatioX100: 1920, marketCapEurMinor: 14800000000000, dividendYieldBps: 250, betaX100: 110, fractionalAllowed: false },
	{ symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', sector: 'Technology', region: 'United States', about: 'Designs iPhone, Mac, iPad and wearables; growing services business.', lastPriceMinor: 21380, priorCloseMinor: 21155, high52wMinor: 23740, low52wMinor: 16410, peRatioX100: 3320, marketCapEurMinor: 300000000000000, dividendYieldBps: 45, betaX100: 121, fractionalAllowed: true },
	{ symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', sector: 'Technology', region: 'United States', about: 'Cloud (Azure), productivity software, Windows, and AI platforms.', lastPriceMinor: 44820, priorCloseMinor: 44510, high52wMinor: 46850, low52wMinor: 36210, peRatioX100: 3680, marketCapEurMinor: 310000000000000, dividendYieldBps: 70, betaX100: 92, fractionalAllowed: true },
	{ symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', sector: 'Technology', region: 'United States', about: 'GPUs and accelerated computing for AI, data centres, and graphics.', lastPriceMinor: 12790, priorCloseMinor: 12410, high52wMinor: 14090, low52wMinor: 6190, peRatioX100: 6420, marketCapEurMinor: 290000000000000, dividendYieldBps: 3, betaX100: 168, fractionalAllowed: true },
	{ symbol: 'IWDA', name: 'iShares Core MSCI World', exchange: 'AEX', currency: 'EUR', type: 'etf', sector: 'Global equity', region: 'Global', about: 'Accumulating UCITS ETF tracking developed-market equities worldwide.', lastPriceMinor: 9842, priorCloseMinor: 9818, high52wMinor: 10120, low52wMinor: 7960, peRatioX100: null, marketCapEurMinor: 8900000000000, dividendYieldBps: 0, betaX100: 100, fractionalAllowed: true },
	{ symbol: 'VWCE', name: 'Vanguard FTSE All-World', exchange: 'XETRA', currency: 'EUR', type: 'etf', sector: 'Global equity', region: 'Global', about: 'Accumulating UCITS ETF tracking developed + emerging market equities.', lastPriceMinor: 12810, priorCloseMinor: 12772, high52wMinor: 13180, low52wMinor: 10240, peRatioX100: null, marketCapEurMinor: 1640000000000, dividendYieldBps: 0, betaX100: 101, fractionalAllowed: true },
	{ symbol: 'BTC', name: 'Bitcoin', exchange: 'Crypto', currency: 'EUR', type: 'crypto', sector: 'Digital asset', region: 'Global', about: 'Decentralised digital currency; the largest crypto asset by market cap.', lastPriceMinor: 5842000, priorCloseMinor: 5719000, high52wMinor: 9210000, low52wMinor: 4380000, peRatioX100: null, marketCapEurMinor: 115000000000000, dividendYieldBps: 0, betaX100: null, fractionalAllowed: true },
	{ symbol: 'ETH', name: 'Ethereum', exchange: 'Crypto', currency: 'EUR', type: 'crypto', sector: 'Digital asset', region: 'Global', about: 'Programmable blockchain; the settlement layer for smart contracts and tokens.', lastPriceMinor: 240500, priorCloseMinor: 235100, high52wMinor: 372000, low52wMinor: 178000, peRatioX100: null, marketCapEurMinor: 28900000000000, dividendYieldBps: 0, betaX100: null, fractionalAllowed: true },
	{ symbol: 'SOL', name: 'Solana', exchange: 'Crypto', currency: 'EUR', type: 'crypto', sector: 'Digital asset', region: 'Global', about: 'High-throughput blockchain favoured for low-fee, fast transactions.', lastPriceMinor: 14080, priorCloseMinor: 14620, high52wMinor: 24500, low52wMinor: 8900, peRatioX100: null, marketCapEurMinor: 6700000000000, dividendYieldBps: 0, betaX100: null, fractionalAllowed: true },
	{ symbol: 'USDC', name: 'USD Coin', exchange: 'Crypto', currency: 'EUR', type: 'crypto', sector: 'Digital asset', region: 'Global', about: 'A fully-reserved stablecoin pegged to the US dollar.', lastPriceMinor: 92, priorCloseMinor: 92, high52wMinor: 95, low52wMinor: 90, peRatioX100: null, marketCapEurMinor: 3300000000000, dividendYieldBps: 0, betaX100: null, fractionalAllowed: true },

	// ── V13 seed-expansion (F03): a broader, credible pan-European universe so discovery — search,
	// neutral lists, movers — isn't theatre. Multi-currency European blue-chips + US mega-caps +
	// UCITS ETFs across sectors/regions/asset-classes. Every value is deterministic and plausible;
	// day-change (last vs prior) is varied across the set so movers has real gainers AND losers.
	// Prices are minor units in the instrument's own currency; the portfolio converts via toEur().

	// European stocks — Healthcare
	{ symbol: 'NOVO', name: 'Novo Nordisk B', exchange: 'Nasdaq Copenhagen', currency: 'DKK', type: 'stock', sector: 'Healthcare', region: 'Europe', about: 'Danish pharmaceutical leader in diabetes and obesity care (GLP-1 therapies).', lastPriceMinor: 62000, priorCloseMinor: 64650, high52wMinor: 98000, low52wMinor: 58500, peRatioX100: 2180, marketCapEurMinor: 34000000000000, dividendYieldBps: 130, betaX100: 58, fractionalAllowed: false },
	{ symbol: 'NOVN', name: 'Novartis AG', exchange: 'SIX Swiss', currency: 'CHF', type: 'stock', sector: 'Healthcare', region: 'Europe', about: 'Swiss pharmaceutical group focused on innovative patented medicines.', lastPriceMinor: 9600, priorCloseMinor: 9533, high52wMinor: 10400, low52wMinor: 8200, peRatioX100: 1420, marketCapEurMinor: 20500000000000, dividendYieldBps: 350, betaX100: 55, fractionalAllowed: false },
	{ symbol: 'ROG', name: 'Roche Holding AG', exchange: 'SIX Swiss', currency: 'CHF', type: 'stock', sector: 'Healthcare', region: 'Europe', about: 'Swiss healthcare group spanning pharmaceuticals and diagnostics.', lastPriceMinor: 25800, priorCloseMinor: 26113, high52wMinor: 29500, low52wMinor: 22600, peRatioX100: 1580, marketCapEurMinor: 22500000000000, dividendYieldBps: 380, betaX100: 48, fractionalAllowed: false },
	{ symbol: 'AZN', name: 'AstraZeneca plc', exchange: 'LSE', currency: 'GBP', type: 'stock', sector: 'Healthcare', region: 'Europe', about: 'UK-Swedish biopharmaceutical company; oncology, cardiovascular, respiratory.', lastPriceMinor: 10800, priorCloseMinor: 10704, high52wMinor: 13200, low52wMinor: 9700, peRatioX100: 1760, marketCapEurMinor: 19500000000000, dividendYieldBps: 220, betaX100: 46, fractionalAllowed: false },
	// European stocks — Consumer
	{ symbol: 'NESN', name: 'Nestlé SA', exchange: 'SIX Swiss', currency: 'CHF', type: 'stock', sector: 'Consumer', region: 'Europe', about: 'Swiss food and beverage multinational; the world’s largest packaged-food group.', lastPriceMinor: 9200, priorCloseMinor: 9163, high52wMinor: 11200, low52wMinor: 8600, peRatioX100: 2050, marketCapEurMinor: 23500000000000, dividendYieldBps: 300, betaX100: 52, fractionalAllowed: false },
	{ symbol: 'OR', name: 'L’Oréal SA', exchange: 'Euronext Paris', currency: 'EUR', type: 'stock', sector: 'Consumer', region: 'Europe', about: 'French cosmetics and beauty group; skincare, make-up, haircare, fragrance.', lastPriceMinor: 38500, priorCloseMinor: 38308, high52wMinor: 44500, low52wMinor: 34600, peRatioX100: 3020, marketCapEurMinor: 20500000000000, dividendYieldBps: 165, betaX100: 74, fractionalAllowed: false },
	{ symbol: 'ULVR', name: 'Unilever plc', exchange: 'LSE', currency: 'GBP', type: 'stock', sector: 'Consumer', region: 'Europe', about: 'UK consumer-goods group; food, home care, and personal care brands.', lastPriceMinor: 4700, priorCloseMinor: 4686, high52wMinor: 5100, low52wMinor: 4100, peRatioX100: 1720, marketCapEurMinor: 13000000000000, dividendYieldBps: 320, betaX100: 52, fractionalAllowed: false },
	{ symbol: 'ITX', name: 'Industria de Diseño Textil', exchange: 'BME Madrid', currency: 'EUR', type: 'stock', sector: 'Consumer', region: 'Europe', about: 'Spanish fast-fashion group; parent of Zara and related retail brands.', lastPriceMinor: 4800, priorCloseMinor: 4748, high52wMinor: 5600, low52wMinor: 3900, peRatioX100: 2650, marketCapEurMinor: 15000000000000, dividendYieldBps: 280, betaX100: 88, fractionalAllowed: false },
	{ symbol: 'MBG', name: 'Mercedes-Benz Group', exchange: 'XETRA', currency: 'EUR', type: 'stock', sector: 'Consumer', region: 'Europe', about: 'German premium automaker; passenger cars and vans.', lastPriceMinor: 5800, priorCloseMinor: 5992, high52wMinor: 7200, low52wMinor: 5200, peRatioX100: 520, marketCapEurMinor: 5800000000000, dividendYieldBps: 780, betaX100: 122, fractionalAllowed: false },
	// European stocks — Financials
	{ symbol: 'ALV', name: 'Allianz SE', exchange: 'XETRA', currency: 'EUR', type: 'stock', sector: 'Financials', region: 'Europe', about: 'German insurance and asset-management group operating worldwide.', lastPriceMinor: 28800, priorCloseMinor: 28628, high52wMinor: 31200, low52wMinor: 23400, peRatioX100: 1180, marketCapEurMinor: 11200000000000, dividendYieldBps: 470, betaX100: 90, fractionalAllowed: false },
	{ symbol: 'SAN', name: 'Banco Santander SA', exchange: 'BME Madrid', currency: 'EUR', type: 'stock', sector: 'Financials', region: 'Europe', about: 'Spanish retail and commercial bank with a large Latin-American footprint.', lastPriceMinor: 460, priorCloseMinor: 471, high52wMinor: 520, low52wMinor: 360, peRatioX100: 640, marketCapEurMinor: 7200000000000, dividendYieldBps: 420, betaX100: 128, fractionalAllowed: false },
	{ symbol: 'BNP', name: 'BNP Paribas SA', exchange: 'Euronext Paris', currency: 'EUR', type: 'stock', sector: 'Financials', region: 'Europe', about: 'French international banking group; retail, corporate, and investment banking.', lastPriceMinor: 6200, priorCloseMinor: 6256, high52wMinor: 7100, low52wMinor: 5400, peRatioX100: 690, marketCapEurMinor: 7100000000000, dividendYieldBps: 630, betaX100: 116, fractionalAllowed: false },
	{ symbol: 'HSBA', name: 'HSBC Holdings plc', exchange: 'LSE', currency: 'GBP', type: 'stock', sector: 'Financials', region: 'Europe', about: 'UK-headquartered global bank with a strong Asian franchise.', lastPriceMinor: 720, priorCloseMinor: 726, high52wMinor: 800, low52wMinor: 620, peRatioX100: 780, marketCapEurMinor: 15000000000000, dividendYieldBps: 700, betaX100: 90, fractionalAllowed: false },
	{ symbol: 'INVE', name: 'Investor AB B', exchange: 'Nasdaq Stockholm', currency: 'SEK', type: 'stock', sector: 'Financials', region: 'Europe', about: 'Swedish industrial holding company controlled by the Wallenberg family.', lastPriceMinor: 28500, priorCloseMinor: 28274, high52wMinor: 31500, low52wMinor: 24000, peRatioX100: 1150, marketCapEurMinor: 7500000000000, dividendYieldBps: 220, betaX100: 102, fractionalAllowed: false },
	// European stocks — Energy
	{ symbol: 'SHEL', name: 'Shell plc', exchange: 'LSE', currency: 'GBP', type: 'stock', sector: 'Energy', region: 'Europe', about: 'UK-based integrated energy major; oil, gas, and low-carbon energy.', lastPriceMinor: 2750, priorCloseMinor: 2829, high52wMinor: 3050, low52wMinor: 2380, peRatioX100: 830, marketCapEurMinor: 17500000000000, dividendYieldBps: 400, betaX100: 88, fractionalAllowed: false },
	{ symbol: 'TTE', name: 'TotalEnergies SE', exchange: 'Euronext Paris', currency: 'EUR', type: 'stock', sector: 'Energy', region: 'Europe', about: 'French multi-energy major; oil, gas, and growing renewables business.', lastPriceMinor: 5800, priorCloseMinor: 5924, high52wMinor: 6800, low52wMinor: 5350, peRatioX100: 770, marketCapEurMinor: 13500000000000, dividendYieldBps: 520, betaX100: 86, fractionalAllowed: false },
	{ symbol: 'EQNR', name: 'Equinor ASA', exchange: 'Oslo Børs', currency: 'NOK', type: 'stock', sector: 'Energy', region: 'Europe', about: 'Norwegian state-backed energy company; oil, gas, and offshore wind.', lastPriceMinor: 28500, priorCloseMinor: 28963, high52wMinor: 34000, low52wMinor: 24500, peRatioX100: 780, marketCapEurMinor: 7000000000000, dividendYieldBps: 550, betaX100: 92, fractionalAllowed: false },
	// European stocks — Technology & Industrials
	{ symbol: 'ADYEN', name: 'Adyen NV', exchange: 'Euronext Amsterdam', currency: 'EUR', type: 'stock', sector: 'Technology', region: 'Europe', about: 'Dutch payments platform for global enterprise merchants.', lastPriceMinor: 152000, priorCloseMinor: 147716, high52wMinor: 210000, low52wMinor: 118000, peRatioX100: 3750, marketCapEurMinor: 4700000000000, dividendYieldBps: 0, betaX100: 142, fractionalAllowed: false },
	{ symbol: 'AIR', name: 'Airbus SE', exchange: 'Euronext Paris', currency: 'EUR', type: 'stock', sector: 'Industrials', region: 'Europe', about: 'European aerospace group; commercial aircraft, defence, and space.', lastPriceMinor: 15200, priorCloseMinor: 14990, high52wMinor: 17200, low52wMinor: 12100, peRatioX100: 2420, marketCapEurMinor: 12000000000000, dividendYieldBps: 130, betaX100: 112, fractionalAllowed: false },
	{ symbol: 'SU', name: 'Schneider Electric SE', exchange: 'Euronext Paris', currency: 'EUR', type: 'stock', sector: 'Industrials', region: 'Europe', about: 'French energy-management and industrial-automation group.', lastPriceMinor: 22500, priorCloseMinor: 22233, high52wMinor: 25400, low52wMinor: 18600, peRatioX100: 2650, marketCapEurMinor: 12800000000000, dividendYieldBps: 140, betaX100: 108, fractionalAllowed: false },

	// US stocks — Technology
	{ symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', currency: 'USD', type: 'stock', sector: 'Technology', region: 'United States', about: 'Designs CPUs and GPUs for data centre, client, and gaming markets.', lastPriceMinor: 15800, priorCloseMinor: 15163, high52wMinor: 22700, low52wMinor: 11800, peRatioX100: 4500, marketCapEurMinor: 26000000000000, dividendYieldBps: 0, betaX100: 168, fractionalAllowed: true },
	{ symbol: 'TSM', name: 'Taiwan Semiconductor (ADR)', exchange: 'NYSE', currency: 'USD', type: 'stock', sector: 'Technology', region: 'United States', about: 'ADR of the world’s largest dedicated semiconductor foundry.', lastPriceMinor: 17200, priorCloseMinor: 16764, high52wMinor: 21200, low52wMinor: 12600, peRatioX100: 2850, marketCapEurMinor: 85000000000000, dividendYieldBps: 130, betaX100: 120, fractionalAllowed: true },
	// US stocks — Communication
	{ symbol: 'GOOGL', name: 'Alphabet Inc. A', exchange: 'NASDAQ', currency: 'USD', type: 'stock', sector: 'Communication', region: 'United States', about: 'Parent of Google; search, advertising, cloud, and YouTube.', lastPriceMinor: 17800, priorCloseMinor: 17572, high52wMinor: 20300, low52wMinor: 13100, peRatioX100: 2450, marketCapEurMinor: 210000000000000, dividendYieldBps: 20, betaX100: 104, fractionalAllowed: true },
	{ symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', sector: 'Communication', region: 'United States', about: 'Operates Facebook, Instagram, WhatsApp; advertising and reality labs.', lastPriceMinor: 50500, priorCloseMinor: 49413, high52wMinor: 54800, low52wMinor: 33500, peRatioX100: 2680, marketCapEurMinor: 130000000000000, dividendYieldBps: 40, betaX100: 120, fractionalAllowed: true },
	{ symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', sector: 'Communication', region: 'United States', about: 'Subscription streaming entertainment service operating worldwide.', lastPriceMinor: 68500, priorCloseMinor: 66895, high52wMinor: 73500, low52wMinor: 43800, peRatioX100: 4200, marketCapEurMinor: 30000000000000, dividendYieldBps: 0, betaX100: 126, fractionalAllowed: true },
	{ symbol: 'DIS', name: 'Walt Disney Co.', exchange: 'NYSE', currency: 'USD', type: 'stock', sector: 'Communication', region: 'United States', about: 'Media and entertainment; studios, parks, and streaming.', lastPriceMinor: 9800, priorCloseMinor: 9655, high52wMinor: 12300, low52wMinor: 8300, peRatioX100: 3800, marketCapEurMinor: 18000000000000, dividendYieldBps: 90, betaX100: 128, fractionalAllowed: true },
	{ symbol: 'SPOT', name: 'Spotify Technology', exchange: 'NYSE', currency: 'USD', type: 'stock', sector: 'Communication', region: 'United States', about: 'Global audio-streaming platform for music and podcasts.', lastPriceMinor: 31500, priorCloseMinor: 30672, high52wMinor: 39500, low52wMinor: 20800, peRatioX100: 6200, marketCapEurMinor: 9000000000000, dividendYieldBps: 0, betaX100: 158, fractionalAllowed: true },
	// US stocks — Consumer
	{ symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', sector: 'Consumer', region: 'United States', about: 'E-commerce and cloud computing (AWS); advertising and devices.', lastPriceMinor: 18500, priorCloseMinor: 18173, high52wMinor: 21100, low52wMinor: 14400, peRatioX100: 4050, marketCapEurMinor: 190000000000000, dividendYieldBps: 0, betaX100: 116, fractionalAllowed: true },
	{ symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', sector: 'Consumer', region: 'United States', about: 'Electric vehicles, energy storage, and solar.', lastPriceMinor: 24800, priorCloseMinor: 23892, high52wMinor: 41500, low52wMinor: 20200, peRatioX100: 6800, marketCapEurMinor: 80000000000000, dividendYieldBps: 0, betaX100: 208, fractionalAllowed: true },
	{ symbol: 'KO', name: 'Coca-Cola Co.', exchange: 'NYSE', currency: 'USD', type: 'stock', sector: 'Consumer', region: 'United States', about: 'Global non-alcoholic beverage company.', lastPriceMinor: 6200, priorCloseMinor: 6188, high52wMinor: 7300, low52wMinor: 5700, peRatioX100: 2450, marketCapEurMinor: 27000000000000, dividendYieldBps: 305, betaX100: 56, fractionalAllowed: true },
	{ symbol: 'PG', name: 'Procter & Gamble Co.', exchange: 'NYSE', currency: 'USD', type: 'stock', sector: 'Consumer', region: 'United States', about: 'Consumer packaged goods; household and personal-care brands.', lastPriceMinor: 16800, priorCloseMinor: 16750, high52wMinor: 18000, low52wMinor: 15600, peRatioX100: 2650, marketCapEurMinor: 38000000000000, dividendYieldBps: 240, betaX100: 42, fractionalAllowed: true },
	// US stocks — Financials, Healthcare, Industrials
	{ symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', currency: 'USD', type: 'stock', sector: 'Financials', region: 'United States', about: 'Diversified US banking and financial-services group.', lastPriceMinor: 20500, priorCloseMinor: 20398, high52wMinor: 22800, low52wMinor: 16700, peRatioX100: 1180, marketCapEurMinor: 58000000000000, dividendYieldBps: 230, betaX100: 106, fractionalAllowed: true },
	{ symbol: 'V', name: 'Visa Inc. A', exchange: 'NYSE', currency: 'USD', type: 'stock', sector: 'Financials', region: 'United States', about: 'Global payments-network operator.', lastPriceMinor: 27800, priorCloseMinor: 27689, high52wMinor: 29500, low52wMinor: 25200, peRatioX100: 3050, marketCapEurMinor: 56000000000000, dividendYieldBps: 75, betaX100: 96, fractionalAllowed: true },
	{ symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', currency: 'USD', type: 'stock', sector: 'Healthcare', region: 'United States', about: 'Pharmaceuticals and medical-technology group.', lastPriceMinor: 15200, priorCloseMinor: 15292, high52wMinor: 16800, low52wMinor: 14300, peRatioX100: 1550, marketCapEurMinor: 37000000000000, dividendYieldBps: 320, betaX100: 52, fractionalAllowed: true },
	{ symbol: 'CAT', name: 'Caterpillar Inc.', exchange: 'NYSE', currency: 'USD', type: 'stock', sector: 'Industrials', region: 'United States', about: 'Construction and mining equipment, engines, and turbines.', lastPriceMinor: 34500, priorCloseMinor: 34260, high52wMinor: 40200, low52wMinor: 28900, peRatioX100: 1650, marketCapEurMinor: 30000000000000, dividendYieldBps: 180, betaX100: 104, fractionalAllowed: true },

	// ETFs — UCITS, EUR-denominated on European venues; sector holds the fund category
	{ symbol: 'CSPX', name: 'iShares Core S&P 500 UCITS', exchange: 'Euronext Amsterdam', currency: 'EUR', type: 'etf', sector: 'US equity', region: 'Global', about: 'Accumulating UCITS ETF tracking the S&P 500 index.', lastPriceMinor: 54800, priorCloseMinor: 54043, high52wMinor: 58000, low52wMinor: 42000, peRatioX100: null, marketCapEurMinor: 9000000000000, dividendYieldBps: 0, betaX100: 100, fractionalAllowed: true },
	{ symbol: 'EQQQ', name: 'Invesco EQQQ Nasdaq-100 UCITS', exchange: 'Euronext Amsterdam', currency: 'EUR', type: 'etf', sector: 'US equity', region: 'Global', about: 'UCITS ETF tracking the Nasdaq-100 index of large US non-financials.', lastPriceMinor: 42000, priorCloseMinor: 41136, high52wMinor: 45000, low52wMinor: 30500, peRatioX100: null, marketCapEurMinor: 1200000000000, dividendYieldBps: 40, betaX100: 112, fractionalAllowed: true },
	{ symbol: 'MEUD', name: 'Amundi Stoxx Europe 600 UCITS', exchange: 'Euronext Paris', currency: 'EUR', type: 'etf', sector: 'Europe equity', region: 'Europe', about: 'Accumulating UCITS ETF tracking the STOXX Europe 600 index.', lastPriceMinor: 24500, priorCloseMinor: 24330, high52wMinor: 26200, low52wMinor: 20100, peRatioX100: null, marketCapEurMinor: 600000000000, dividendYieldBps: 0, betaX100: 98, fractionalAllowed: true },
	{ symbol: 'EIMI', name: 'iShares Core MSCI EM IMI UCITS', exchange: 'Euronext Amsterdam', currency: 'EUR', type: 'etf', sector: 'Emerging markets', region: 'Global', about: 'Accumulating UCITS ETF tracking emerging-market equities.', lastPriceMinor: 3200, priorCloseMinor: 3171, high52wMinor: 3450, low52wMinor: 2680, peRatioX100: null, marketCapEurMinor: 2200000000000, dividendYieldBps: 0, betaX100: 96, fractionalAllowed: true },
	{ symbol: 'WSML', name: 'iShares MSCI World Small Cap UCITS', exchange: 'Euronext Amsterdam', currency: 'EUR', type: 'etf', sector: 'Global equity', region: 'Global', about: 'Accumulating UCITS ETF tracking developed-market small-cap equities.', lastPriceMinor: 7200, priorCloseMinor: 7122, high52wMinor: 7800, low52wMinor: 5900, peRatioX100: null, marketCapEurMinor: 400000000000, dividendYieldBps: 0, betaX100: 108, fractionalAllowed: true },
	{ symbol: 'IUSQ', name: 'iShares MSCI ACWI UCITS', exchange: 'XETRA', currency: 'EUR', type: 'etf', sector: 'Global equity', region: 'Global', about: 'Accumulating UCITS ETF tracking developed + emerging equities (ACWI).', lastPriceMinor: 8900, priorCloseMinor: 8821, high52wMinor: 9500, low52wMinor: 7100, peRatioX100: null, marketCapEurMinor: 1200000000000, dividendYieldBps: 0, betaX100: 100, fractionalAllowed: true },
	{ symbol: 'VHYL', name: 'Vanguard FTSE All-World High Div Yield UCITS', exchange: 'Euronext Amsterdam', currency: 'EUR', type: 'etf', sector: 'Dividend', region: 'Global', about: 'Distributing UCITS ETF tracking higher-yielding global equities.', lastPriceMinor: 6200, priorCloseMinor: 6169, high52wMinor: 6600, low52wMinor: 5300, peRatioX100: null, marketCapEurMinor: 400000000000, dividendYieldBps: 320, betaX100: 88, fractionalAllowed: true },
	{ symbol: 'AGGH', name: 'iShares Core Global Aggregate Bond UCITS', exchange: 'Euronext Amsterdam', currency: 'EUR', type: 'etf', sector: 'Bonds', region: 'Global', about: 'EUR-hedged UCITS ETF tracking global investment-grade bonds.', lastPriceMinor: 485, priorCloseMinor: 484, high52wMinor: 510, low52wMinor: 460, peRatioX100: null, marketCapEurMinor: 700000000000, dividendYieldBps: 280, betaX100: 20, fractionalAllowed: true },
	{ symbol: 'IEGA', name: 'iShares Core Euro Govt Bond UCITS', exchange: 'Euronext Amsterdam', currency: 'EUR', type: 'etf', sector: 'Bonds', region: 'Europe', about: 'UCITS ETF tracking euro-denominated government bonds.', lastPriceMinor: 13500, priorCloseMinor: 13527, high52wMinor: 14200, low52wMinor: 12800, peRatioX100: null, marketCapEurMinor: 500000000000, dividendYieldBps: 250, betaX100: 15, fractionalAllowed: true },
	{ symbol: 'SMH', name: 'VanEck Semiconductor UCITS', exchange: 'Euronext Amsterdam', currency: 'EUR', type: 'etf', sector: 'Technology', region: 'Global', about: 'UCITS ETF tracking the largest global semiconductor companies.', lastPriceMinor: 3800, priorCloseMinor: 3671, high52wMinor: 4600, low52wMinor: 2400, peRatioX100: null, marketCapEurMinor: 300000000000, dividendYieldBps: 20, betaX100: 152, fractionalAllowed: true },
	{ symbol: 'XAIX', name: 'Xtrackers AI & Big Data UCITS', exchange: 'XETRA', currency: 'EUR', type: 'etf', sector: 'Technology', region: 'Global', about: 'UCITS ETF tracking companies in artificial intelligence and big data.', lastPriceMinor: 12500, priorCloseMinor: 12124, high52wMinor: 14200, low52wMinor: 8400, peRatioX100: null, marketCapEurMinor: 500000000000, dividendYieldBps: 0, betaX100: 138, fractionalAllowed: true },
	{ symbol: 'INRG', name: 'iShares Global Clean Energy UCITS', exchange: 'Euronext Amsterdam', currency: 'EUR', type: 'etf', sector: 'Energy', region: 'Global', about: 'UCITS ETF tracking global clean-energy producers and technology.', lastPriceMinor: 920, priorCloseMinor: 933, high52wMinor: 1250, low52wMinor: 780, peRatioX100: null, marketCapEurMinor: 400000000000, dividendYieldBps: 90, betaX100: 118, fractionalAllowed: true }
];

export const HOLDINGS: readonly Holding[] = [
	{ symbol: 'ASML', quantity: 1, avgCostMinor: 81200 },
	{ symbol: 'SAP', quantity: 7, avgCostMinor: 19850 },
	{ symbol: 'AAPL', quantity: 4, avgCostMinor: 18640 },
	{ symbol: 'NVDA', quantity: 8, avgCostMinor: 7420 },
	{ symbol: 'IWDA', quantity: 16, avgCostMinor: 8910 },
	{ symbol: 'VWCE', quantity: 5, avgCostMinor: 11240 },
	{ symbol: 'BTC', quantity: 0.04, avgCostMinor: 4910000 },
	{ symbol: 'ETH', quantity: 0.7, avgCostMinor: 198000 },
	{ symbol: 'SOL', quantity: 11, avgCostMinor: 11200 }
];

export interface Candle {
	/** ISO date (YYYY-MM-DD). */
	time: string;
	openMinor: number;
	highMinor: number;
	lowMinor: number;
	closeMinor: number;
	volume: number;
}

function symbolSeed(symbol: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < symbol.length; i++) {
		h ^= symbol.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/**
 * A deterministic daily OHLC history of `days` sessions ending TODAY, walked
 * BACKWARD from the instrument's last price (so the final close is exactly
 * `lastPriceMinor` and the penultimate is `priorCloseMinor`). Crypto/high-beta
 * names get a wider step. Stable per symbol across runs.
 */
export function priceHistory(symbol: string, days = 365): Candle[] {
	const inst = INSTRUMENTS.find((i) => i.symbol === symbol);
	if (!inst) return [];
	const rng = mulberry32(symbolSeed(symbol));
	const vol = inst.type === 'crypto' ? 0.035 : (inst.betaX100 ?? 100) > 130 ? 0.022 : 0.013;

	// The walk's floor. Within a year, 0.6×52w-low keeps the series realistically
	// bounded; over the multi-year ranges (V08's 5Y/Max) that clamp would flatten the
	// deep past into a straight line, so a lower floor lets the walk descend naturally
	// into a plausible "years ago" base. Same value across a call → deterministic.
	const floor = Math.round(inst.low52wMinor * (days > 400 ? 0.15 : 0.6));

	// Walk closes backward from last → prior → random walk into the past.
	const closes: number[] = new Array(days);
	closes[days - 1] = inst.lastPriceMinor;
	if (days >= 2) closes[days - 2] = inst.priorCloseMinor;
	for (let i = days - 3; i >= 0; i--) {
		const next = closes[i + 1];
		// Walk into the past. A positive drift means earlier prices sit BELOW today's
		// (markets trend up over the year), so the forward-read series rises toward
		// the last price — consistent with positions being up vs cost.
		const shock = (rng() - 0.5) * 2 * vol + 0.0006;
		closes[i] = Math.max(Math.round(next / (1 + shock)), floor);
	}

	const candles: Candle[] = [];
	for (let i = 0; i < days; i++) {
		const close = closes[i];
		const open = i === 0 ? Math.round(close * (1 + (rng() - 0.5) * vol)) : closes[i - 1];
		const hi = Math.max(open, close);
		const lo = Math.min(open, close);
		const high = Math.round(hi * (1 + rng() * vol * 0.6));
		const low = Math.round(lo * (1 - rng() * vol * 0.6));
		const d = new Date(TODAY);
		d.setDate(d.getDate() - (days - 1 - i));
		candles.push({
			time: isoDate(d),
			openMinor: open,
			highMinor: high,
			lowMinor: low,
			closeMinor: close,
			volume: Math.round(100000 + rng() * 900000)
		});
	}
	return candles;
}

/** Range presets → trailing session count. The finer V08 timeframes all serve from the
 *  same deterministic daily seed (more/fewer sessions); `Max` returns the full generated
 *  history. Intraday **1D** is deliberately absent here — it rides V08 Phase C alongside
 *  the live crypto klines + the intraday seed, so every range listed re-renders today. */
export const RANGES = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'Max'] as const;
export type Range = (typeof RANGES)[number];

export function rangeDays(range: Range): number {
	switch (range) {
		case '1W':
			return 7;
		case '1M':
			return 30;
		case '3M':
			return 90;
		case '6M':
			return 182;
		case 'YTD': {
			// Sessions since Jan 1 of TODAY's year (deterministic; ≥2 so a chart always draws).
			const jan1 = new Date(TODAY.getFullYear(), 0, 1);
			const days = Math.round((TODAY.getTime() - jan1.getTime()) / 86_400_000) + 1;
			return Math.max(2, days);
		}
		case '1Y':
			return 365;
		case '5Y':
			return 1825;
		case 'Max':
			return 3650;
	}
}

/**
 * Market open state, derived from the fixed TODAY anchor: closed on weekends and
 * outside 09:00–17:30 CET. When closed, market orders queue for the next open.
 */
export function isMarketOpen(): boolean {
	const day = TODAY.getDay(); // 0 Sun … 6 Sat
	if (day === 0 || day === 6) return false;
	const h = TODAY.getHours();
	return h >= 9 && h < 18;
}

// ── V12 · Portfolio analytics depth ─────────────────────────────────────────────

/** The seeded reference index the V12 benchmark overlay rebases against. Broad
 *  European equity (net-return), EUR-denominated — no live feed (V14 may later
 *  overlay it; until then it's seeded and degrades to "unavailable"). */
export interface BenchmarkMeta {
	symbol: string;
	name: string;
}

export const BENCHMARK: BenchmarkMeta = { symbol: 'SXXR', name: 'STOXX Europe 600 (net return)' };

/**
 * A deterministic daily close history for {@link BENCHMARK} — the SAME backward walk
 * and date scheme as {@link priceHistory} (levels end TODAY, walk into the past from a
 * base level), so it aligns by index to `performanceSeries` for a rebased overlay.
 * Levels are index points ×100 (minor units), EUR — no FX. A gentle long-run uptrend
 * so a rebased comparison reads meaningfully. Stable across runs.
 */
export function benchmarkHistory(days = 365): { time: string; closeMinor: number }[] {
	const rng = mulberry32(symbolSeed(BENCHMARK.symbol));
	const lastMinor = 52340; // 523.40 pts
	const priorMinor = 52210;
	const vol = 0.008;

	const closes: number[] = new Array(days);
	closes[days - 1] = lastMinor;
	if (days >= 2) closes[days - 2] = priorMinor;
	for (let i = days - 3; i >= 0; i--) {
		// Positive drift means earlier levels sit below today's → the forward series rises.
		const shock = (rng() - 0.5) * 2 * vol + 0.0005;
		closes[i] = Math.max(Math.round(closes[i + 1] / (1 + shock)), 1);
	}

	const out: { time: string; closeMinor: number }[] = [];
	for (let i = 0; i < days; i++) {
		const d = new Date(TODAY);
		d.setDate(d.getDate() - (days - 1 - i));
		out.push({ time: isoDate(d), closeMinor: closes[i] });
	}
	return out;
}

/**
 * Executed SELL orders that realized a P/L — merged into the orders seed so V12's
 * realized figure is backed by real V04 blotter rows, never fabricated. Two closed
 * trades: a SAP trim taken at a gain, and a fully-exited LVMH (MC) position closed at
 * a loss (MC isn't in HOLDINGS, so it reads as a closed-out name). `realizedPlEurMinor`
 * is the average-cost realized result (display-only; no lot reconstruction). Ids
 * namespaced `ord-seed-sell-*` so a freshly placed `ord-<n>` can't collide.
 */
export const REALIZED_SEED_ORDERS: Order[] = [
	{ id: 'ord-seed-sell-1', symbol: 'SAP', side: 'sell', kind: 'market', quantity: 3, priceMinor: null, tif: 'day', status: 'filled', totalEurMinor: 73_590, placedAt: isoDate(daysBeforeToday(26)), realizedPlEurMinor: 12_180 },
	{ id: 'ord-seed-sell-2', symbol: 'MC', side: 'sell', kind: 'market', quantity: 1, priceMinor: null, tif: 'day', status: 'filled', totalEurMinor: 68_120, placedAt: isoDate(daysBeforeToday(40)), realizedPlEurMinor: -4_300 }
];
