import { Router } from 'express';
import { buildApiRouter, buildOpenapiRouter } from './factory';

import restaurantLeadGeneration from './specs/restaurant-lead-generation.json';
import restaurantGrowthOpportunity from './specs/restaurant-growth-opportunity.json';
import reviewSentiment from './specs/review-sentiment.json';
import restaurantAiConsultant from './specs/restaurant-ai-consultant.json';
import localRestaurantDiscovery from './specs/local-restaurant-discovery.json';
import officeLunchPlanner from './specs/office-lunch-planner.json';
import cateringProcurement from './specs/catering-procurement.json';
import multiRestaurantOrdering from './specs/multi-restaurant-ordering.json';
import reservationIntelligence from './specs/reservation-intelligence.json';
import franchiseOpportunity from './specs/franchise-opportunity.json';

// Restaurant Agent Commerce suite — 10 agent-native APIs, generically backed by
// the spec-driven AI factory. Slugs match the marketplace listing identifiers.
const SPECS: Record<string, any> = {
  'restaurant-lead-generation': restaurantLeadGeneration,
  'restaurant-growth-opportunity': restaurantGrowthOpportunity,
  'review-sentiment': reviewSentiment,
  'restaurant-ai-consultant': restaurantAiConsultant,
  'local-restaurant-discovery': localRestaurantDiscovery,
  'office-lunch-planner': officeLunchPlanner,
  'catering-procurement': cateringProcurement,
  'multi-restaurant-ordering': multiRestaurantOrdering,
  'reservation-intelligence': reservationIntelligence,
  'franchise-opportunity': franchiseOpportunity,
};

export const restaurantRouterMap: Record<string, Router> = {};
export const restaurantOpenapiMap: Record<string, Router> = {};

for (const [slug, spec] of Object.entries(SPECS)) {
  restaurantRouterMap[slug] = buildApiRouter(spec);
  restaurantOpenapiMap[slug] = buildOpenapiRouter(spec);
}

export const restaurantSlugs = Object.keys(SPECS);
