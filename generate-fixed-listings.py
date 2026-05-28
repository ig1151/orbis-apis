"""
Generates correct Orbis listing JSON for the 10 price-mismatching APIs.
Uses the canonical template format with all required fields.
"""
import json, os

BASE = "https://orbis-apis.onrender.com"
LOGO = f"{BASE}/logo.png"

def save(filename, data):
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"  Wrote {filename}")

def free_tier(rpd=100, rpm=3000):
    return {"name": "Free", "isFree": True, "requestsPerDay": rpd, "requestsPerMonth": rpm}

def ppc_tier(endpoints, rpd=50000, rpm=1500000):
    base = max(e["pricePerCallUsdc"] for e in endpoints)
    return {
        "name": "Pay Per Call",
        "isFree": False,
        "pricingType": "per_call",
        "pricePerCall": base,
        "requestsPerDay": rpd,
        "requestsPerMonth": rpm,
        "endpointPricing": endpoints
    }

def ep(method, path, price, desc):
    return {"method": method, "pathPattern": path, "pricePerCallUsdc": price, "description": desc}

def endpoint(method, path, desc):
    return {"method": method, "path": path, "description": desc}

# ─────────────────────────────────────────────────────────────────────────────
# 1. Fear & Greed Index API
# ─────────────────────────────────────────────────────────────────────────────
save("fear-greed-listing.json", {
    "name": "Fear & Greed Index API",
    "shortDescription": "Real-time crypto Fear & Greed Index with history, trend analysis, and contrarian trade signals",
    "description": "Access the crypto Fear & Greed Index in real time, track 30-day history, detect sentiment extremes, and surface contrarian buy/sell opportunities. Built for trading agents, portfolio dashboards, and market timing workflows. Returns structured sentiment data with drivers, signals, and daily streak analysis.",
    "category": "crypto",
    "baseUrl": f"{BASE}/fear-greed",
    "websiteUrl": BASE,
    "docsUrl": f"{BASE}/fear-greed/openapi.json",
    "openApiSpecUrl": f"{BASE}/fear-greed/openapi.json",
    "logoUrl": LOGO,
    "tags": ["fear-greed", "market-sentiment", "crypto", "trading-signals", "contrarian", "x402", "coinbase-bazaar"],
    "keywords": ["fear and greed index api", "crypto sentiment api", "market sentiment indicator", "crypto fear greed tracker", "contrarian trading signal"],
    "tiers": [
        free_tier(100, 3000),
        ppc_tier([
            ep("POST", "/current", 0.002, "Real-time Fear & Greed index with drivers and sentiment"),
            ep("POST", "/history", 0.003, "30-day index history with streaks and summary"),
            ep("POST", "/lookup", 0.005, "ONE-CALL full sentiment intelligence with contrarian signals")
        ])
    ],
    "endpoints": [
        endpoint("POST", "/current", "Real-time Fear & Greed index with drivers"),
        endpoint("POST", "/history", "30-day history with streaks and summary"),
        endpoint("POST", "/lookup", "ONE-CALL full sentiment intelligence")
    ]
})

# ─────────────────────────────────────────────────────────────────────────────
# 2. Top Movers API
# ─────────────────────────────────────────────────────────────────────────────
save("top-movers-listing.json", {
    "name": "Top Movers API",
    "shortDescription": "Real-time top crypto gainers, losers, and trending coins with momentum signals",
    "description": "Get real-time top crypto gainers, losers, and trending coins ranked by percentage change, volume, and momentum. Built for trading agents, market scanners, and portfolio dashboards that need to act on momentum signals. Includes trade signals, recovery likelihood, trend drivers, and sector rotation data.",
    "category": "crypto",
    "baseUrl": f"{BASE}/top-movers",
    "websiteUrl": BASE,
    "docsUrl": f"{BASE}/top-movers/openapi.json",
    "openApiSpecUrl": f"{BASE}/top-movers/openapi.json",
    "logoUrl": LOGO,
    "tags": ["top-movers", "crypto-gainers", "crypto-losers", "trending-coins", "market-data", "x402", "coinbase-bazaar"],
    "keywords": ["top crypto gainers api", "crypto top losers api", "trending cryptocurrency api", "market movers crypto api", "momentum trading signals"],
    "tiers": [
        free_tier(100, 3000),
        ppc_tier([
            ep("POST", "/gainers", 0.002, "Top N crypto gainers by % change in timeframe"),
            ep("POST", "/losers",  0.002, "Top N crypto losers by % change in timeframe"),
            ep("POST", "/trending",0.002, "Trending coins by search volume, social, and on-chain activity"),
            ep("POST", "/lookup",  0.005, "ONE-CALL full market movers snapshot: gainers, losers, trending")
        ])
    ],
    "endpoints": [
        endpoint("POST", "/gainers",  "Top crypto gainers"),
        endpoint("POST", "/losers",   "Top crypto losers"),
        endpoint("POST", "/trending", "Trending coins"),
        endpoint("POST", "/lookup",   "ONE-CALL full market movers snapshot")
    ]
})

