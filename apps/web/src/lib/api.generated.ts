/* This file is generated from openapi/openapi.json. Do not edit manually. */
export interface paths {
    "/api/v1/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Dashboard */
        get: operations["dashboard_api_v1_dashboard_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/insights/{insight_id}/evidence": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evidence */
        get: operations["evidence_api_v1_insights__insight_id__evidence_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/insights/{insight_id}/records": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Records */
        get: operations["records_api_v1_insights__insight_id__records_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/merchants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Merchants */
        get: operations["merchants_api_v1_merchants_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/healthz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health */
        get: operations["health_healthz_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AmountBandRow */
        AmountBandRow: {
            /** Band Id */
            band_id: string;
            /** Conversion Rate */
            conversion_rate: number | null;
            /** Evidence Id */
            evidence_id: string;
            /** Label Fa */
            label_fa: string;
            /** Max Exclusive Irr */
            max_exclusive_irr: number | null;
            /** Min Irr */
            min_irr: number;
            /** Sessions */
            sessions: number;
            /** Verified Revenue */
            verified_revenue: number;
            /** Verified Sessions */
            verified_sessions: number;
        };
        /** AttemptEvidenceRecord */
        AttemptEvidenceRecord: {
            /** Init Time Ms */
            init_time_ms: number | null;
            /** Psp Code */
            psp_code: string | null;
            /** Session Key */
            session_key: string;
            /** Switch Response Code */
            switch_response_code: string | null;
            /** Try Created At */
            try_created_at: string | null;
            /** Try Seq */
            try_seq: number;
            /** Try Status */
            try_status: string;
            /** Verify Time Ms */
            verify_time_ms: number | null;
        };
        /** CalculationInputs */
        CalculationInputs: {
            /** Denominator Definition */
            denominator_definition: string | null;
            /** Denominator Value */
            denominator_value: number | null;
            /** Numerator Definition */
            numerator_definition: string | null;
            /** Numerator Value */
            numerator_value: number | null;
        };
        /** Comparison */
        Comparison: {
            /** Absolute Difference */
            absolute_difference?: number | null;
            /** Definition */
            definition?: string | null;
            /** Relative Difference */
            relative_difference?: number | null;
            /**
             * Type
             * @enum {string}
             */
            type: "none" | "previous_period" | "previous_year" | "peer_group" | "target" | "baseline";
            /** Value */
            value?: number | string | null;
            /** Weighting */
            weighting?: string | null;
        };
        /** ConfidenceInterval */
        ConfidenceInterval: {
            /** High */
            high: number | null;
            /** Low */
            low: number | null;
        };
        /** DashboardInsight */
        DashboardInsight: {
            /** Insight Id */
            insight_id: string;
            /** Metric Id */
            metric_id: string;
            recommendation?: components["schemas"]["Recommendation"] | null;
            /** Statement */
            statement: string;
            /** Title */
            title: string;
        };
        /** DashboardKpi */
        DashboardKpi: {
            comparison?: components["schemas"]["Comparison"] | null;
            confidence_interval_95?: components["schemas"]["ConfidenceInterval"] | null;
            /** Evidence Id */
            evidence_id: string;
            /** Label */
            label: string;
            /** Metric Id */
            metric_id: string;
            /** Unit */
            unit: string;
            /** Value */
            value: number | null;
        };
        /** DashboardMerchant */
        DashboardMerchant: {
            /** Category Id */
            category_id: number;
            /** Category Title */
            category_title: string;
            /** Merchant Key */
            merchant_key: string;
            /** Terminal Count */
            terminal_count: number;
        };
        /** DashboardMeta */
        DashboardMeta: {
            /** Calculation Version */
            calculation_version: string;
            /** Data Freshness */
            data_freshness: string;
            /**
             * Date From
             * Format: date
             */
            date_from: string;
            /**
             * Date To
             * Format: date
             */
            date_to: string;
            /** Merchant Key */
            merchant_key: string;
            /** Partial Data */
            partial_data: boolean;
            /** Source Kind */
            source_kind: string;
            /**
             * Timezone
             * @constant
             */
            timezone: "Asia/Tehran";
        };
        /** DashboardResponse */
        DashboardResponse: {
            /** Adjusted Fee Notice */
            adjusted_fee_notice: string;
            /** Amount Bands */
            amount_bands: components["schemas"]["AmountBandRow"][];
            /** Insights */
            insights: components["schemas"]["DashboardInsight"][];
            /** Kpis */
            kpis: components["schemas"]["DashboardKpi"][];
            latency: components["schemas"]["LatencySection"];
            lifecycle: components["schemas"]["LifecycleSection"];
            merchant: components["schemas"]["DashboardMerchant"];
            meta: components["schemas"]["DashboardMeta"];
            /** Metric Registry */
            metric_registry: components["schemas"]["MetricRegistryItem"][];
            opportunity: components["schemas"]["OpportunitySection"];
            paid_not_verified: components["schemas"]["PaidNotVerifiedSection"];
            peer: components["schemas"]["PeerSection"];
            psp_code_coverage: components["schemas"]["PspCodeCoverage"];
            /** Psp Codes */
            psp_codes: components["schemas"]["PspCodeRow"][];
            repeat: components["schemas"]["RepeatSection"];
            retry: components["schemas"]["RetrySection"];
            revenue_decomposition: components["schemas"]["RevenueDecomposition"];
            /** Trend */
            trend: components["schemas"]["TrendPoint"][];
        };
        /** DecompositionEvidenceIds */
        DecompositionEvidenceIds: {
            /** Conversion Rate */
            conversion_rate: string;
            /** Sessions */
            sessions: string;
            /** Verified Aov */
            verified_aov: string;
            /** Verified Revenue */
            verified_revenue: string;
        };
        /** DecompositionPeriod */
        DecompositionPeriod: {
            /** Conversion Rate */
            conversion_rate: number | null;
            /** Sessions */
            sessions: number;
            /** Verified Aov */
            verified_aov: number | null;
            /** Verified Revenue */
            verified_revenue: number;
        };
        /** EvidenceDateRange */
        EvidenceDateRange: {
            /** End */
            end: string;
            /** Start */
            start: string;
        };
        /** EvidenceFilters */
        EvidenceFilters: {
            /** Created At From */
            created_at_from: string;
            /** Created At To */
            created_at_to: string;
            /** Merchant Key */
            merchant_key: string;
            /** Metric Rules */
            metric_rules: string[];
        };
        /** EvidenceRecordsResponse */
        EvidenceRecordsResponse: {
            /** Columns */
            columns: string[];
            /**
             * Grain
             * @enum {string}
             */
            grain: "session" | "attempt" | "customer_within_merchant";
            /** Insight Id */
            insight_id: string;
            /** Items */
            items: (components["schemas"]["SessionEvidenceRecord"] | components["schemas"]["AttemptEvidenceRecord"])[];
            /** Limitations */
            limitations: string[];
            /** Merchant Key */
            merchant_key: string;
            /** Page */
            page: number;
            /** Page Size */
            page_size: number;
            /** Total */
            total: number;
        };
        /** EvidenceReproduction */
        EvidenceReproduction: {
            /** Git Revision */
            git_revision?: string | null;
            /**
             * Method
             * @enum {string}
             */
            method: "query_registry" | "materialized_aggregate" | "analytical_function";
            /** Parameters Hash */
            parameters_hash: string;
            /** Reference */
            reference: string;
        };
        /** EvidenceResponse */
        EvidenceResponse: {
            evidence: components["schemas"]["InsightEvidence"];
        };
        /** HealthResponse */
        HealthResponse: {
            /** Auth Configured */
            auth_configured: boolean;
            /** Build Id */
            build_id?: string | null;
            /** Checksum Status */
            checksum_status?: string | null;
            /** Database Ready */
            database_ready: boolean;
            /** Source Kind */
            source_kind?: string | null;
            /** Source Sha256 */
            source_sha256?: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "ok" | "degraded";
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** InsightEvidence */
        InsightEvidence: {
            calculation_inputs: components["schemas"]["CalculationInputs"];
            /** Calculation Version */
            calculation_version: string;
            comparison: components["schemas"]["Comparison"];
            date_range: components["schemas"]["EvidenceDateRange"];
            /** Exclusions */
            exclusions: string[];
            filters: components["schemas"]["EvidenceFilters"];
            /** Formula */
            formula: string;
            /** Generated At */
            generated_at: string;
            /**
             * Grain
             * @enum {string}
             */
            grain: "attempt" | "session" | "customer_within_merchant" | "terminal" | "merchant" | "category" | "time_period";
            /** Insight Id */
            insight_id: string;
            /**
             * Insight Type
             * @enum {string}
             */
            insight_type: "descriptive" | "diagnostic" | "inferential" | "predictive" | "recommendation" | "alert";
            /** Limitations */
            limitations: string[];
            /** Metric Id */
            metric_id: string;
            /** Minimum Sample Rule */
            minimum_sample_rule: string;
            /** Model Evidence */
            model_evidence?: {
                [key: string]: unknown;
            } | null;
            /** Null Policy */
            null_policy: string;
            /** Population */
            population: string;
            recommendation?: components["schemas"]["Recommendation"] | null;
            reproduction: components["schemas"]["EvidenceReproduction"];
            /** Sample Size */
            sample_size: number;
            /**
             * Schema Version
             * @constant
             */
            schema_version: "1.0";
            /** Source Columns */
            source_columns: string[];
            /** Statement */
            statement: string;
            /**
             * Timezone
             * @constant
             */
            timezone: "Asia/Tehran";
            /** Title */
            title: string;
            /** Unit */
            unit: string;
            /** Value */
            value: number | string | null;
            /** Weighting */
            weighting: string;
        };
        /** LatencySection */
        LatencySection: {
            /** Definition */
            definition: string;
            /** Evidence Id */
            evidence_id: string;
            /** Init Median Ms */
            init_median_ms: number | null;
            /** Init P90 Ms */
            init_p90_ms: number | null;
            /** Init P95 Ms */
            init_p95_ms: number | null;
            /** Init Sample Size */
            init_sample_size: number;
            /** Psp Sample Size */
            psp_sample_size: number;
            /** Switch Code Sample Size */
            switch_code_sample_size: number;
            /** Verify Evidence Id */
            verify_evidence_id: string;
            /** Verify Median Ms */
            verify_median_ms: number | null;
            /** Verify P90 Ms */
            verify_p90_ms: number | null;
            /** Verify P95 Ms */
            verify_p95_ms: number | null;
            /** Verify Sample Size */
            verify_sample_size: number;
        };
        /** LifecycleSection */
        LifecycleSection: {
            /** Evidence Id */
            evidence_id: string;
            /**
             * Grain
             * @constant
             */
            grain: "session";
            /** Stages */
            stages: components["schemas"]["LifecycleStage"][];
        };
        /** LifecycleStage */
        LifecycleStage: {
            /** Count */
            count: number;
            /** Dropoff From Previous */
            dropoff_from_previous: number | null;
            /**
             * Stage
             * @enum {string}
             */
            stage: "Created" | "Attempted" | "InBank" | "Paid" | "Verified";
        };
        /** MerchantItem */
        MerchantItem: {
            /** Category Id */
            category_id: number;
            /** Category Title */
            category_title: string;
            /**
             * Data End
             * Format: date
             */
            data_end: string;
            /**
             * Data Start
             * Format: date
             */
            data_start: string;
            /**
             * Is Featured Demo
             * @default false
             */
            is_featured_demo: boolean;
            /** Merchant Key */
            merchant_key: string;
            /** Session Count */
            session_count: number;
            /** Terminal Count */
            terminal_count: number;
            /** Verified Revenue */
            verified_revenue: number;
            /** Verified Session Count */
            verified_session_count: number;
            /** Verified Session Rate */
            verified_session_rate: number;
        };
        /** MerchantListResponse */
        MerchantListResponse: {
            /** Adjusted Fee Notice */
            adjusted_fee_notice: string;
            /** Items */
            items: components["schemas"]["MerchantItem"][];
            /** Total */
            total: number;
        };
        /** MetricRegistryItem */
        MetricRegistryItem: {
            /** Business Question */
            business_question: string;
            /** Currency */
            currency: string | null;
            /** Decision */
            decision: string;
            /** Denominator */
            denominator: string | null;
            /** Description Fa */
            description_fa: string;
            /** Exclusions */
            exclusions: string[];
            /** Filters */
            filters: string[];
            /** Formula */
            formula: string;
            /**
             * Grain
             * @enum {string}
             */
            grain: "attempt" | "session" | "customer_within_merchant" | "terminal" | "merchant" | "category" | "time_period";
            /** Metric Id */
            metric_id: string;
            /** Minimum Sample Rule */
            minimum_sample_rule: string;
            /** Name Fa */
            name_fa: string;
            /** Null Policy */
            null_policy: string;
            /** Numerator */
            numerator: string;
            /** Owner */
            owner: string;
            rag_thresholds: components["schemas"]["RagThresholds"];
            /** Source Columns */
            source_columns: string[];
            /** Tests */
            tests: string[];
            /** Unit */
            unit: string;
            /** Version */
            version: string;
            /** Weighting */
            weighting: string;
        };
        /** OpportunitySection */
        OpportunitySection: {
            /** Evidence Id */
            evidence_id: string;
            /** Formula */
            formula: string;
            /**
             * Is Forecast
             * @constant
             */
            is_forecast: false;
            /** Unit */
            unit: string;
            /** Value */
            value: number | null;
        };
        /** PaidNotVerifiedSection */
        PaidNotVerifiedSection: {
            /** Evidence Id */
            evidence_id: string;
            /** Rate */
            rate: number | null;
            /** Sessions */
            sessions: number;
        };
        /** PeerSection */
        PeerSection: {
            /** Definition */
            definition: string;
            /** Eligible */
            eligible: boolean;
            /** Gap Percentage Points */
            gap_percentage_points: number | null;
            /** Median Rate */
            median_rate: number | null;
            /** Merchant Rate */
            merchant_rate: number | null;
            /** Minimum Sample Rule */
            minimum_sample_rule: string;
            /** P25 Rate */
            p25_rate: number | null;
            /** P75 Rate */
            p75_rate: number | null;
            /** Peer Count */
            peer_count: number;
        };
        /** PspCodeCoverage */
        PspCodeCoverage: {
            /** Coded Attempts */
            coded_attempts: number;
            /** Coverage Rate */
            coverage_rate: number | null;
            /** Eligible Psp Attempts */
            eligible_psp_attempts: number;
            /** Evidence Id */
            evidence_id: string;
            /** Missing Code Attempts */
            missing_code_attempts: number;
        };
        /** PspCodeRow */
        PspCodeRow: {
            /** Associated Verified Attempts */
            associated_verified_attempts: number;
            /** Attempt Count */
            attempt_count: number;
            /** Evidence Id */
            evidence_id: string;
            /** Psp Code */
            psp_code: string;
            /** Switch Response Code */
            switch_response_code: string;
        };
        /** RagThresholds */
        RagThresholds: {
            /** Critical */
            critical: string | number | null;
            /** Warning */
            warning: string | number | null;
        };
        /** Recommendation */
        Recommendation: {
            /** Action */
            action: string;
            /**
             * Confidence
             * @enum {string}
             */
            confidence: "exploratory" | "supported" | "strong";
            /** Expected Mechanism */
            expected_mechanism: string;
            /** Measurement Plan */
            measurement_plan: string;
            /**
             * Priority
             * @enum {string}
             */
            priority: "low" | "medium" | "high";
            /** Trigger */
            trigger: string;
        };
        /** RepeatSection */
        RepeatSection: {
            /** Evidence Id */
            evidence_id: string;
            /** Observed Cards */
            observed_cards: number;
            /** Observed Repeat Rate */
            observed_repeat_rate: number | null;
            /** Repeat Cards */
            repeat_cards: number;
            /** Scope */
            scope: string;
        };
        /** RetrySection */
        RetrySection: {
            /** Evidence Id */
            evidence_id: string;
            /** Rescued Evidence Id */
            rescued_evidence_id: string;
            /** Rescued Sessions */
            rescued_sessions: number;
            /** Retry Rate */
            retry_rate: number | null;
            /** Retry Sessions */
            retry_sessions: number;
        };
        /** RevenueDecomposition */
        RevenueDecomposition: {
            current: components["schemas"]["DecompositionPeriod"];
            evidence_ids: components["schemas"]["DecompositionEvidenceIds"];
            /** Note */
            note: string;
            previous: components["schemas"]["DecompositionPeriod"];
        };
        /** SessionEvidenceRecord */
        SessionEvidenceRecord: {
            /** Amount */
            amount: number;
            /** Attempt Count */
            attempt_count: number;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Final Try Status */
            final_try_status: string | null;
            /** Payer Card Key */
            payer_card_key: string | null;
            /** Psp Path */
            psp_path: string | null;
            /** Session Key */
            session_key: string;
            /** Session Status */
            session_status: string;
        };
        /** TrendPoint */
        TrendPoint: {
            /**
             * Date
             * Format: date
             */
            date: string;
            /** Sessions */
            sessions: number;
            /** Verified Revenue */
            verified_revenue: number;
            /** Verified Sessions */
            verified_sessions: number;
        };
        /** ValidationError */
        ValidationError: {
            /** Context */
            ctx?: Record<string, never>;
            /** Input */
            input?: unknown;
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    dashboard_api_v1_dashboard_get: {
        parameters: {
            query: {
                from?: string | null;
                merchant_key: string;
                to?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evidence_api_v1_insights__insight_id__evidence_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                insight_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EvidenceResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    records_api_v1_insights__insight_id__records_get: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
            };
            header?: never;
            path: {
                insight_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EvidenceRecordsResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    merchants_api_v1_merchants_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MerchantListResponse"];
                };
            };
        };
    };
    health_healthz_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthResponse"];
                };
            };
        };
    };
}
