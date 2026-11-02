import { NextResponse } from "next/server";

export async function GET() {
  const today = new Date().toISOString().split('T')[0];
  
  // Cost estimates based on current usage patterns
  const costEstimates = {
    planGeneration: {
      tokensPerPlan: 500,
      costPerPlan: 0.000375, // $0.075 per 1M tokens * 500 tokens
      dailyPlans: {
        light: { plans: 20, cost: 0.0075 },
        moderate: { plans: 50, cost: 0.01875 },
        heavy: { plans: 100, cost: 0.0375 }
      }
    },
    monthlyEstimates: {
      light: { cost: 0.225, description: "10-20 plans/day" },
      moderate: { cost: 0.5625, description: "25-50 plans/day" },
      heavy: { cost: 1.125, description: "50-100 plans/day" },
      enterprise: { cost: 3.375, description: "150-300 plans/day" }
    },
    quotaLimits: {
      free: {
        requestsPerMinute: 15,
        requestsPerDay: 1500,
        tokensPerMonth: 1000000,
        cost: 0
      },
      paid: {
        requestsPerMinute: 300,
        requestsPerDay: "unlimited",
        tokensPerMonth: "pay-per-use",
        costPer1MTokens: 0.075
      }
    }
  };

  const recommendations = [
    "🎯 Start with paid tier for reliable production use",
    "📊 Monitor usage via Google AI Studio dashboard",
    "💰 Set billing alerts at $5, $10, $25 thresholds",
    "🔄 Implement request caching (already done - 24h cache)",
    "👥 Limit requests per user (already done - 3/day/profile)",
    "📈 Scale gradually - monitor cost vs user growth"
  ];

  return NextResponse.json({
    date: today,
    costEstimates,
    recommendations,
    nextSteps: {
      immediate: "Choose Path A (new API key) or Path B (upgrade billing)",
      testing: "Generate a plan after upgrading to confirm the new quota",
      monitoring: "Check costs weekly via Google Cloud Console"
    },
    usefulLinks: {
      googleAI: "https://ai.google.dev/",
      cloudConsole: "https://console.cloud.google.com/",
      usageMonitoring: "https://ai.dev/usage",
      vercelDashboard: "https://vercel.com/dashboard"
    }
  });
}