# ─────────────────────────────────────────────────────────────────────────────
# 3. Smart Money Flow API
# ─────────────────────────────────────────────────────────────────────────────
save("smart-money-flow-listing.json", {
    "name": "Smart Money Flow API",
    "shortDescription": "Track institutional and smart-money capital flows across crypto ecosystems",
    "description": "Advanced smart money intelligence API for AI trading systems, hedge funds, and autonomous market agents. Analyze institutional capital flows, rotation patterns, accumulation zones, liquidity migration, and conviction scoring across chains, sectors, and assets.",
    "category": "crypto",
    "baseUrl": f"{BASE}/smart-money-flow",
    "websiteUrl": BASE,
    "docsUrl": f"{BASE}/smart-money-flow/openapi.json",
    "openApiSpecUrl": f"{BASE}/smart-money-flow/openapi.json",
    "logoUrl": f"{BASE}/assets/smart-money-flow.png",
    "tags": ["smart-money", "capital-flows", "institutional", "on-chain", "trading-signals", "x402", "coinbase-bazaar", "agentic-market"],
    "keywords": ["smart money flow api", "institutional wallet flows", "crypto sector rotation", "top smart wallets", "onchain capital flows"],
    "tiers": [
        free_tier(50, 1500),
        ppc_tier([
            ep("POST", "/flows",   0.005, "Active capital flow map: sectors, chains, rotation signals"),
            ep("POST", "/wallets", 0.006, "Top smart-money wallet profiles with conviction scores"),
            ep("POST", "/lookup",  0.010, "ONE-CALL full smart money intelligence for an asset")
        ])
    ],
    "endpoints": [
        endpoint("POST", "/flows",   "Active capital flow map"),
        endpoint("POST", "/wallets", "Top smart-money wallet profiles"),
        endpoint("POST", "/lookup",  "ONE-CALL full smart money intelligence")
    ]
})

# ─────────────────────────────────────────────────────────────────────────────
# 4. Meme Coin Intelligence API
# ─────────────────────────────────────────────────────────────────────────────
save("meme-coin-intelligence-listing.json", {
    "name": "Meme Coin Intelligence API",
    "shortDescription": "Virality scoring, rugpull detection, momentum tracking, and meme coin social intelligence",
    "description": "AI-powered meme coin intelligence API for traders, discovery engines, and autonomous crypto agents. Detect virality, momentum acceleration, social hype, rugpull risk, whale participation, and conviction signals before meme narratives peak.",
    "category": "crypto",
    "baseUrl": f"{BASE}/meme-coin-intelligence",
    "websiteUrl": BASE,
    "docsUrl": f"{BASE}/meme-coin-intelligence/openapi.json",
    "openApiSpecUrl": f"{BASE}/meme-coin-intelligence/openapi.json",
    "logoUrl": f"{BASE}/assets/meme-coin-intelligence.png",
    "tags": ["meme-coins", "virality", "rugpull-risk", "social-sentiment", "momentum", "x402", "coinbase-bazaar", "agentic-market"],
    "keywords": ["meme coin intelligence", "rugpull risk api", "meme coin virality score", "trending meme coins", "contract safety score"],
    "tiers": [
        free_tier(50, 1500),
        ppc_tier([
            ep("POST", "/score",    0.004, "Virality + rugpull risk score for a specific token"),
            ep("POST", "/trending", 0.005, "Trending meme coins ranked by momentum and social signal"),
            ep("POST", "/lookup",   0.008, "ONE-CALL full meme coin intelligence with whale and social data")
        ])
    ],
    "endpoints": [
        endpoint("POST", "/score",    "Virality and rugpull risk score"),
        endpoint("POST", "/trending", "Trending meme coins by momentum"),
        endpoint("POST", "/lookup",   "ONE-CALL full meme coin intelligence")
    ]
})

