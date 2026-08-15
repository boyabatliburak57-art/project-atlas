# KAP Classification

`kap-classification-v1` maps structured provider categories to the canonical TASK-110C taxonomy. When structured metadata is absent, a versioned deterministic Turkish title rule may classify the record; otherwise it becomes `OTHER`. Confidence is `SOURCE_STRUCTURED`, `DETERMINISTIC_RULE`, or `FALLBACK`. No LLM output is authoritative and unknown structured values remain null.
