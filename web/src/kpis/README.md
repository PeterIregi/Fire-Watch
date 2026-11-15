# KPI Cards & Historical Statistics Specification (Domain D)

This document specifies the calculations, edge case handlings, and architectural decisions for the headline KPI figures (`web/src/kpis/`).

## 1. Decision on "Current Month" vs. Wall-Clock vs. Date Range

**Design Decision:**
1. **Target Month Definition:**
   - In static satellite archives like FIRMS, monthly data is finalized retrospectively.
   - The "Current Month" card displays the **latest available month with valid observations within the user's active filter range**.
   - The card explicitly displays the target month label (e.g., `December 2024` or `August 2021 (Filter End)`), ensuring complete transparency regardless of wall-clock time or date filtering.
2. **Full History Baseline (Invariance):**
   - The historical comparison baseline is computed against the **full historical series** for the selected area across all other years.
   - Changing the visible display range on the map or calendar does **not** truncate the baseline sample. This prevents artificial swings in the historical median.

## 2. Statistical Definitions

- **Historical Median:**
  For target month $m \in \{1..12\}$ in year $y$:
  $$\text{Baseline} = \{ \text{value}(m, y') \mid y' \in \text{FullHistory}, y' \neq y, \text{value} \neq \text{null} \}$$
  $$\text{Median} = \text{median}(\text{Baseline})$$
- **Departure from Median:**
  $$\Delta = \text{value}(m, y) - \text{Median}$$
  $$\% \text{ Departure} = \begin{cases}
  \frac{\Delta}{\text{Median}} \times 100\% & \text{if } \text{Median} > 0 \\
  \text{"Match zero baseline"} & \text{if } \text{Median} = 0 \text{ and } \text{value} = 0 \\
  \text{"+" } \Delta \text{ " above zero baseline"} & \text{if } \text{Median} = 0 \text{ and } \text{value} > 0
  \end{cases}$$
- **Busiest Month:**
  The $(month, year)$ pair having $\max(\text{value})$ within the active selection.
- **Busiest Year:**
  The calendar year having $\max(\sum_{m \in \text{Year}} \text{value})$ within the active selection. If fewer than 12 months are selected for that year, it is flagged as `(partial year)`.