# ─────────────────────────────────────────────────────────────────────────────
# 5. Market Dominance API
# ─────────────────────────────────────────────────────────────────────────────
save("market-dominance-listing.json", {
    "name": "Market Dominance API",
    "shortDescription": "Track BTC, ETH, and altcoin dominance shifts with sector rotation intelligence",
    "description": "Crypto market rotation intelligence API for portfolio managers, macro traders, and AI market agents. Analyze BTC dominance, ETH rotation, altseason probability, liquidity migration, and sector leadership shifts across crypto markets.",
    "category": "crypto",
    "baseUrl": f"{BASE}/market-dominance",
    "websiteUrl": BASE,
    "docsUrl": f"{BASE}/market-dominance/openapi.json",
    "openApiSpecUrl": f"{BASE}/market-dominance/openapi.json",
    "logoUrl": f"{BASE}/assets/market-dominance.png",
    "tags": ["market-dominance", "btc-dominance", "altseason", "market-rotation", "macro", "x402", "coinbase-bazaar", "agentic-market"],
    "keywords": ["btc dominance api", "alt season indicator", "crypto market phase", "market dominance history", "portfolio allocation signal"],
    "tiers": [
        free_tier(100, 3000),
        ppc_tier([
            ep("POST", "/current", 0.004, "Current BTC, ETH, and altcoin dominance with rotation signals"),
            ep("POST", "/history", 0.005, "Historical dominance data with trend and cycle analysis"),
            ep("POST", "/lookup",  0.008, "ONE-CALL full market dominance intelligence with rotation plan")
        ])
    ],
    "endpoints": [
        endpoint("POST", "/current", "Current dominance with rotation signals"),
        endpoint("POST", "/history", "Historical dominance with trend analysis"),
        endpoint("POST", "/lookup",  "ONE-CALL full market dominance intelligence")
    ]
})

# ─────────────────────────────────────────────────────────────────────────────
# 6. Borrowing Rates API
# ─────────────────────────────────────────────────────────────────────────────
save("borrowing-rates-listing.json", {
    "name": "Borrowing Rates API",
    "shortDescription": "Optimize DeFi borrowing costs with liquidation and collateral risk analysis",
    "description": "Advanced borrowing optimization API for DeFi traders, leveraged strategies, and autonomous portfolio systems. Compare variable and stable borrow APRs, collateral requirements, liquidation thresholds, and risk-adjusted borrowing strategies across major lending protocols.",
    "category": "crypto",
    "baseUrl": f"{BASE}/borrowing-rates",
    "websiteUrl": BASE,
    "docsUrl": f"{BASE}/borrowing-rates/openapi.json",
    "openApiSpecUrl": f"{BASE}/borrowing-rates/openapi.json",
    "logoUrl": f"{BASE}/assets/borrowing-rates.png",
    "tags": ["defi", "borrowing", "liquidation-risk", "leverage", "lending", "x402", "coinbase-bazaar", "agentic-market"],
    "keywords": ["defi borrowing rates api", "crypto borrow cost api", "aave compound borrow api", "liquidation risk api", "defi leverage strategy api"],
    "tiers": [
        free_tier(50, 1500),
        ppc_tier([
            ep("POST", "/rates",    0.003, "Variable and stable borrow rates across major protocols"),
            ep("POST", "/optimize", 0.005, "Best borrowing strategy given collateral and target amount"),
            ep("POST", "/lookup",   0.008, "ONE-CALL full borrowing intelligence with risk and liquidation analysis")
        ])
    ],
    "endpoints": [
        endpoint("POST", "/rates",    "Borrow rates across protocols"),
        endpoint("POST", "/optimize", "Best borrowing strategy for collateral"),
        endpoint("POST", "/lookup",   "ONE-CALL full borrowing intelligence")
    ]
})

