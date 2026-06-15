// AUTO-GENERATED from live output by x402-test/gen-b4-examples.mjs — do not hand-edit.
// Regenerate after changing the route: start the server, run capture-b4.mjs then gen-b4-examples.mjs.
export const mapExample = {
  "trace_id": "wsm-1780000000000",
  "request_id": "wsm-1780000000000",
  "computed_at": "2026-06-15T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "host": "shop.example.com",
  "page_count": 6,
  "internal_link_count": 8,
  "external_link_count": 1,
  "invalid_link_count": 0,
  "home_url": "https://shop.example.com/",
  "home_inferred": false,
  "max_depth": 2,
  "sections": [
    {
      "section": "products",
      "page_count": 3
    },
    {
      "section": "(root)",
      "page_count": 1
    },
    {
      "section": "about",
      "page_count": 1
    },
    {
      "section": "legacy",
      "page_count": 1
    }
  ],
  "orphan_pages": [
    "https://shop.example.com/legacy"
  ],
  "dead_end_pages": [
    "https://shop.example.com/legacy"
  ],
  "hub_pages": [],
  "unreachable_pages": [
    "https://shop.example.com/legacy"
  ],
  "dangling_internal_links": [
    {
      "from": "https://shop.example.com/products/gadget",
      "to": "https://shop.example.com/missing-page"
    }
  ],
  "nodes": [
    {
      "url": "https://shop.example.com/",
      "path": "/",
      "section": "(root)",
      "depth": 0,
      "in_degree": 2,
      "out_degree": 2,
      "role": "home",
      "reachable": true
    },
    {
      "url": "https://shop.example.com/about",
      "path": "/about",
      "section": "about",
      "depth": 1,
      "in_degree": 1,
      "out_degree": 1,
      "role": "normal",
      "reachable": true
    },
    {
      "url": "https://shop.example.com/legacy",
      "path": "/legacy",
      "section": "legacy",
      "depth": null,
      "in_degree": 0,
      "out_degree": 0,
      "role": "orphan",
      "reachable": false
    },
    {
      "url": "https://shop.example.com/products",
      "path": "/products",
      "section": "products",
      "depth": 1,
      "in_degree": 3,
      "out_degree": 3,
      "role": "normal",
      "reachable": true
    },
    {
      "url": "https://shop.example.com/products/gadget",
      "path": "/products/gadget",
      "section": "products",
      "depth": 2,
      "in_degree": 1,
      "out_degree": 1,
      "role": "normal",
      "reachable": true
    },
    {
      "url": "https://shop.example.com/products/widget",
      "path": "/products/widget",
      "section": "products",
      "depth": 2,
      "in_degree": 1,
      "out_degree": 1,
      "role": "normal",
      "reachable": true
    }
  ],
  "edges": [
    {
      "from": "https://shop.example.com/",
      "to": "https://shop.example.com/about"
    },
    {
      "from": "https://shop.example.com/",
      "to": "https://shop.example.com/products"
    },
    {
      "from": "https://shop.example.com/about",
      "to": "https://shop.example.com/"
    },
    {
      "from": "https://shop.example.com/products",
      "to": "https://shop.example.com/"
    },
    {
      "from": "https://shop.example.com/products",
      "to": "https://shop.example.com/products/gadget"
    },
    {
      "from": "https://shop.example.com/products",
      "to": "https://shop.example.com/products/widget"
    },
    {
      "from": "https://shop.example.com/products/gadget",
      "to": "https://shop.example.com/products"
    },
    {
      "from": "https://shop.example.com/products/widget",
      "to": "https://shop.example.com/products"
    }
  ],
  "sitemap_diff": {
    "provided": true,
    "missing_from_sitemap": [
      "https://shop.example.com/about",
      "https://shop.example.com/legacy",
      "https://shop.example.com/products/gadget",
      "https://shop.example.com/products/widget"
    ],
    "missing_from_crawl": [
      "https://shop.example.com/contact"
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "structure": 1,
    "navigation": 1
  },
  "recommended_actions_priority_order": [
    "6 page(s), 8 internal link(s); home https://shop.example.com/, max click depth 2.",
    "1 orphan page(s) with no inbound internal links — add navigation links to them.",
    "1 page(s) unreachable from home — they cannot be navigated to.",
    "1 dead-end page(s) with no outbound internal links.",
    "1 dangling internal link(s) point to uncrawled/missing pages — verify they resolve.",
    "Sitemap diff: 1 in sitemap but not crawled, 4 crawled but absent from sitemap."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the data scraped from these pages against an expected schema."
    },
    {
      "api": "data-lineage-tracker",
      "reason": "Model the crawl/transform steps that consume these pages as a lineage graph."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
};

export const lookupExample = {
  "trace_id": "wsm-1780000000000",
  "request_id": "wsm-1780000000000",
  "computed_at": "2026-06-15T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "host": "shop.example.com",
  "page_count": 6,
  "internal_link_count": 8,
  "external_link_count": 1,
  "invalid_link_count": 0,
  "home_url": "https://shop.example.com/",
  "home_inferred": false,
  "max_depth": 2,
  "sections": [
    {
      "section": "products",
      "page_count": 3
    },
    {
      "section": "(root)",
      "page_count": 1
    },
    {
      "section": "about",
      "page_count": 1
    },
    {
      "section": "legacy",
      "page_count": 1
    }
  ],
  "orphan_pages": [
    "https://shop.example.com/legacy"
  ],
  "dead_end_pages": [
    "https://shop.example.com/legacy"
  ],
  "hub_pages": [],
  "unreachable_pages": [
    "https://shop.example.com/legacy"
  ],
  "dangling_internal_links": [
    {
      "from": "https://shop.example.com/products/gadget",
      "to": "https://shop.example.com/missing-page"
    }
  ],
  "nodes": [
    {
      "url": "https://shop.example.com/",
      "path": "/",
      "section": "(root)",
      "depth": 0,
      "in_degree": 2,
      "out_degree": 2,
      "role": "home",
      "reachable": true
    },
    {
      "url": "https://shop.example.com/about",
      "path": "/about",
      "section": "about",
      "depth": 1,
      "in_degree": 1,
      "out_degree": 1,
      "role": "normal",
      "reachable": true
    },
    {
      "url": "https://shop.example.com/legacy",
      "path": "/legacy",
      "section": "legacy",
      "depth": null,
      "in_degree": 0,
      "out_degree": 0,
      "role": "orphan",
      "reachable": false
    },
    {
      "url": "https://shop.example.com/products",
      "path": "/products",
      "section": "products",
      "depth": 1,
      "in_degree": 3,
      "out_degree": 3,
      "role": "normal",
      "reachable": true
    },
    {
      "url": "https://shop.example.com/products/gadget",
      "path": "/products/gadget",
      "section": "products",
      "depth": 2,
      "in_degree": 1,
      "out_degree": 1,
      "role": "normal",
      "reachable": true
    },
    {
      "url": "https://shop.example.com/products/widget",
      "path": "/products/widget",
      "section": "products",
      "depth": 2,
      "in_degree": 1,
      "out_degree": 1,
      "role": "normal",
      "reachable": true
    }
  ],
  "edges": [
    {
      "from": "https://shop.example.com/",
      "to": "https://shop.example.com/about"
    },
    {
      "from": "https://shop.example.com/",
      "to": "https://shop.example.com/products"
    },
    {
      "from": "https://shop.example.com/about",
      "to": "https://shop.example.com/"
    },
    {
      "from": "https://shop.example.com/products",
      "to": "https://shop.example.com/"
    },
    {
      "from": "https://shop.example.com/products",
      "to": "https://shop.example.com/products/gadget"
    },
    {
      "from": "https://shop.example.com/products",
      "to": "https://shop.example.com/products/widget"
    },
    {
      "from": "https://shop.example.com/products/gadget",
      "to": "https://shop.example.com/products"
    },
    {
      "from": "https://shop.example.com/products/widget",
      "to": "https://shop.example.com/products"
    }
  ],
  "sitemap_diff": {
    "provided": true,
    "missing_from_sitemap": [
      "https://shop.example.com/about",
      "https://shop.example.com/legacy",
      "https://shop.example.com/products/gadget",
      "https://shop.example.com/products/widget"
    ],
    "missing_from_crawl": [
      "https://shop.example.com/contact"
    ]
  },
  "reasoning": {
    "why_result_generated": "Mapped 6 page(s) and 8 internal link(s) into a navigation graph rooted at https://shop.example.com/.",
    "key_factors": [
      "Sections: products (3), (root) (1), about (1), legacy (1).",
      "Orphans: 1, dead-ends: 1, unreachable: 1, max depth 2.",
      "Sitemap diff: 1 missing-from-crawl, 4 missing-from-sitemap."
    ],
    "invalidators": [
      "The graph is built only from the supplied pages/links; pages or links not provided are invisible — no live crawling is performed.",
      "Click depth is measured from the supplied home_url over internal links only.",
      "A \"dangling\" internal link points to a same-host URL that is not among the supplied pages — it may be uncrawled rather than broken (this API does not fetch to confirm).",
      "URLs are normalized by lowercasing host, dropping the fragment, and trimming a trailing slash; query strings are kept, so ?a=1 and ?a=2 are distinct pages."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "structure": 1,
    "navigation": 1
  },
  "recommended_actions_priority_order": [
    "6 page(s), 8 internal link(s); home https://shop.example.com/, max click depth 2.",
    "1 orphan page(s) with no inbound internal links — add navigation links to them.",
    "1 page(s) unreachable from home — they cannot be navigated to.",
    "1 dead-end page(s) with no outbound internal links.",
    "1 dangling internal link(s) point to uncrawled/missing pages — verify they resolve.",
    "Sitemap diff: 1 in sitemap but not crawled, 4 crawled but absent from sitemap."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the data scraped from these pages against an expected schema."
    },
    {
      "api": "data-lineage-tracker",
      "reason": "Model the crawl/transform steps that consume these pages as a lineage graph."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
};