# ─────────────────────────────────────────────────────────────────────────────
# 7. Honeypot Scanner API
# ─────────────────────────────────────────────────────────────────────────────
save("honeypot-scanner-listing.json", {
    "name": "Honeypot Scanner API",
    "shortDescription": "Detect honeypot contracts, rugpull risk, and malicious token behavior before trading",
    "description": "Security-first smart contract analysis API for wallets, trading agents, and autonomous crypto workflows. Detect honeypots, blacklist functions, hidden sell restrictions, LP unlock risk, ownership risk, rugpull vectors, and contract safety signals before executing trades.",
    "category": "crypto",
    "baseUrl": f"{BASE}/honeypot-scanner",
    "websiteUrl": BASE,
    "docsUrl": f"{BASE}/honeypot-scanner/openapi.json",
    "openApiSpecUrl": f"{BASE}/honeypot-scanner/openapi.json",
    "logoUrl": f"{BASE}/assets/honeypot-scanner.png",
    "tags": ["honeypot", "rugpull", "security", "smart-contracts", "token-safety", "x402", "coinbase-bazaar", "agentic-market"],
    "keywords": ["honeypot scanner api", "token honeypot detector api", "rugpull risk api", "smart contract safety api", "sell restriction detector api"],
    "tiers": [
        free_tier(50, 1500),
        ppc_tier([
            ep("POST", "/scan",   0.005, "Full honeypot scan: sell restrictions, blacklist, LP lock status"),
            ep("POST", "/risk",   0.006, "Detailed rugpull risk breakdown with factor scores"),
            ep("POST", "/lookup", 0.010, "ONE-CALL full contract safety intelligence with execution gate")
        ])
    ],
    "endpoints": [
        endpoint("POST", "/scan",   "Full honeypot scan"),
        endpoint("POST", "/risk",   "Rugpull risk breakdown"),
        endpoint("POST", "/lookup", "ONE-CALL full contract safety intelligence")
    ]
})

# ─────────────────────────────────────────────────────────────────────────────
# 8. NFT Sniper Alert API
# ─────────────────────────────────────────────────────────────────────────────
save("nft-sniper-alert-listing.json", {
    "name": "NFT Sniper Alert API",
    "shortDescription": "Detect below-floor NFT listings and instant flip opportunities with urgency scoring",
    "description": "High-frequency NFT sniper intelligence API for traders, alpha groups, and autonomous NFT execution agents. Detect below-floor listings, rarity-adjusted discounts, instant flip opportunities, urgency levels, capital requirements, and real-time marketplace inefficiencies across OpenSea, Blur, and X2Y2. Optimized for x402 micropayments, Coinbase Bazaar, and agent-native execution workflows.",
    "category": "crypto",
    "baseUrl": f"{BASE}/nft-sniper-alert",
    "websiteUrl": BASE,
    "docsUrl": f"{BASE}/nft-sniper-alert/openapi.json",
    "openApiSpecUrl": f"{BASE}/nft-sniper-alert/openapi.json",
    "logoUrl": f"{BASE}/assets/nft-sniper-alert.png",
    "tags": ["nft", "sniper-alert", "below-floor", "flip-opportunities", "market-inefficiency", "x402", "coinbase-bazaar", "agentic-market"],
    "keywords": ["nft sniper api", "below floor nft alerts", "nft flip opportunities", "nft alpha scanner", "rarity adjusted nft pricing"],
    "tiers": [
        free_tier(20, 600),
        ppc_tier([
            ep("GET", "/listings",  0.008, "Detect below-floor NFT listings with discount and urgency score"),
            ep("GET", "/watchlist", 0.006, "Monitor watchlist collections for sniper opportunities"),
            ep("GET", "/lookup",    0.012, "ONE-CALL full sniper intelligence for a specific token")
        ])
    ],
    "endpoints": [
        endpoint("GET", "/listings",  "Below-floor NFT listings with urgency scoring"),
        endpoint("GET", "/watchlist", "Sniper opportunities across watchlist collections"),
        endpoint("GET", "/lookup",    "ONE-CALL sniper intelligence for a specific token")
    ]
})

# ─────────────────────────────────────────────────────────────────────────────
# 9. NFT Volume Heatmap API
# ─────────────────────────────────────────────────────────────────────────────
save("nft-volume-heatmap-listing.json", {
    "name": "NFT Volume Heatmap API",
    "shortDescription": "NFT trading volume heatmaps, volatility analysis, and optimal entry timing by day and hour",
    "description": "NFT market timing API for trading agents, dashboards, and NFT analytics systems. Analyze collection-level and market-wide NFT volume trends, volatility, liquidity shifts, best entry windows, and optimal trading periods across major NFT marketplaces. Optimized for x402 micropayments, Coinbase Bazaar, and agent-native execution workflows.",
    "category": "crypto",
    "baseUrl": f"{BASE}/nft-volume-heatmap",
    "websiteUrl": BASE,
    "docsUrl": f"{BASE}/nft-volume-heatmap/openapi.json",
    "openApiSpecUrl": f"{BASE}/nft-volume-heatmap/openapi.json",
    "logoUrl": f"{BASE}/assets/nft-volume-heatmap.png",
    "tags": ["nft", "volume-heatmap", "market-timing", "volatility", "liquidity", "x402", "coinbase-bazaar"],
    "keywords": ["nft volume heatmap", "nft liquidity api", "nft market timing", "nft volatility analysis", "nft volume trends"],
    "tiers": [
        free_tier(20, 600),
        ppc_tier([
            ep("GET", "/collection", 0.005, "Volume heatmap by day/hour for a specific NFT collection"),
            ep("GET", "/market",     0.004, "Market-wide NFT volume heatmap across all collections"),
            ep("GET", "/lookup",     0.008, "ONE-CALL volume intelligence with best entry timing windows")
        ])
    ],
    "endpoints": [
        endpoint("GET", "/collection", "Collection volume heatmap by day and hour"),
        endpoint("GET", "/market",     "Market-wide NFT volume heatmap"),
        endpoint("GET", "/lookup",     "ONE-CALL volume intelligence with entry timing")
    ]
})

# ─────────────────────────────────────────────────────────────────────────────
# 10. NFT Arbitrage API (Tier 4, slug: nft-arbitrage-api-24207d)
# ─────────────────────────────────────────────────────────────────────────────
save("nft-arbitrage-t4-listing.json", {
    "name": "NFT Arbitrage API",
    "shortDescription": "Cross-marketplace NFT arbitrage with fee-adjusted P&L across OpenSea, Blur, and X2Y2",
    "description": "NFT arbitrage intelligence API for NFT traders, market makers, and autonomous execution agents. Detect cross-marketplace NFT pricing discrepancies across OpenSea, Blur, and X2Y2 with net profitability after royalties, gas fees, marketplace fees, liquidity risk, and execution urgency. Optimized for x402 micropayments, Coinbase Bazaar, and agent-native execution workflows.",
    "category": "crypto",
    "baseUrl": f"{BASE}/nft-arbitrage",
    "websiteUrl": BASE,
    "docsUrl": f"{BASE}/nft-arbitrage/openapi.json",
    "openApiSpecUrl": f"{BASE}/nft-arbitrage/openapi.json",
    "logoUrl": f"{BASE}/assets/nft-arbitrage.png",
    "tags": ["nft", "arbitrage", "cross-marketplace", "opensea", "blur", "x402", "coinbase-bazaar", "agentic-market"],
    "keywords": ["nft arbitrage api", "cross marketplace nft pricing", "blur opensea arbitrage", "nft spread scanner", "nft profitability analysis"],
    "tiers": [
        free_tier(20, 600),
        ppc_tier([
            ep("GET", "/opportunities", 0.008, "Active cross-marketplace arbitrage opportunities with fee-adjusted P&L"),
            ep("GET", "/market-spread",  0.006, "Floor price spread analysis across all major NFT marketplaces"),
            ep("GET", "/lookup",         0.012, "ONE-CALL full arbitrage intelligence for a specific collection")
        ])
    ],
    "endpoints": [
        endpoint("GET", "/opportunities", "Cross-marketplace arbitrage opportunities"),
        endpoint("GET", "/market-spread",  "Floor price spread across marketplaces"),
        endpoint("GET", "/lookup",         "ONE-CALL full arbitrage intelligence")
    ]
})

print("\nAll 10 listing files generated successfully.")
